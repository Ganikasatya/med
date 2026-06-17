"""
Module 5 — Patient endpoints (20 APIs).

Patient master + family members + medical history + allergies + documents.
Staff (reception/admin) manage patients within their tenant; a PATIENT-role user
is confined to their own linked record. Document upload stores files locally
(swap for S3 in production — only `_save_upload` changes).
"""
import os
import re

from fastapi import (
    APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status,
)
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import ensure_same_tenant, require_permission
from ..models import (
    Allergy, Appointment, FamilyMember, Hospital, MedicalHistory, Patient,
    PatientDocument, User,
)
from ..schemas.appointment import AppointmentOut
from ..schemas.patient import (
    AllergyCreate, AllergyOut, DocumentOut, FamilyMemberCreate, FamilyMemberOut,
    FamilyMemberUpdate, MedicalHistoryCreate, MedicalHistoryOut,
    MedicalHistoryUpdate, PatientCreate, PatientDetail, PatientOut, PatientUpdate,
)
from ..services import audit

router = APIRouter(tags=["patients"])

_UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def _patient(db: Session, patient_id: int) -> Patient:
    p = db.get(Patient, patient_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    return p


def _assert_access(me: User, patient: Patient) -> None:
    """PATIENT users are confined to their own record; staff to their tenant."""
    if me.role and me.role.name == "PATIENT":
        if patient.user_id != me.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your patient record")
    else:
        ensure_same_tenant(me, patient.hospital_id)


def _save_upload(patient_id: int, upload: UploadFile) -> tuple[str, int]:
    """Persist an upload locally; return (url, size_kb). S3 replaces this later."""
    safe = re.sub(r"[^A-Za-z0-9._-]", "_", upload.filename or "file")
    folder = os.path.join(_UPLOAD_ROOT, str(patient_id))
    os.makedirs(folder, exist_ok=True)
    path = os.path.join(folder, safe)
    data = upload.file.read()
    with open(path, "wb") as f:
        f.write(data)
    return f"/uploads/{patient_id}/{safe}", max(1, len(data) // 1024)


# ========================================================= Patients =========
@router.get("/patients", response_model=list[PatientOut])
def list_patients(
    hospital_id: int | None = Query(None),
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    me: User = Depends(require_permission("patient", "read")),
    db: Session = Depends(get_db),
):
    is_super = bool(me.role and me.role.name == "SUPER_ADMIN")
    stmt = select(Patient)
    if me.role and me.role.name == "PATIENT":
        stmt = stmt.where(Patient.user_id == me.user_id)
    elif is_super:
        if hospital_id:
            stmt = stmt.where(Patient.hospital_id == hospital_id)
    else:
        stmt = stmt.where(Patient.hospital_id == me.hospital_id)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Patient.name.ilike(like), Patient.phone.ilike(like)))
    return db.scalars(stmt.order_by(Patient.patient_id).offset((page - 1) * size).limit(size)).all()


@router.get("/patients/search", response_model=list[PatientOut])
def search_patients(q: str = Query(..., min_length=1), me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    like = f"%{q}%"
    stmt = select(Patient).where(or_(Patient.name.ilike(like), Patient.phone.ilike(like)))
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        stmt = stmt.where(Patient.hospital_id == me.hospital_id)
    return db.scalars(stmt.limit(50)).all()


@router.post("/patients", response_model=PatientOut, status_code=201)
def create_patient(body: PatientCreate, me: User = Depends(require_permission("patient", "create")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, body.hospital_id)
    if not db.get(Hospital, body.hospital_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid hospital_id")
    if db.scalar(select(Patient).where(Patient.hospital_id == body.hospital_id, Patient.phone == body.phone)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Patient with this phone already exists at this hospital")
    p = Patient(**body.model_dump())
    db.add(p)
    audit.log_activity(db, me.user_id, "patient.create", "patient")
    db.commit()
    db.refresh(p)
    return p


@router.get("/patients/{patient_id}", response_model=PatientDetail)
def get_patient(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(me, p)
    return p


@router.put("/patients/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, body: PatientUpdate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(me, p)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.delete("/patients/{patient_id}")
def delete_patient(patient_id: int, me: User = Depends(require_permission("patient", "delete")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    ensure_same_tenant(me, p.hospital_id)
    db.delete(p)
    db.commit()
    return {"message": "Patient deleted"}


# ===================================================== Family ===============
@router.get("/patients/{patient_id}/family", response_model=list[FamilyMemberOut])
def list_family(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(me, p)
    return p.family_members


@router.post("/family-members", response_model=FamilyMemberOut, status_code=201)
def add_family(body: FamilyMemberCreate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    p = _patient(db, body.patient_id)
    _assert_access(me, p)
    m = FamilyMember(**body.model_dump())
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


@router.put("/family-members/{member_id}", response_model=FamilyMemberOut)
def update_family(member_id: int, body: FamilyMemberUpdate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    m = db.get(FamilyMember, member_id)
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Family member not found")
    _assert_access(me, m.patient)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(m, k, v)
    db.commit()
    db.refresh(m)
    return m


@router.delete("/family-members/{member_id}")
def remove_family(member_id: int, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    m = db.get(FamilyMember, member_id)
    if not m:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Family member not found")
    _assert_access(me, m.patient)
    db.delete(m)
    db.commit()
    return {"message": "Family member removed"}


# ================================================ Medical history ===========
@router.get("/patients/{patient_id}/medical-history", response_model=list[MedicalHistoryOut])
def list_history(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(me, p)
    return p.medical_history


@router.post("/medical-history", response_model=MedicalHistoryOut, status_code=201)
def add_history(body: MedicalHistoryCreate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    p = _patient(db, body.patient_id)
    _assert_access(me, p)
    h = MedicalHistory(**body.model_dump(), created_by=me.user_id)
    db.add(h)
    db.commit()
    db.refresh(h)
    return h


@router.put("/medical-history/{history_id}", response_model=MedicalHistoryOut)
def update_history(history_id: int, body: MedicalHistoryUpdate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    h = db.get(MedicalHistory, history_id)
    if not h:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Record not found")
    _assert_access(me, h.patient)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(h, k, v)
    db.commit()
    db.refresh(h)
    return h


# ===================================================== Allergies ============
@router.get("/patients/{patient_id}/allergies", response_model=list[AllergyOut])
def list_allergies(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(me, p)
    return p.allergies


@router.post("/allergies", response_model=AllergyOut, status_code=201)
def add_allergy(body: AllergyCreate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    p = _patient(db, body.patient_id)
    _assert_access(me, p)
    a = Allergy(**body.model_dump(), created_by=me.user_id)
    db.add(a)
    db.commit()
    db.refresh(a)
    return a


@router.delete("/allergies/{allergy_id}")
def remove_allergy(allergy_id: int, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    a = db.get(Allergy, allergy_id)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Allergy not found")
    _assert_access(me, a.patient)
    db.delete(a)
    db.commit()
    return {"message": "Allergy removed"}


# ===================================================== Documents ============
@router.get("/patients/{patient_id}/documents", response_model=list[DocumentOut])
def list_documents(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(me, p)
    return p.documents


@router.post("/documents", response_model=DocumentOut, status_code=201)
def upload_document(
    patient_id: int = Form(...),
    document_type: str = Form("other"),
    appointment_id: int | None = Form(None),
    file: UploadFile = File(...),
    me: User = Depends(require_permission("patient", "update")),
    db: Session = Depends(get_db),
):
    p = _patient(db, patient_id)
    _assert_access(me, p)
    url, size_kb = _save_upload(patient_id, file)
    doc = PatientDocument(
        patient_id=patient_id, document_type=document_type, file_name=file.filename or "file",
        file_url=url, file_size_kb=size_kb, mime_type=file.content_type,
        uploaded_by=me.user_id, appointment_id=appointment_id,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@router.delete("/documents/{document_id}")
def delete_document(document_id: int, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    d = db.get(PatientDocument, document_id)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Document not found")
    _assert_access(me, d.patient)
    db.delete(d)
    db.commit()
    return {"message": "Document deleted"}


# ============================================ Patient appointments ==========
@router.get("/patients/{patient_id}/appointments", response_model=list[AppointmentOut])
def patient_appointments(
    patient_id: int,
    status_filter: str | None = Query(None, alias="status"),
    me: User = Depends(require_permission("appointment", "read")),
    db: Session = Depends(get_db),
):
    p = _patient(db, patient_id)
    _assert_access(me, p)
    stmt = select(Appointment).where(Appointment.patient_id == patient_id)
    if status_filter:
        stmt = stmt.where(Appointment.status == status_filter)
    return db.scalars(stmt.order_by(Appointment.appointment_date.desc())).all()
