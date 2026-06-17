"""
Module 3 — Doctor endpoints (20 APIs).

Doctors master CRUD + the scheduling sub-resources (weekly schedule, breaks,
holidays, delay logs, leave workflow, live presence status). All tenant-scoped.
"""
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import ensure_same_tenant, require_permission
from ..models import (
    Department, Doctor, DoctorAffiliation, DoctorBreak, DoctorDelayLog, DoctorHoliday,
    DoctorLeaveRequest, DoctorSchedule, DoctorStatus, Hospital, Role, User,
)
from ..rbac import ROLE_DOCTOR, ROLE_PATIENT, ROLE_SUPER_ADMIN, is_clinic_staff
from ..schemas.doctor import (
    AffiliationCreate, AffiliationOut, AffiliationUpdate, BreakCreate, BreakOut,
    DelayCreate, DelayOut, DoctorCreate, DoctorDetail, DoctorOnboard, DoctorOut,
    DoctorUpdate, HolidayCreate, HolidayOut,
    LeaveCreate, LeaveDecision, LeaveOut, PresenceOut, PresenceUpdate,
    ScheduleCreate, ScheduleOut, ScheduleUpdate,
)
from ..security import hash_password
from ..services import audit
from ..services import notifications as notify
from ..services import token_engine as te

router = APIRouter(tags=["doctors"])


# ---- helpers ----
def _doctor(db: Session, doctor_id: int) -> Doctor:
    d = db.get(Doctor, doctor_id)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")
    return d


def _schedule(db: Session, schedule_id: int) -> DoctorSchedule:
    s = db.get(DoctorSchedule, schedule_id)
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Schedule not found")
    return s


def _overlaps(a_start, a_end, b_start, b_end) -> bool:
    return a_start < b_end and b_start < a_end


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
    hospital = db.get(Hospital, doctor.hospital_id)
    aff = DoctorAffiliation(
        doctor_id=doctor.doctor_id,
        hospital_id=doctor.hospital_id,
        practice_type="clinic",
        name=hospital.name if hospital else "Clinic",
        city=hospital.city if hospital else "",
        consultation_fee=doctor.consultation_fee,
        mode="slot",
        managed_by_hospital=True,
    )
    db.add(aff)
    db.flush()
    return aff


def _affiliation(db: Session, affiliation_id: int, doctor_id: int | None = None) -> DoctorAffiliation:
    aff = db.get(DoctorAffiliation, affiliation_id)
    if not aff or (doctor_id is not None and aff.doctor_id != doctor_id):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor affiliation not found")
    return aff


# ========================================================= Doctors ==========
@router.get("/doctors", response_model=list[DoctorOut])
def list_doctors(
    hospital_id: int | None = Query(None),
    department_id: int | None = Query(None),
    q: str | None = Query(None, description="search specialization"),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    me: User = Depends(require_permission("doctor", "read")),
    db: Session = Depends(get_db),
):
    role = me.role.name if me.role else None
    stmt = select(Doctor)
    if role == ROLE_SUPER_ADMIN:
        if hospital_id:
            stmt = stmt.where(Doctor.hospital_id == hospital_id)
    elif role == ROLE_PATIENT:
        # Patients browse every active doctor across all clinics; an optional
        # hospital_id narrows to one clinic when they pick "Find Clinic" first.
        stmt = stmt.where(Doctor.status == "active")
        if hospital_id:
            stmt = stmt.where(Doctor.hospital_id == hospital_id)
    else:
        stmt = stmt.where(Doctor.hospital_id == me.hospital_id)  # tenant scope
    if department_id:
        stmt = stmt.where(Doctor.department_id == department_id)
    if q:
        stmt = stmt.where(Doctor.specialization.ilike(f"%{q}%"))
    stmt = stmt.order_by(Doctor.doctor_id).offset((page - 1) * size).limit(size)
    return db.scalars(stmt).all()


@router.get("/doctors/{doctor_id}", response_model=DoctorDetail)
def get_doctor(doctor_id: int, me: User = Depends(require_permission("doctor", "read")), db: Session = Depends(get_db)):
    d = _doctor(db, doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    return d


@router.post("/doctors", response_model=DoctorOut, status_code=201)
def create_doctor(body: DoctorCreate, me: User = Depends(require_permission("doctor", "create")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, body.hospital_id)
    if not db.get(Hospital, body.hospital_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid hospital_id")
    if body.department_id and not db.get(Department, body.department_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department_id")
    if body.user_id and not db.get(User, body.user_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid user_id")
    d = Doctor(**body.model_dump())
    d.presence = DoctorStatus(status="off_duty")
    db.add(d)
    db.flush()
    _default_affiliation(db, d)
    audit.log_activity(db, me.user_id, "doctor.create", "doctor")
    db.commit()
    db.refresh(d)
    return d


@router.post("/doctors/onboard", response_model=DoctorOut, status_code=201)
def onboard_doctor(body: DoctorOnboard, me: User = Depends(require_permission("doctor", "create")), db: Session = Depends(get_db)):
    """Admin adds a doctor to their own hospital, optionally creating a login."""
    if me.role and me.role.name == ROLE_SUPER_ADMIN:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Super admin must use POST /doctors with an explicit hospital_id")
    hospital_id = me.hospital_id
    if body.department_id and not db.get(Department, body.department_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid department_id")

    user_id = None
    if body.create_login:
        if not (body.email and body.password):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "email and password are required to create a login")
        if db.scalar(select(User).where(User.email == body.email)):
            raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
        if body.phone and db.scalar(select(User).where(User.phone == body.phone)):
            raise HTTPException(status.HTTP_409_CONFLICT, "Phone already registered")
        role = db.scalar(select(Role).where(Role.name == ROLE_DOCTOR))
        u = User(hospital_id=hospital_id, role_id=role.role_id, name=body.name,
                 email=body.email, phone=body.phone, password_hash=hash_password(body.password))
        db.add(u)
        db.flush()
        user_id = u.user_id

    doc = Doctor(
        name=body.name, user_id=user_id, hospital_id=hospital_id, department_id=body.department_id,
        specialization=body.specialization, qualification=body.qualification,
        experience_years=body.experience_years, consultation_fee=body.consultation_fee,
        languages=body.languages, status="active",
    )
    doc.presence = DoctorStatus(status="off_duty")
    db.add(doc)
    db.flush()
    _default_affiliation(db, doc)
    audit.log_activity(db, me.user_id, "doctor.onboard", "doctor", {"name": body.name})
    db.commit()
    db.refresh(doc)
    return doc


@router.put("/doctors/{doctor_id}", response_model=DoctorOut)
def update_doctor(doctor_id: int, body: DoctorUpdate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    d = _doctor(db, doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    fields = body.model_dump(exclude_unset=True)
    # The consultation fee is owned by the clinic — a doctor can't change it.
    if me.role and me.role.name == ROLE_DOCTOR and "consultation_fee" in fields:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Consultation fee is set by the clinic")
    for k, v in fields.items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/doctors/{doctor_id}")
def deactivate_doctor(doctor_id: int, me: User = Depends(require_permission("doctor", "delete")), db: Session = Depends(get_db)):
    d = _doctor(db, doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    d.status = "inactive"
    db.commit()
    return {"message": "Doctor deactivated"}


# ===================================================== Affiliations =========
@router.get("/doctor-affiliations", response_model=list[AffiliationOut])
def list_affiliations(
    doctor_id: int | None = Query(None),
    hospital_id: int | None = Query(None),
    me: User = Depends(require_permission("doctor", "read")),
    db: Session = Depends(get_db),
):
    role = me.role.name if me.role else None
    stmt = select(DoctorAffiliation)
    if doctor_id:
        stmt = stmt.where(DoctorAffiliation.doctor_id == doctor_id)
    if role == ROLE_PATIENT:
        stmt = stmt.where(DoctorAffiliation.is_active.is_(True))
        if hospital_id:
            stmt = stmt.where(DoctorAffiliation.hospital_id == hospital_id)
    elif role == ROLE_DOCTOR:
        own_doctor = db.scalar(select(Doctor).where(Doctor.user_id == me.user_id))
        if not own_doctor:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Doctor profile not linked")
        stmt = stmt.where(DoctorAffiliation.doctor_id == own_doctor.doctor_id)
    elif role != ROLE_SUPER_ADMIN:
        stmt = stmt.where(DoctorAffiliation.hospital_id == me.hospital_id)
    elif hospital_id:
        stmt = stmt.where(DoctorAffiliation.hospital_id == hospital_id)
    return db.scalars(stmt.order_by(DoctorAffiliation.doctor_id, DoctorAffiliation.affiliation_id)).all()


@router.post("/doctor-affiliations", response_model=AffiliationOut, status_code=201)
def add_affiliation(body: AffiliationCreate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    d = _doctor(db, body.doctor_id)
    role = me.role.name if me.role else None
    if role == ROLE_DOCTOR:
        if d.user_id != me.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Can only manage your own practice locations")
    else:
        ensure_same_tenant(me, body.hospital_id or d.hospital_id)
        if body.practice_type != "clinic":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Clinic staff can only add clinic affiliations")
    aff = DoctorAffiliation(**body.model_dump())
    # Enforce the isolation invariant server-side rather than trusting the client:
    # ONLY a true clinic practice is hospital-managed (visible to clinic staff);
    # personal_clinic / home / online are always private to the doctor. Keeping
    # managed_by_hospital + hospital_id consistent here is what every clinic-side
    # filter (appointments, tokens, schedule, reports) relies on.
    aff.managed_by_hospital = (aff.practice_type == "clinic")
    if aff.practice_type == "clinic":
        if not aff.hospital_id:
            aff.hospital_id = d.hospital_id
    else:
        aff.hospital_id = None
    db.add(aff)
    db.commit()
    db.refresh(aff)
    return aff


@router.put("/doctor-affiliations/{affiliation_id}", response_model=AffiliationOut)
def update_affiliation(affiliation_id: int, body: AffiliationUpdate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    aff = _affiliation(db, affiliation_id)
    d = _doctor(db, aff.doctor_id)
    if me.role and me.role.name == ROLE_DOCTOR:
        if d.user_id != me.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Can only manage your own practice locations")
    else:
        ensure_same_tenant(me, aff.hospital_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(aff, k, v)
    db.commit()
    db.refresh(aff)
    return aff


# ===================================================== Schedule =============
@router.get("/doctor-schedule", response_model=list[ScheduleOut])
def get_schedule(
    doctor_id: int = Query(...),
    affiliation_id: int | None = Query(None),
    me: User = Depends(require_permission("doctor", "read")),
    db: Session = Depends(get_db),
):
    d = _doctor(db, doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    stmt = select(DoctorSchedule).where(DoctorSchedule.doctor_id == doctor_id)
    if affiliation_id:
        stmt = stmt.where(DoctorSchedule.affiliation_id == affiliation_id)
    # Clinic front-desk staff must not see a doctor's personal-practice sessions —
    # only hospital-managed ones (schedules with no affiliation = legacy clinic).
    if is_clinic_staff(me.role.name if me.role else None):
        stmt = stmt.outerjoin(
            DoctorAffiliation, DoctorSchedule.affiliation_id == DoctorAffiliation.affiliation_id
        ).where(
            or_(
                DoctorSchedule.affiliation_id.is_(None),
                DoctorAffiliation.managed_by_hospital.is_(True),
            )
        )
    return db.scalars(stmt).all()


@router.post("/doctor-schedule", response_model=ScheduleOut, status_code=201)
def add_schedule(body: ScheduleCreate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    d = _doctor(db, body.doctor_id)
    aff = _affiliation(db, body.affiliation_id, d.doctor_id) if body.affiliation_id else _default_affiliation(db, d)
    if me.role and me.role.name == ROLE_DOCTOR:
        if d.user_id != me.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Can only manage your own schedule")
    else:
        if not aff.hospital_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Clinic staff cannot manage personal practice schedules")
        ensure_same_tenant(me, aff.hospital_id)
    if body.start_time >= body.end_time:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "start_time must be before end_time")
    # No overlapping active session on the same weekday.
    for s in d.schedules:
        same_aff = (s.affiliation_id or aff.affiliation_id) == aff.affiliation_id
        if same_aff and s.is_active and s.day_of_week == body.day_of_week and _overlaps(body.start_time, body.end_time, s.start_time, s.end_time):
            raise HTTPException(status.HTTP_409_CONFLICT, f"Overlaps existing {body.day_of_week} session")
    data = body.model_dump()
    data["affiliation_id"] = aff.affiliation_id
    s = DoctorSchedule(**data)
    db.add(s)
    db.commit()
    db.refresh(s)
    return s


@router.put("/doctor-schedule/{schedule_id}", response_model=ScheduleOut)
def edit_schedule(schedule_id: int, body: ScheduleUpdate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    s = _schedule(db, schedule_id)
    ensure_same_tenant(me, s.doctor.hospital_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    if s.start_time >= s.end_time:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "start_time must be before end_time")
    db.commit()
    db.refresh(s)
    return s


@router.delete("/doctor-schedule/{schedule_id}")
def delete_schedule(schedule_id: int, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    s = _schedule(db, schedule_id)
    ensure_same_tenant(me, s.doctor.hospital_id)
    db.delete(s)
    db.commit()
    return {"message": "Schedule deleted"}


# ===================================================== Breaks ===============
@router.post("/doctor-breaks", response_model=BreakOut, status_code=201)
def add_break(body: BreakCreate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    s = _schedule(db, body.schedule_id)
    ensure_same_tenant(me, s.doctor.hospital_id)
    if body.break_start >= body.break_end:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "break_start must be before break_end")
    b = DoctorBreak(**body.model_dump())
    db.add(b)
    db.commit()
    db.refresh(b)
    return b


@router.delete("/doctor-breaks/{break_id}")
def remove_break(break_id: int, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    b = db.get(DoctorBreak, break_id)
    if not b:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Break not found")
    ensure_same_tenant(me, b.schedule.doctor.hospital_id)
    db.delete(b)
    db.commit()
    return {"message": "Break removed"}


# ===================================================== Holidays =============
@router.get("/doctor-holidays", response_model=list[HolidayOut])
def list_holidays(
    doctor_id: int = Query(...),
    month: int | None = Query(None, ge=1, le=12),
    year: int | None = Query(None),
    me: User = Depends(require_permission("doctor", "read")),
    db: Session = Depends(get_db),
):
    d = _doctor(db, doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    rows = db.scalars(select(DoctorHoliday).where(DoctorHoliday.doctor_id == doctor_id)).all()
    if month:
        rows = [h for h in rows if h.holiday_date.month == month]
    if year:
        rows = [h for h in rows if h.holiday_date.year == year]
    return rows


@router.post("/doctor-holidays", response_model=HolidayOut, status_code=201)
def add_holiday(body: HolidayCreate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    d = _doctor(db, body.doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    h = DoctorHoliday(**body.model_dump(), created_by=me.user_id)
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.delete("/doctor-holidays/{holiday_id}")
def cancel_holiday(holiday_id: int, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    h = db.get(DoctorHoliday, holiday_id)
    if not h:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Holiday not found")
    ensure_same_tenant(me, h.doctor.hospital_id)
    db.delete(h)
    db.commit()
    return {"message": "Holiday cancelled"}


# ===================================================== Delays ===============
@router.get("/doctor-delay", response_model=list[DelayOut])
def list_delays(doctor_id: int = Query(...), me: User = Depends(require_permission("doctor", "read")), db: Session = Depends(get_db)):
    d = _doctor(db, doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    return db.scalars(
        select(DoctorDelayLog).where(DoctorDelayLog.doctor_id == doctor_id).order_by(DoctorDelayLog.delay_id.desc())
    ).all()


@router.post("/doctor-delay", response_model=DelayOut, status_code=201)
def log_delay(body: DelayCreate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    d = _doctor(db, body.doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    delay_date = body.delay_date or date.today()
    log = DoctorDelayLog(
        doctor_id=body.doctor_id, delay_minutes=body.delay_minutes, reason=body.reason,
        delay_date=delay_date, logged_by=me.user_id,
        notified_patients=False,
    )
    db.add(log)
    db.flush()

    waiting = te.recompute_positions(db, body.doctor_id, delay_date)
    notified = 0
    for token in waiting:
        patient = token.patient
        if not patient or not patient.phone:
            continue
        eta = token.estimated_time.strftime("%I:%M %p") if token.estimated_time else "later than planned"
        notify.send_sms(
            db,
            patient.phone,
            f"Dr. {d.name} is running late by {body.delay_minutes} min. "
            f"Token {token.display_code} revised ETA: {eta}.",
            ntype="delay",
            title="Doctor Delayed",
            hospital_id=token.hospital_id,
            patient_id=patient.patient_id,
            appointment_id=token.appointment_id,
            token_id=token.token_id,
        )
        notified += 1

    notify.send_push(
        db,
        f"hospital:{d.hospital_id}:reception",
        "Doctor Running Late",
        f"Dr. {d.name} is running late by {body.delay_minutes} min. "
        f"{len(waiting)} pending token{'s' if len(waiting) != 1 else ''} shifted.",
        platform="web",
        payload={"doctor_id": d.doctor_id, "delay_minutes": body.delay_minutes, "pending_tokens": len(waiting)},
        ntype="delay",
        hospital_id=d.hospital_id,
    )
    log.notified_patients = notified > 0
    audit.log_activity(db, me.user_id, "doctor.delay", "doctor", {"doctor_id": body.doctor_id, "minutes": body.delay_minutes})
    db.commit()
    db.refresh(log)
    return log


# ===================================================== Leave ================
@router.get("/doctor-leave", response_model=list[LeaveOut])
def list_leave(
    doctor_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    me: User = Depends(require_permission("doctor", "read")),
    db: Session = Depends(get_db),
):
    stmt = select(DoctorLeaveRequest)
    if doctor_id:
        d = _doctor(db, doctor_id)
        ensure_same_tenant(me, d.hospital_id)
        stmt = stmt.where(DoctorLeaveRequest.doctor_id == doctor_id)
    if status_filter:
        stmt = stmt.where(DoctorLeaveRequest.status == status_filter)
    rows = db.scalars(stmt.order_by(DoctorLeaveRequest.leave_id.desc())).all()
    # Confine to tenant when not filtered by a specific doctor.
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        rows = [r for r in rows if r.doctor.hospital_id == me.hospital_id]
    return rows


@router.post("/doctor-leave", response_model=LeaveOut, status_code=201)
def submit_leave(body: LeaveCreate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    d = _doctor(db, body.doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    if body.leave_from > body.leave_to:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "leave_from must be on/before leave_to")
    lv = DoctorLeaveRequest(**body.model_dump(), status="pending")
    db.add(lv)
    db.commit()
    db.refresh(lv)
    return lv


@router.put("/doctor-leave/{leave_id}", response_model=LeaveOut)
def decide_leave(leave_id: int, body: LeaveDecision, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    lv = db.get(DoctorLeaveRequest, leave_id)
    if not lv:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Leave request not found")
    ensure_same_tenant(me, lv.doctor.hospital_id)
    lv.status = body.status
    lv.approved_by = me.user_id
    if body.status == "rejected":
        lv.rejection_reason = body.rejection_reason or "Not specified"
    # Approved leave → flip doctor master status so scheduling respects it.
    if body.status == "approved":
        lv.doctor.status = "on_leave"
    audit.log_activity(db, me.user_id, f"doctor.leave_{body.status}", "doctor", {"leave_id": leave_id})
    db.commit()
    db.refresh(lv)
    return lv


# ===================================================== Presence =============
@router.get("/doctor-status", response_model=PresenceOut)
def get_status(doctor_id: int = Query(...), me: User = Depends(require_permission("doctor", "read")), db: Session = Depends(get_db)):
    d = _doctor(db, doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    if not d.presence:
        d.presence = DoctorStatus(doctor_id=doctor_id, status="off_duty")
        db.commit()
        db.refresh(d)
    return d.presence


@router.put("/doctor-status", response_model=PresenceOut)
def set_status(doctor_id: int, body: PresenceUpdate, me: User = Depends(require_permission("doctor", "update")), db: Session = Depends(get_db)):
    d = _doctor(db, doctor_id)
    ensure_same_tenant(me, d.hospital_id)
    if not d.presence:
        d.presence = DoctorStatus(doctor_id=doctor_id)
        db.flush()
    d.presence.status = body.status
    d.presence.note = body.note
    d.presence.updated_by = me.user_id
    db.commit()
    db.refresh(d.presence)
    return d.presence
