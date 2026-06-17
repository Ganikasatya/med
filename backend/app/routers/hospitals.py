"""Module 2 — Hospital + settings endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from sqlalchemy import select as _select

from ..database import get_db, utcnow
from ..deps import ensure_same_tenant, require_permission, require_role
from ..models import Hospital, HospitalSettings, User
from ..rbac import ROLE_PATIENT, ROLE_SUPER_ADMIN
from ..schemas.hospital import (
    HospitalCreate, HospitalDetail, HospitalOut, HospitalSettingsOut,
    HospitalSettingsUpdate, HospitalUpdate, RejectRequest,
)
from ..services import audit
from ..services import notifications as notify

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


def _require(db: Session, hospital_id: int) -> Hospital:
    h = db.get(Hospital, hospital_id)
    if not h:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hospital not found")
    return h


@router.get("", response_model=list[HospitalOut])
def list_hospitals(me: User = Depends(require_permission("hospital", "read")), db: Session = Depends(get_db)):
    stmt = select(Hospital).order_by(Hospital.hospital_id)
    role = me.role.name if me.role else None
    if role == ROLE_SUPER_ADMIN:
        pass  # platform owner sees every clinic
    elif role == ROLE_PATIENT:
        # Patients are global marketplace users — browse every live clinic.
        stmt = stmt.where(Hospital.status == "active", Hospital.is_active.is_(True))
    else:
        # Clinic staff are confined to their own hospital.
        stmt = stmt.where(Hospital.hospital_id == me.hospital_id)
    return db.scalars(stmt).all()


@router.get("/pending", response_model=list[HospitalOut],
            dependencies=[Depends(require_role(ROLE_SUPER_ADMIN))])
def pending_hospitals(db: Session = Depends(get_db)):
    """Clinics awaiting approval (Super Admin)."""
    return db.scalars(_select(Hospital).where(Hospital.status == "pending").order_by(Hospital.hospital_id)).all()


@router.post("/{hospital_id}/approve", response_model=HospitalOut,
             dependencies=[Depends(require_role(ROLE_SUPER_ADMIN))])
def approve_hospital(hospital_id: int, db: Session = Depends(get_db)):
    """Approve a pending clinic: activate the hospital + its owner admin, notify them."""
    h = _require(db, hospital_id)
    if h.status != "pending":
        raise HTTPException(status.HTTP_409_CONFLICT, f"Hospital is already {h.status}")
    h.status = "active"
    h.is_active = True
    admins = db.scalars(_select(User).where(User.hospital_id == hospital_id, User.status == "inactive")).all()
    for u in admins:
        u.status = "active"
    owner = admins[0] if admins else db.scalar(_select(User).where(User.hospital_id == hospital_id))
    if owner and owner.email:
        notify.send_email(
            db, owner.email, "Your clinic has been approved",
            f"Welcome aboard! {h.name} is now active — you can log in and start adding doctors.",
            ntype="general", hospital_id=hospital_id,
        )
    audit.log_activity(db, None, "clinic.approve", "hospital", {"hospital_id": hospital_id})
    db.commit()
    db.refresh(h)
    return h


@router.post("/{hospital_id}/reject", response_model=HospitalOut,
             dependencies=[Depends(require_role(ROLE_SUPER_ADMIN))])
def reject_hospital(hospital_id: int, body: RejectRequest, db: Session = Depends(get_db)):
    h = _require(db, hospital_id)
    h.status = "suspended"
    h.is_active = False
    owner = db.scalar(_select(User).where(User.hospital_id == hospital_id))
    if owner and owner.email:
        notify.send_email(
            db, owner.email, "Clinic registration update",
            f"Your registration for {h.name} was not approved. {body.reason}".strip(),
            ntype="general", hospital_id=hospital_id,
        )
    db.commit()
    db.refresh(h)
    return h


@router.get("/{hospital_id}", response_model=HospitalDetail)
def get_hospital(hospital_id: int, me: User = Depends(require_permission("hospital", "read")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, hospital_id)
    return _require(db, hospital_id)


@router.post("", response_model=HospitalDetail, status_code=201,
             dependencies=[Depends(require_permission("hospital", "create"))])
def create_hospital(body: HospitalCreate, db: Session = Depends(get_db)):
    if db.scalar(select(Hospital).where(Hospital.short_code == body.short_code)):
        raise HTTPException(status.HTTP_409_CONFLICT, "short_code already in use")
    h = Hospital(**body.model_dump(exclude_none=True))
    h.settings = HospitalSettings(token_prefix=body.short_code[:10] or "OPD")
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.put("/{hospital_id}", response_model=HospitalOut)
def update_hospital(hospital_id: int, body: HospitalUpdate, me: User = Depends(require_permission("hospital", "update")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, hospital_id)
    h = _require(db, hospital_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(h, k, v)
    audit.log_activity(db, me.user_id, "hospital.update", "hospital", {"hospital_id": hospital_id})
    db.commit()
    db.refresh(h)
    return h


@router.delete("/{hospital_id}", dependencies=[Depends(require_permission("hospital", "delete"))])
def deactivate_hospital(hospital_id: int, db: Session = Depends(get_db)):
    h = _require(db, hospital_id)
    h.is_active = False
    db.commit()
    return {"message": "Hospital deactivated"}


@router.get("/{hospital_id}/settings", response_model=HospitalSettingsOut)
def get_settings(hospital_id: int, me: User = Depends(require_permission("hospital", "read")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, hospital_id)
    h = _require(db, hospital_id)
    if not h.settings:
        h.settings = HospitalSettings(hospital_id=hospital_id)
        db.commit()
        db.refresh(h)
    return h.settings


@router.put("/{hospital_id}/settings", response_model=HospitalSettingsOut)
def update_settings(hospital_id: int, body: HospitalSettingsUpdate, me: User = Depends(require_permission("hospital", "update")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, hospital_id)
    h = _require(db, hospital_id)
    if not h.settings:
        h.settings = HospitalSettings(hospital_id=hospital_id)
        db.flush()
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(h.settings, k, v)
    audit.log_activity(db, me.user_id, "hospital.update_settings", "hospital", {"hospital_id": hospital_id})
    db.commit()
    db.refresh(h.settings)
    return h.settings
