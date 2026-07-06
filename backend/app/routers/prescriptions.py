"""
Prescriptions — a doctor writes an Rx (diagnosis + drugs + advice) at a visit;
the patient reads their own in the app.

Access mirrors the Patient module: a PATIENT user is confined to their own
records, staff to their tenant (or any global patient who has booked there).
Creation reuses the existing `appointment.update` permission (doctors / front
desk hold it) so no new RBAC rows need seeding; reads use `patient.read`.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import ensure_same_tenant, require_permission
from ..models import (
    Appointment, Doctor, FamilyMember, Hospital, Patient, Prescription, PrescriptionItem, User,
)
from ..schemas.prescription import PrescriptionCreate, PrescriptionOut
from ..services import audit

router = APIRouter(tags=["prescriptions"])


def _patient(db: Session, patient_id: int) -> Patient:
    p = db.get(Patient, patient_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    return p


def _assert_access(db: Session, me: User, patient: Patient) -> None:
    """PATIENT users see only their own; staff see their tenant or any global
    patient who has booked at their hospital."""
    role = me.role.name if me.role else None
    if role == "PATIENT":
        if patient.user_id != me.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your record")
        return
    if role == "SUPER_ADMIN" or patient.hospital_id == me.hospital_id:
        return
    booked_here = db.scalar(
        select(Appointment.appointment_id).where(
            Appointment.patient_id == patient.patient_id,
            Appointment.hospital_id == me.hospital_id,
        )
    )
    if not booked_here:
        ensure_same_tenant(me, patient.hospital_id)  # raises 403 for other tenants


def _enrich(db: Session, rows: list[Prescription]) -> list[PrescriptionOut]:
    doc_ids = {r.doctor_id for r in rows}
    hosp_ids = {r.hospital_id for r in rows}
    pat_ids = {r.patient_id for r in rows}
    fam_ids = {r.family_member_id for r in rows if r.family_member_id}
    doctors = {d.doctor_id: d for d in db.scalars(select(Doctor).where(Doctor.doctor_id.in_(doc_ids)))} if doc_ids else {}
    hospitals = {h.hospital_id: h for h in db.scalars(select(Hospital).where(Hospital.hospital_id.in_(hosp_ids)))} if hosp_ids else {}
    patients = {p.patient_id: p for p in db.scalars(select(Patient).where(Patient.patient_id.in_(pat_ids)))} if pat_ids else {}
    members = {m.member_id: m.name for m in db.scalars(select(FamilyMember).where(FamilyMember.member_id.in_(fam_ids)))} if fam_ids else {}
    out = []
    for r in rows:
        o = PrescriptionOut.model_validate(r)
        d = doctors.get(r.doctor_id)
        o.doctor_name = d.name if d else None
        o.doctor_specialty = d.specialization if d else None
        o.hospital_name = getattr(hospitals.get(r.hospital_id), "name", None)
        o.patient_name = getattr(patients.get(r.patient_id), "name", None)
        if r.family_member_id:
            o.family_member_name = members.get(r.family_member_id)
        out.append(o)
    return out


@router.get("/prescriptions", response_model=list[PrescriptionOut])
def list_prescriptions(
    patient_id: int | None = Query(None),
    me: User = Depends(require_permission("patient", "read")),
    db: Session = Depends(get_db),
):
    """List prescriptions. PATIENT → their own (any patient_id filter is ignored
    and replaced by their linked records); staff → scoped to a patient they may
    access (patient_id required, else their hospital's)."""
    stmt = select(Prescription).options(selectinload(Prescription.items))
    role = me.role.name if me.role else None
    if role == "PATIENT":
        my_ids = select(Patient.patient_id).where(Patient.user_id == me.user_id)
        stmt = stmt.where(Prescription.patient_id.in_(my_ids))
    elif patient_id:
        _assert_access(db, me, _patient(db, patient_id))
        stmt = stmt.where(Prescription.patient_id == patient_id)
    elif role != "SUPER_ADMIN":
        stmt = stmt.where(Prescription.hospital_id == me.hospital_id)
    rows = db.scalars(stmt.order_by(Prescription.created_at.desc())).all()
    return _enrich(db, rows)


@router.get("/patients/{patient_id}/prescriptions", response_model=list[PrescriptionOut])
def patient_prescriptions(
    patient_id: int,
    me: User = Depends(require_permission("patient", "read")),
    db: Session = Depends(get_db),
):
    _assert_access(db, me, _patient(db, patient_id))
    rows = db.scalars(
        select(Prescription).options(selectinload(Prescription.items))
        .where(Prescription.patient_id == patient_id)
        .order_by(Prescription.created_at.desc())
    ).all()
    return _enrich(db, rows)


@router.get("/prescriptions/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(
    prescription_id: int,
    me: User = Depends(require_permission("patient", "read")),
    db: Session = Depends(get_db),
):
    rx = db.get(Prescription, prescription_id)
    if not rx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prescription not found")
    _assert_access(db, me, _patient(db, rx.patient_id))
    return _enrich(db, [rx])[0]


@router.post("/prescriptions", response_model=PrescriptionOut, status_code=201)
def create_prescription(
    body: PrescriptionCreate,
    me: User = Depends(require_permission("appointment", "update")),
    db: Session = Depends(get_db),
):
    patient = _patient(db, body.patient_id)
    _assert_access(db, me, patient)
    doctor = db.get(Doctor, body.doctor_id)
    if not doctor:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")
    if not (me.role and me.role.name in ("PATIENT", "SUPER_ADMIN")):
        ensure_same_tenant(me, doctor.hospital_id)
    if not body.items:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Add at least one medicine")
    rx = Prescription(
        hospital_id=doctor.hospital_id,
        patient_id=patient.patient_id,
        doctor_id=doctor.doctor_id,
        appointment_id=body.appointment_id,
        family_member_id=body.family_member_id,
        diagnosis=body.diagnosis,
        advice=body.advice,
        follow_up_date=body.follow_up_date,
        created_by=me.user_id,
        items=[PrescriptionItem(**it.model_dump()) for it in body.items],
    )
    db.add(rx)
    audit.log_activity(db, me.user_id, "prescription.create", "prescription", {"patient_id": patient.patient_id})
    db.commit()
    db.refresh(rx)
    return _enrich(db, [rx])[0]


@router.delete("/prescriptions/{prescription_id}")
def delete_prescription(
    prescription_id: int,
    me: User = Depends(require_permission("appointment", "update")),
    db: Session = Depends(get_db),
):
    rx = db.get(Prescription, prescription_id)
    if not rx:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Prescription not found")
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        ensure_same_tenant(me, rx.hospital_id)
    db.delete(rx)
    db.commit()
    return {"message": "Prescription deleted"}
