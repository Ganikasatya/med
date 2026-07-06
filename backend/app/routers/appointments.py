"""
Module 6 — Appointment endpoints (15 APIs).

Booking is schedule-aware (validates the doctor consults that day and the slot
is free); reschedule/cancel keep full audit history. The actual queue *token* is
minted by the Token Engine (Phase 4) — here an appointment is the reservation.
"""
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db, utcnow
from ..deps import ensure_same_tenant, get_current_user, require_permission
from ..rbac import ROLE_PATIENT, is_clinic_staff
from ..models import (
    Appointment, ApptCancellationLog, ApptRescheduleHistory, ApptStatusHistory,
    Doctor, DoctorAffiliation, FamilyMember, Patient, User,
)
from ..schemas.appointment import (
    AppointmentCreate, AppointmentOut, AppointmentUpdate, CancellationOut,
    CancelRequest, CollectPaymentRequest, FeedbackRequest, RescheduleHistoryOut,
    RescheduleRequest, StatusHistoryOut, WalkInRequest,
)
from ..services import audit
from ..services import normalize
from ..services import scheduling as sch
from ..services import token_engine as te
from ..services import uhid as uhid_service

router = APIRouter(prefix="/appointments", tags=["appointments"])


# ---- helpers ----
def _attach_family_names(db: Session, appts: list[Appointment]) -> list[Appointment]:
    """Tag each appointment with the dependent's name when it was booked for one,
    so lists can show 'for <member>' instead of just the account holder."""
    ids = {a.family_member_id for a in appts if a.family_member_id}
    if not ids:
        return appts
    members = {m.member_id: m.name for m in db.scalars(select(FamilyMember).where(FamilyMember.member_id.in_(ids)))}
    for a in appts:
        if a.family_member_id:
            a.family_member_name = members.get(a.family_member_id)
    return appts


def _appt(db: Session, appointment_id: int) -> Appointment:
    a = db.get(Appointment, appointment_id)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Appointment not found")
    return a


def _assert_access(me: User, appt: Appointment) -> None:
    if me.role and me.role.name == "PATIENT":
        if not appt.patient or appt.patient.user_id != me.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your appointment")
    else:
        ensure_same_tenant(me, appt.hospital_id)


def _set_status(db: Session, appt: Appointment, new_status: str, by: int | None, reason: str = "") -> None:
    db.add(ApptStatusHistory(
        appointment_id=appt.appointment_id, old_status=appt.status,
        new_status=new_status, changed_by=by, reason=reason,
    ))
    appt.status = new_status


def _require_doctor(db: Session, doctor_id: int) -> Doctor:
    d = db.get(Doctor, doctor_id)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")
    return d


def _hide_personal(stmt, me: User):
    """For hospital front-desk roles, drop a doctor's *personal* practice rows so
    the clinic console only ever sees its own (hospital-managed) appointments.
    Appointments with no affiliation are legacy clinic bookings → kept."""
    if not is_clinic_staff(me.role.name if me.role else None):
        return stmt
    return stmt.outerjoin(
        DoctorAffiliation, Appointment.affiliation_id == DoctorAffiliation.affiliation_id
    ).where(
        or_(
            Appointment.affiliation_id.is_(None),
            DoctorAffiliation.managed_by_hospital.is_(True),
        )
    )


def _default_affiliation(db: Session, doctor: Doctor) -> DoctorAffiliation:
    aff = db.scalar(
        select(DoctorAffiliation).where(
            DoctorAffiliation.doctor_id == doctor.doctor_id,
            DoctorAffiliation.hospital_id == doctor.hospital_id,
            DoctorAffiliation.practice_type == "clinic",
        )
    )
    if aff:
        return aff
    aff = DoctorAffiliation(
        doctor_id=doctor.doctor_id,
        hospital_id=doctor.hospital_id,
        practice_type="clinic",
        name="Clinic",
        consultation_fee=doctor.consultation_fee,
        mode="slot",
        managed_by_hospital=True,
    )
    db.add(aff)
    db.flush()
    return aff


def _resolve_affiliation(db: Session, doctor: Doctor, affiliation_id: int | None) -> DoctorAffiliation:
    if affiliation_id is None:
        return _default_affiliation(db, doctor)
    aff = db.get(DoctorAffiliation, affiliation_id)
    if not aff or aff.doctor_id != doctor.doctor_id or not aff.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor practice location not found")
    return aff


# ===================================================== Collection ===========
@router.get("", response_model=list[AppointmentOut])
def list_appointments(
    hospital_id: int | None = Query(None),
    doctor_id: int | None = Query(None),
    patient_id: int | None = Query(None),
    appointment_date: str | None = Query(None, alias="date"),
    status_filter: str | None = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    me: User = Depends(require_permission("appointment", "read")),
    db: Session = Depends(get_db),
):
    stmt = select(Appointment)
    if me.role and me.role.name == "SUPER_ADMIN":
        if hospital_id:
            stmt = stmt.where(Appointment.hospital_id == hospital_id)
    else:
        stmt = stmt.where(Appointment.hospital_id == me.hospital_id)
    if doctor_id:
        stmt = stmt.where(Appointment.doctor_id == doctor_id)
    if patient_id:
        stmt = stmt.where(Appointment.patient_id == patient_id)
    if appointment_date:
        stmt = stmt.where(Appointment.appointment_date == appointment_date)
    if status_filter:
        stmt = stmt.where(Appointment.status == status_filter)
    stmt = _hide_personal(stmt, me)
    appts = db.scalars(stmt.order_by(Appointment.appointment_date.desc(), Appointment.appointment_id.desc()).offset((page - 1) * size).limit(size)).all()
    return _attach_family_names(db, list(appts))


def quote_fee(db: Session, body: AppointmentCreate) -> float:
    """The booking fee for a prospective appointment (affiliation fee, else the
    doctor's). Used by the payment flow to know how much to charge."""
    doctor = _require_doctor(db, body.doctor_id)
    aff = _resolve_affiliation(db, doctor, body.affiliation_id)
    return float(aff.consultation_fee or doctor.consultation_fee or 0)


def create_booking(db: Session, me: User, body: AppointmentCreate, booking_fee_paid: float = 0) -> Appointment:
    """Validate + create an appointment and mint its queue token. Shared by the
    direct booking endpoint and the post-payment confirmation. Commits."""
    doctor = _require_doctor(db, body.doctor_id)
    aff = _resolve_affiliation(db, doctor, body.affiliation_id)
    patient = db.get(Patient, body.patient_id)
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    is_patient = bool(me.role and me.role.name == ROLE_PATIENT)
    if is_patient:
        # Global patient: may book at ANY active clinic. The appointment takes
        # the doctor's hospital, so no same-tenant / same-hospital constraint —
        # only that they're booking for their own profile.
        if patient.user_id != me.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Can only book for your own profile")
    else:
        ensure_same_tenant(me, aff.hospital_id)
        if is_clinic_staff(me.role.name if me.role else None) and not aff.managed_by_hospital:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Clinic staff cannot book on a doctor's personal practice")
        # NOTE: no patient-vs-doctor hospital check. Patients are "global" — one
        # anchored to clinic A may be booked with a doctor at clinic B; the
        # appointment takes the doctor's hospital and the patient then shows up
        # in clinic B's list (see patients._at_hospital). Staff are still confined
        # to the doctor's hospital by ensure_same_tenant above.

    avail = sch.available_slots(db, doctor, body.appointment_date, aff.affiliation_id)
    if not avail["available"]:
        raise HTTPException(status.HTTP_409_CONFLICT, avail["reason"] or "No slots available")
    if body.slot_time is not None:
        if sch.schedule_for_slot(doctor, body.appointment_date, body.slot_time, aff.affiliation_id) is None:
            raise HTTPException(status.HTTP_409_CONFLICT, "Requested slot is outside the doctor's sessions")
        if body.slot_time in sch.booked_times(db, doctor.doctor_id, body.appointment_date, aff.affiliation_id):
            raise HTTPException(status.HTTP_409_CONFLICT, "Slot already booked")

    appt = Appointment(
        hospital_id=aff.hospital_id or doctor.hospital_id, doctor_id=doctor.doctor_id, affiliation_id=aff.affiliation_id, patient_id=patient.patient_id,
        family_member_id=body.family_member_id, appointment_date=body.appointment_date,
        slot_time=body.slot_time, appointment_type=body.appointment_type, status="scheduled",
        consultation_fee=aff.consultation_fee or doctor.consultation_fee, booking_fee_paid=booking_fee_paid,
        # Voice bookings carry the spoken complaint as the note, in the patient's
        # own script (Telugu/Hindi). Translate it to English so clinic staff and
        # the doctor can read it; a no-op when the note is already Latin/English.
        notes=normalize.to_english_text(body.notes), source=body.source, booked_by=me.user_id,
        origin_lat=body.origin_lat, origin_lng=body.origin_lng,
        origin_label=body.origin_label, travel_minutes=body.travel_minutes,
    )
    db.add(appt)
    db.flush()
    _set_status(db, appt, "scheduled", me.user_id, "Booked")
    # Allocate the queue token immediately so the patient sees it (and their
    # estimated start / leave-by) on the dashboard without waiting on the clinic.
    te.allocate_token(db, appt, me.user_id)
    audit.log_activity(db, me.user_id, "appointment.book", "appointment", {"appointment_id": appt.appointment_id})
    db.commit()
    db.refresh(appt)
    return appt


@router.post("", response_model=AppointmentOut, status_code=201)
def book(body: AppointmentCreate, me: User = Depends(require_permission("appointment", "create")), db: Session = Depends(get_db)):
    return create_booking(db, me, body)


# ===================================================== Static paths =========
@router.get("/available-slots")
def available_slots(doctor_id: int = Query(...), date: str = Query(..., description="YYYY-MM-DD"),
                    affiliation_id: int | None = Query(None),
                    me: User = Depends(require_permission("appointment", "read")), db: Session = Depends(get_db)):
    doctor = _require_doctor(db, doctor_id)
    aff = _resolve_affiliation(db, doctor, affiliation_id)
    if not (me.role and me.role.name == ROLE_PATIENT):
        ensure_same_tenant(me, aff.hospital_id)
    try:
        on_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid date (YYYY-MM-DD)")
    res = sch.available_slots(db, doctor, on_date, aff.affiliation_id)
    return {"doctor_id": doctor_id, "affiliation_id": aff.affiliation_id, "date": date, **res, "slot_count": len(res["slots"])}


@router.get("/today", response_model=list[AppointmentOut])
def today_for_doctor(doctor_id: int = Query(...), me: User = Depends(require_permission("appointment", "read")), db: Session = Depends(get_db)):
    doctor = _require_doctor(db, doctor_id)
    ensure_same_tenant(me, doctor.hospital_id)
    stmt = _hide_personal(
        select(Appointment).where(
            Appointment.doctor_id == doctor_id, Appointment.appointment_date == date.today()
        ),
        me,
    )
    return _attach_family_names(db, list(db.scalars(stmt.order_by(Appointment.slot_time)).all()))


@router.get("/upcoming", response_model=list[AppointmentOut])
def upcoming_for_patient(patient_id: int = Query(...), days_ahead: int = Query(30, ge=1, le=365),
                         me: User = Depends(require_permission("appointment", "read")), db: Session = Depends(get_db)):
    patient = db.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    if me.role and me.role.name == "PATIENT" and patient.user_id != me.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your profile")
    elif not (me.role and me.role.name == "PATIENT"):
        ensure_same_tenant(me, patient.hospital_id)
    horizon = date.today() + timedelta(days=days_ahead)
    appts = db.scalars(
        select(Appointment).where(
            Appointment.patient_id == patient_id,
            Appointment.appointment_date >= date.today(),
            Appointment.appointment_date <= horizon,
            Appointment.status.in_(("scheduled", "confirmed", "in_progress")),
        ).order_by(Appointment.appointment_date)
    ).all()
    return _attach_family_names(db, list(appts))


@router.get("/cancellations", response_model=list[CancellationOut])
def cancellation_report(hospital_id: int | None = Query(None), me: User = Depends(require_permission("appointment", "read")), db: Session = Depends(get_db)):
    stmt = select(ApptCancellationLog).join(Appointment, Appointment.appointment_id == ApptCancellationLog.appointment_id)
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        stmt = stmt.where(Appointment.hospital_id == me.hospital_id)
    elif hospital_id:
        stmt = stmt.where(Appointment.hospital_id == hospital_id)
    stmt = _hide_personal(stmt, me)
    return db.scalars(stmt.order_by(ApptCancellationLog.log_id.desc())).all()


@router.post("/reschedule", response_model=AppointmentOut)
def reschedule(body: RescheduleRequest, me: User = Depends(require_permission("appointment", "update")), db: Session = Depends(get_db)):
    appt = _appt(db, body.appointment_id)
    _assert_access(me, appt)
    doctor = db.get(Doctor, appt.doctor_id)
    avail = sch.available_slots(db, doctor, body.new_date, appt.affiliation_id)
    if not avail["available"]:
        raise HTTPException(status.HTTP_409_CONFLICT, avail["reason"] or "No slots on the new date")
    if body.new_time in sch.booked_times(db, doctor.doctor_id, body.new_date, appt.affiliation_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Slot already booked")
    db.add(ApptRescheduleHistory(
        appointment_id=appt.appointment_id, old_date=appt.appointment_date, old_time=appt.slot_time,
        new_date=body.new_date, new_time=body.new_time, rescheduled_by=me.user_id, reason=body.reason,
    ))
    appt.appointment_date = body.new_date
    appt.slot_time = body.new_time
    _set_status(db, appt, "scheduled", me.user_id, "Rescheduled")
    db.commit()
    db.refresh(appt)
    return appt


@router.post("/cancel", response_model=AppointmentOut)
def cancel(body: CancelRequest, me: User = Depends(require_permission("appointment", "update")), db: Session = Depends(get_db)):
    return _do_cancel(db, me, body.appointment_id, body.reason)


@router.post("/{appointment_id}/collect-payment", response_model=AppointmentOut)
def collect_consultation_payment(
    appointment_id: int,
    body: CollectPaymentRequest,
    me: User = Depends(require_permission("appointment", "update")),
    db: Session = Depends(get_db),
):
    """Record the in-person consultation fee as paid (reception or doctor). This
    is what unlocks the patient to be called as the next token."""
    appt = _appt(db, appointment_id)
    ensure_same_tenant(me, appt.hospital_id)
    appt.consultation_paid = True
    appt.consultation_payment_method = body.method
    appt.consultation_paid_at = utcnow()
    appt.consultation_paid_by = me.user_id
    audit.log_activity(db, me.user_id, "appointment.collect_payment", "appointment", {"appointment_id": appointment_id, "method": body.method})
    db.commit()
    db.refresh(appt)
    return appt


@router.post("/walk-in", response_model=AppointmentOut, status_code=201)
def walk_in(body: WalkInRequest, me: User = Depends(require_permission("appointment", "create")), db: Session = Depends(get_db)):
    doctor = _require_doctor(db, body.doctor_id)
    aff = _resolve_affiliation(db, doctor, body.affiliation_id)
    ensure_same_tenant(me, aff.hospital_id)
    if is_clinic_staff(me.role.name if me.role else None) and not aff.managed_by_hospital:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Clinic staff cannot register walk-ins on a doctor's personal practice")
    # Doctor must actually be consulting today — block walk-ins when they're on
    # holiday/leave or don't consult on this weekday. (Fully-booked is fine:
    # walk-ins join the live queue beyond the bookable slots.)
    today = date.today()
    if sch.is_on_holiday(doctor, today):
        raise HTTPException(status.HTTP_409_CONFLICT, "Doctor is on holiday today — walk-in not allowed.")
    if sch.is_on_leave(db, doctor, today):
        raise HTTPException(status.HTTP_409_CONFLICT, "Doctor is on leave today — walk-in not allowed.")
    if not sch.active_schedules(doctor, today, aff.affiliation_id):
        raise HTTPException(status.HTTP_409_CONFLICT, "Doctor does not consult today — walk-in not allowed.")
    # Find-or-create the patient by phone within the doctor's hospital.
    patient = db.scalar(select(Patient).where(Patient.hospital_id == (aff.hospital_id or doctor.hospital_id), Patient.phone == body.phone))
    if not patient:
        patient = Patient(hospital_id=aff.hospital_id or doctor.hospital_id, name=body.name, phone=body.phone, registration_source="walkin", uhid=uhid_service.allocate(db))
        db.add(patient)
        db.flush()
    appt = Appointment(
        hospital_id=aff.hospital_id or doctor.hospital_id, doctor_id=doctor.doctor_id, affiliation_id=aff.affiliation_id, patient_id=patient.patient_id,
        appointment_date=date.today(), appointment_type="walkin", status="confirmed",
        consultation_fee=aff.consultation_fee or doctor.consultation_fee,
        notes=normalize.to_english_text(body.notes), source="walkin",
        booked_by=me.user_id, confirmed_at=utcnow(),
    )
    db.add(appt)
    db.flush()
    _set_status(db, appt, "confirmed", me.user_id, "Walk-in")
    db.commit()
    db.refresh(appt)
    return appt


@router.post("/feedback", response_model=AppointmentOut)
def feedback(body: FeedbackRequest, me: User = Depends(require_permission("appointment", "read")), db: Session = Depends(get_db)):
    appt = _appt(db, body.appointment_id)
    _assert_access(me, appt)
    appt.rating = body.rating
    appt.feedback = body.comment
    db.commit()
    db.refresh(appt)
    return appt


# ===================================================== Item paths ===========
@router.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: int, me: User = Depends(require_permission("appointment", "read")), db: Session = Depends(get_db)):
    appt = _appt(db, appointment_id)
    _assert_access(me, appt)
    return appt


@router.put("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(appointment_id: int, body: AppointmentUpdate, me: User = Depends(require_permission("appointment", "update")), db: Session = Depends(get_db)):
    appt = _appt(db, appointment_id)
    _assert_access(me, appt)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(appt, k, v)
    db.commit()
    db.refresh(appt)
    return appt


@router.delete("/{appointment_id}", response_model=AppointmentOut)
def cancel_by_id(appointment_id: int, reason: str = Query(""), me: User = Depends(require_permission("appointment", "update")), db: Session = Depends(get_db)):
    return _do_cancel(db, me, appointment_id, reason)


@router.get("/{appointment_id}/status-history", response_model=list[StatusHistoryOut])
def status_history(appointment_id: int, me: User = Depends(require_permission("appointment", "read")), db: Session = Depends(get_db)):
    appt = _appt(db, appointment_id)
    _assert_access(me, appt)
    return db.scalars(select(ApptStatusHistory).where(ApptStatusHistory.appointment_id == appointment_id).order_by(ApptStatusHistory.history_id)).all()


@router.get("/{appointment_id}/reschedule-history", response_model=list[RescheduleHistoryOut])
def reschedule_history(appointment_id: int, me: User = Depends(require_permission("appointment", "read")), db: Session = Depends(get_db)):
    appt = _appt(db, appointment_id)
    _assert_access(me, appt)
    return db.scalars(select(ApptRescheduleHistory).where(ApptRescheduleHistory.appointment_id == appointment_id).order_by(ApptRescheduleHistory.reschedule_id)).all()


# ---- shared cancel ----
def _do_cancel(db: Session, me: User, appointment_id: int, reason: str) -> Appointment:
    appt = _appt(db, appointment_id)
    _assert_access(me, appt)
    if appt.status == "cancelled":
        raise HTTPException(status.HTTP_409_CONFLICT, "Already cancelled")
    # Refund disposition is finalised by the Payment module (Phase 5).
    refund_status = "pending" if appt.booking_fee_paid and appt.booking_fee_paid > 0 else "none"
    db.add(ApptCancellationLog(
        appointment_id=appt.appointment_id, cancelled_by=me.user_id,
        cancel_reason=reason, refund_status=refund_status, refund_amount=0,
    ))
    _set_status(db, appt, "cancelled", me.user_id, reason or "Cancelled")
    audit.log_activity(db, me.user_id, "appointment.cancel", "appointment", {"appointment_id": appointment_id})
    db.commit()
    db.refresh(appt)
    return appt
