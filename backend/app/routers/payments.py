"""
Payments — Razorpay booking-fee flow for appointments, with an audit trail.

Pay-first model (no orphan unpaid bookings):
  1. POST /payments/appointment/order   → server prices the booking + creates a
       Razorpay order AND an AppointmentPayment row (status 'created') holding the
       booking intent. If the fee is 0 or payments are disabled, it returns
       payment_required=false and the caller books directly.
  2. (browser opens Razorpay Checkout with the returned order_id)
  3. POST /payments/appointment/confirm → server verifies the payment signature,
       records the payment id, then creates the appointment + token (idempotent).
  4. POST /payments/webhook (optional)  → server-to-server safety net: if the
       browser confirm never lands, Razorpay's webhook still completes the booking.

The key_secret never leaves the server; every transaction is recorded with its
order id, payment id, amount and resulting appointment.
"""
import json
from datetime import datetime
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import require_permission
from ..models import Appointment, AppointmentPayment, Doctor, Hospital, Patient, User
from ..schemas.appointment import AppointmentCreate, AppointmentOut
from ..services import razorpay_client as rzp
from .appointments import create_booking

router = APIRouter(prefix="/payments", tags=["payments"])


class PaymentRow(BaseModel):
    appointment_id: Optional[int] = None
    date: Optional[datetime] = None
    description: str
    amount: float
    method: str
    status: str
    kind: str                      # 'booking' | 'consultation'


class PaymentHistory(BaseModel):
    total_spent: float
    this_month: float
    transactions: int
    rows: list[PaymentRow]


class OrderRequest(BaseModel):
    booking: AppointmentCreate


class OrderResponse(BaseModel):
    payment_required: bool
    fee: float
    order_id: str | None = None
    amount: int | None = None       # in paise
    currency: str = "INR"
    key_id: str | None = None


class ConfirmRequest(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str
    booking: AppointmentCreate


def _complete_booking(db: Session, me: User, pay: AppointmentPayment) -> "AppointmentOut":
    """Create the appointment+token for a paid order, idempotently. If this order
    was already booked, return the existing appointment instead of double-booking."""
    from ..models import Appointment  # local import avoids a cycle at module load
    if pay.status == "booked" and pay.appointment_id:
        return db.get(Appointment, pay.appointment_id)
    booking = AppointmentCreate(**json.loads(pay.booking_json))
    appt = create_booking(db, me, booking, booking_fee_paid=float(pay.amount or 0))
    pay.appointment_id = appt.appointment_id
    pay.status = "booked"
    db.add(pay)
    db.commit()
    return appt


@router.get("/config")
def payment_config():
    """Lets the frontend know whether to show a payment step, the public key, and
    the flat online booking fee (consultation is paid at the clinic, not here)."""
    return {
        "enabled": rzp.is_configured(),
        "key_id": settings.razorpay_key_id or None,
        "booking_fee": settings.booking_fee,
    }


@router.get("/my", response_model=PaymentHistory)
def my_payment_history(
    me: User = Depends(require_permission("payment", "read")),
    db: Session = Depends(get_db),
):
    """The logged-in patient's payment history — online booking fees (Razorpay)
    plus consultation fees collected at the clinic — newest first, with totals."""
    my_ids = [p.patient_id for p in db.scalars(select(Patient).where(Patient.user_id == me.user_id))]
    rows: list[PaymentRow] = []
    if my_ids:
        # Names for descriptions.
        doctors = {d.doctor_id: d for d in db.scalars(select(Doctor))}
        hospitals = {h.hospital_id: h.name for h in db.scalars(select(Hospital))}

        # 1) Consultation fees collected at the clinic.
        consults = db.scalars(
            select(Appointment).where(
                Appointment.patient_id.in_(my_ids), Appointment.consultation_paid.is_(True)
            )
        ).all()
        for a in consults:
            doc = doctors.get(a.doctor_id)
            rows.append(PaymentRow(
                appointment_id=a.appointment_id,
                date=a.consultation_paid_at or a.created_at,
                description=f"Consultation – {doc.name if doc else 'Doctor'}",
                amount=float(a.consultation_fee or 0),
                method=(a.consultation_payment_method or "cash").upper(),
                status="Paid at Clinic",
                kind="consultation",
            ))

        # 2) Online booking fees (Razorpay) that resulted in / are tied to a booking.
        pays = db.scalars(
            select(AppointmentPayment).where(
                AppointmentPayment.patient_id.in_(my_ids),
                AppointmentPayment.status.in_(("paid", "booked")),
            )
        ).all()
        for pay in pays:
            hosp = None
            if pay.appointment_id:
                a = db.get(Appointment, pay.appointment_id)
                hosp = hospitals.get(a.hospital_id) if a else None
            rows.append(PaymentRow(
                appointment_id=pay.appointment_id,
                date=pay.created_at,
                description=f"Booking Fee{f' – {hosp}' if hosp else ''}",
                amount=float(pay.amount or 0),
                method="Online",
                status="Paid Online",
                kind="booking",
            ))

    rows.sort(key=lambda r: r.date.timestamp() if r.date else 0.0, reverse=True)
    now = datetime.utcnow()
    total = sum(r.amount for r in rows)
    this_month = sum(r.amount for r in rows if r.date and r.date.year == now.year and r.date.month == now.month)
    return PaymentHistory(total_spent=total, this_month=this_month, transactions=len(rows), rows=rows)


@router.post("/appointment/order", response_model=OrderResponse)
def create_appointment_order(
    body: OrderRequest,
    me: User = Depends(require_permission("appointment", "create")),
    db: Session = Depends(get_db),
):
    # Online charge is the flat booking fee — NOT the consultation fee (that's
    # collected at the clinic). 0 or no keys → no payment step; book directly.
    fee = float(settings.booking_fee or 0)
    if fee <= 0 or not rzp.is_configured():
        return OrderResponse(payment_required=False, fee=fee)
    try:
        order = rzp.create_order(
            int(round(fee * 100)),
            receipt=f"appt-{me.user_id}-{body.booking.doctor_id}",
            notes={"doctor_id": str(body.booking.doctor_id), "patient_id": str(body.booking.patient_id), "kind": "booking_fee"},
        )
    except httpx.HTTPError as e:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Could not create payment order: {e}")
    # Record the order + booking intent so it can be reconciled / webhook-recovered.
    db.add(AppointmentPayment(
        razorpay_order_id=order["id"], patient_id=body.booking.patient_id,
        amount=fee, currency=order["currency"], status="created",
        booking_json=body.booking.model_dump_json(),
    ))
    db.commit()
    return OrderResponse(
        payment_required=True, fee=fee, order_id=order["id"],
        amount=order["amount"], currency=order["currency"], key_id=settings.razorpay_key_id,
    )


@router.post("/appointment/confirm", response_model=AppointmentOut)
def confirm_appointment_payment(
    body: ConfirmRequest,
    me: User = Depends(require_permission("appointment", "create")),
    db: Session = Depends(get_db),
):
    if not rzp.verify_signature(body.razorpay_order_id, body.razorpay_payment_id, body.razorpay_signature):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Payment verification failed — booking not created")
    pay = db.scalar(select(AppointmentPayment).where(AppointmentPayment.razorpay_order_id == body.razorpay_order_id))
    if not pay:
        # No order row (e.g. created before this feature) — fall back to the request body.
        pay = AppointmentPayment(
            razorpay_order_id=body.razorpay_order_id, patient_id=body.booking.patient_id,
            amount=float(settings.booking_fee or 0), status="created",
            booking_json=body.booking.model_dump_json(),
        )
        db.add(pay)
        db.flush()
    pay.razorpay_payment_id = body.razorpay_payment_id
    if pay.status == "created":
        pay.status = "paid"
    db.add(pay)
    db.flush()
    return _complete_booking(db, me, pay)


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    """Server-to-server safety net. Configure this URL + a webhook secret in the
    Razorpay dashboard. On payment.captured we record the payment and, if the
    browser confirm never completed the booking, finish it here."""
    raw = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    if not rzp.verify_webhook(raw, signature):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid webhook signature")
    event = json.loads(raw or b"{}")
    if event.get("event") not in ("payment.captured", "order.paid"):
        return {"ignored": event.get("event")}
    entity = (event.get("payload", {}).get("payment", {}) or {}).get("entity", {})
    order_id = entity.get("order_id")
    payment_id = entity.get("id")
    if not order_id:
        return {"ignored": "no order_id"}
    pay = db.scalar(select(AppointmentPayment).where(AppointmentPayment.razorpay_order_id == order_id))
    if not pay:
        return {"ignored": "unknown order"}
    if payment_id:
        pay.razorpay_payment_id = payment_id
    if pay.status == "created":
        pay.status = "paid"
    db.add(pay)
    db.commit()
    if pay.status == "booked":
        return {"ok": True, "already_booked": True}
    # Recover the booking using the patient's own user as the actor.
    patient = db.get(Patient, pay.patient_id) if pay.patient_id else None
    me = db.get(User, patient.user_id) if (patient and patient.user_id) else None
    if not me:
        return {"ok": True, "note": "paid but no user to book under; needs manual booking"}
    try:
        appt = _complete_booking(db, me, pay)
        return {"ok": True, "booked_appointment_id": appt.appointment_id}
    except Exception as e:  # noqa: BLE001 — webhook must always 200 so Razorpay won't spam retries
        return {"ok": True, "note": f"payment recorded; booking deferred: {type(e).__name__}"}
