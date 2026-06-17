"""Module 10 — Subscription endpoints (10 APIs): plans, subscriptions, invoices, usage."""
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db, utcnow
from ..deps import ensure_same_tenant, require_permission, require_role
from ..models import (
    Department, Doctor, Hospital, Invoice, Plan, Subscription, Token, User,
)
from ..rbac import ROLE_SUPER_ADMIN
from ..schemas.subscription import (
    InvoiceOut, PlanCreate, PlanOut, PlanUpdate, SubscriptionCreate,
    SubscriptionOut, SubscriptionUpdate,
)

router = APIRouter(tags=["subscriptions"])


def _is_super(me: User) -> bool:
    return bool(me.role and me.role.name == ROLE_SUPER_ADMIN)


# ===================================================== Plans ================
@router.get("/plans", response_model=list[PlanOut])
def list_plans(me: User = Depends(require_permission("subscription", "read")), db: Session = Depends(get_db)):
    return db.scalars(select(Plan).order_by(Plan.plan_id)).all()


@router.post("/plans", response_model=PlanOut, status_code=201, dependencies=[Depends(require_role(ROLE_SUPER_ADMIN))])
def create_plan(body: PlanCreate, db: Session = Depends(get_db)):
    p = Plan(**body.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p


@router.put("/plans/{plan_id}", response_model=PlanOut, dependencies=[Depends(require_role(ROLE_SUPER_ADMIN))])
def update_plan(plan_id: int, body: PlanUpdate, db: Session = Depends(get_db)):
    p = db.get(Plan, plan_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


# ===================================================== Subscriptions =======
@router.get("/subscriptions", response_model=list[SubscriptionOut])
def list_subscriptions(hospital_id: int | None = Query(None), me: User = Depends(require_permission("subscription", "read")), db: Session = Depends(get_db)):
    stmt = select(Subscription)
    if not _is_super(me):
        stmt = stmt.where(Subscription.hospital_id == me.hospital_id)
    elif hospital_id:
        stmt = stmt.where(Subscription.hospital_id == hospital_id)
    return db.scalars(stmt.order_by(Subscription.subscription_id.desc())).all()


@router.get("/subscriptions/usage")
def subscription_usage(hospital_id: int | None = Query(None), me: User = Depends(require_permission("subscription", "read")), db: Session = Depends(get_db)):
    hid = hospital_id if (_is_super(me) and hospital_id) else me.hospital_id
    if hid is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "hospital_id required")
    ensure_same_tenant(me, hid)
    sub = db.scalar(select(Subscription).where(Subscription.hospital_id == hid).order_by(Subscription.subscription_id.desc()))
    plan = sub.plan if sub else None
    doctors = db.scalar(select(func.count(Doctor.doctor_id)).where(Doctor.hospital_id == hid)) or 0
    departments = db.scalar(select(func.count(Department.department_id)).where(Department.hospital_id == hid)) or 0
    tokens_today = db.scalar(select(func.count(Token.token_id)).where(Token.hospital_id == hid, Token.token_date == date.today())) or 0

    def _limit(v):
        return "unlimited" if v == -1 else v

    return {
        "hospital_id": hid,
        "plan": plan.name if plan else None,
        "status": sub.status if sub else None,
        "usage": {"doctors": doctors, "departments": departments, "tokens_today": tokens_today},
        "limits": {
            "max_doctors": _limit(plan.max_doctors) if plan else None,
            "max_departments": _limit(plan.max_departments) if plan else None,
            "max_tokens_per_day": _limit(plan.max_tokens_per_day) if plan else None,
        } if plan else None,
    }


@router.post("/subscriptions", response_model=SubscriptionOut, status_code=201)
def create_subscription(body: SubscriptionCreate, me: User = Depends(require_permission("subscription", "create")), db: Session = Depends(get_db)):
    if not db.get(Hospital, body.hospital_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid hospital_id")
    plan = db.get(Plan, body.plan_id)
    if not plan:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid plan_id")
    today = date.today()
    span = 365 if body.billing_cycle == "annually" else 30
    sub = Subscription(
        hospital_id=body.hospital_id, plan_id=body.plan_id, status=body.status,
        billing_cycle=body.billing_cycle, start_date=today,
        end_date=today + timedelta(days=span), discount_pct=body.discount_pct,
        trial_end_date=(today + timedelta(days=body.trial_days)) if body.status == "trial" else None,
    )
    db.add(sub)
    db.flush()
    # Issue an invoice for paid (non-trial) subscriptions.
    if body.status == "active":
        price = plan.price_annually if body.billing_cycle == "annually" else plan.price_monthly
        amount = float(price) * (1 - float(body.discount_pct) / 100)
        tax = round(amount * 0.18, 2)  # 18% GST
        seq = (db.scalar(select(func.count(Invoice.invoice_id))) or 0) + 1
        db.add(Invoice(
            subscription_id=sub.subscription_id, hospital_id=body.hospital_id, plan_id=plan.plan_id,
            invoice_number=f"INV-{today.year}-{seq:04d}", amount=amount, tax_amount=tax,
            total_amount=round(amount + tax, 2), due_date=today + timedelta(days=7), status="sent",
        ))
    db.commit()
    db.refresh(sub)
    return sub


@router.put("/subscriptions/{subscription_id}", response_model=SubscriptionOut)
def update_subscription(subscription_id: int, body: SubscriptionUpdate, me: User = Depends(require_permission("subscription", "update")), db: Session = Depends(get_db)):
    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")
    ensure_same_tenant(me, sub.hospital_id)
    if body.plan_id is not None and not db.get(Plan, body.plan_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid plan_id")
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(sub, k, v)
    db.commit()
    db.refresh(sub)
    return sub


@router.delete("/subscriptions/{subscription_id}")
def cancel_subscription(subscription_id: int, reason: str = Query(""), me: User = Depends(require_permission("subscription", "delete")), db: Session = Depends(get_db)):
    sub = db.get(Subscription, subscription_id)
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription not found")
    sub.status = "cancelled"
    sub.cancelled_at = utcnow()
    sub.cancel_reason = reason
    sub.auto_renew = False
    db.commit()
    return {"message": "Subscription cancelled"}


# ===================================================== Invoices ============
@router.get("/invoices", response_model=list[InvoiceOut])
def list_invoices(hospital_id: int | None = Query(None), me: User = Depends(require_permission("subscription", "read")), db: Session = Depends(get_db)):
    stmt = select(Invoice)
    if not _is_super(me):
        stmt = stmt.where(Invoice.hospital_id == me.hospital_id)
    elif hospital_id:
        stmt = stmt.where(Invoice.hospital_id == hospital_id)
    return db.scalars(stmt.order_by(Invoice.invoice_id.desc())).all()


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
def get_invoice(invoice_id: int, me: User = Depends(require_permission("subscription", "read")), db: Session = Depends(get_db)):
    inv = db.get(Invoice, invoice_id)
    if not inv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found")
    ensure_same_tenant(me, inv.hospital_id)
    return inv
