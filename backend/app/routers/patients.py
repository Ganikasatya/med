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
    Allergy, Appointment, Doctor, FamilyMember, Hospital, MedicalHistory,
    Patient, PatientDocument, PatientVital, User,
)
from ..schemas.appointment import AppointmentOut
from ..schemas.patient import (
    AllergyCreate, AllergyOut, DocumentOut, FamilyMemberCreate, FamilyMemberOut,
    FamilyMemberUpdate, MedicalHistoryCreate, MedicalHistoryOut,
    MedicalHistoryUpdate, PatientCreate, PatientDetail, PatientOut, PatientUpdate,
    VitalsCreate, VitalsOut,
)
from ..services import audit, uhid as uhid_service, vitals as vitals_service

router = APIRouter(tags=["patients"])

_UPLOAD_ROOT = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


def _patient(db: Session, patient_id: int) -> Patient:
    p = db.get(Patient, patient_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Patient not found")
    return p


def _assert_access(db: Session, me: User, patient: Patient) -> None:
    """PATIENT users are confined to their own record. Staff may access a patient
    anchored to their hospital OR any global patient who has booked an appointment
    there (so a clinic can open the history of someone who visited them)."""
    role = me.role.name if me.role else None
    if role == "PATIENT":
        if patient.user_id != me.user_id:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your patient record")
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


def _fresh_uhid(db: Session) -> str:
    try:
        return uhid_service.allocate(db)
    except RuntimeError:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, "Could not allocate a UHID")


def _at_hospital(hospital_id: int):
    """A clinic 'sees' a patient if they are anchored to it OR have booked an
    appointment there. Patients self-register as 'global' (anchored to one
    default tenant) but may book at any clinic — without this, such a patient
    would never appear in the list of the clinic they actually visited."""
    booked_here = select(Appointment.patient_id).where(Appointment.hospital_id == hospital_id)
    return or_(Patient.hospital_id == hospital_id, Patient.patient_id.in_(booked_here))


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
            stmt = stmt.where(_at_hospital(hospital_id))
    else:
        stmt = stmt.where(_at_hospital(me.hospital_id))
    if search:
        like = f"%{search}%"
        conds = [Patient.name.ilike(like), Patient.phone.ilike(like)]
        norm = uhid_service.normalise(search)
        if norm:
            conds.append(Patient.uhid == norm)
        stmt = stmt.where(or_(*conds))
    # Newest first, so a just-registered patient is visible on page 1 immediately.
    return db.scalars(stmt.order_by(Patient.patient_id.desc()).offset((page - 1) * size).limit(size)).all()


@router.get("/patients/search", response_model=list[PatientOut])
def search_patients(q: str = Query(..., min_length=1), me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    """Front-desk lookup: matches name, phone OR UHID. One phone shared by a
    family returns several rows — the caller shows a pick list."""
    like = f"%{q}%"
    conditions = [Patient.name.ilike(like), Patient.phone.ilike(like)]
    norm = uhid_service.normalise(q)
    if norm:
        conditions.append(Patient.uhid == norm)
    stmt = select(Patient).where(or_(*conditions))
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        stmt = stmt.where(_at_hospital(me.hospital_id))
    return db.scalars(stmt.order_by(Patient.name).limit(50)).all()


@router.get("/patients/by-uhid/{code}", response_model=PatientDetail)
def get_patient_by_uhid(code: str, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    """Exact UHID resolution for a typed card code. The check digit is verified
    first so an obviously-mistyped code is rejected before any lookup."""
    if not uhid_service.is_valid(code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid UHID — please re-check the code")
    p = db.scalar(select(Patient).where(Patient.uhid == uhid_service.normalise(code)))
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No patient with this UHID")
    _assert_access(db, me, p)
    return p


@router.post("/patients", response_model=PatientOut, status_code=201)
def create_patient(body: PatientCreate, me: User = Depends(require_permission("patient", "create")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, body.hospital_id)
    if not db.get(Hospital, body.hospital_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid hospital_id")
    if db.scalar(select(Patient).where(Patient.hospital_id == body.hospital_id, Patient.phone == body.phone)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Patient with this phone already exists at this hospital")
    p = Patient(**body.model_dump(), uhid=_fresh_uhid(db))
    db.add(p)
    audit.log_activity(db, me.user_id, "patient.create", "patient")
    db.commit()
    db.refresh(p)
    return p


@router.get("/patients/{patient_id}", response_model=PatientDetail)
def get_patient(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(db, me, p)
    return p


@router.put("/patients/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: int, body: PatientUpdate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(db, me, p)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p


@router.post("/patients/{patient_id}/photo", response_model=PatientOut)
def upload_patient_photo(
    patient_id: int,
    file: UploadFile = File(...),
    me: User = Depends(require_permission("patient", "update")),
    db: Session = Depends(get_db),
):
    """Set/replace the patient's profile photo. Stored locally like documents
    (swap _save_upload for S3 in production)."""
    p = _patient(db, patient_id)
    _assert_access(db, me, p)
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Please upload an image file")
    url, _ = _save_upload(patient_id, file)
    p.photo_url = url
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
    _assert_access(db, me, p)
    return p.family_members


@router.post("/family-members", response_model=FamilyMemberOut, status_code=201)
def add_family(body: FamilyMemberCreate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    p = _patient(db, body.patient_id)
    _assert_access(db, me, p)
    # A patient may carry at most 5 dependents (active ones).
    if sum(1 for fm in p.family_members if fm.is_active) >= 5:
        raise HTTPException(status.HTTP_409_CONFLICT, "You can add up to 5 family members")
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
    _assert_access(db, me, m.patient)
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
    _assert_access(db, me, m.patient)
    db.delete(m)
    db.commit()
    return {"message": "Family member removed"}


# ================================================ Medical history ===========
@router.get("/patients/{patient_id}/medical-history", response_model=list[MedicalHistoryOut])
def list_history(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(db, me, p)
    return p.medical_history


@router.post("/medical-history", response_model=MedicalHistoryOut, status_code=201)
def add_history(body: MedicalHistoryCreate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    p = _patient(db, body.patient_id)
    _assert_access(db, me, p)
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
    _assert_access(db, me, h.patient)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(h, k, v)
    db.commit()
    db.refresh(h)
    return h


# ===================================================== Allergies ============
@router.get("/patients/{patient_id}/allergies", response_model=list[AllergyOut])
def list_allergies(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(db, me, p)
    return p.allergies


@router.post("/allergies", response_model=AllergyOut, status_code=201)
def add_allergy(body: AllergyCreate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    p = _patient(db, body.patient_id)
    _assert_access(db, me, p)
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
    _assert_access(db, me, a.patient)
    db.delete(a)
    db.commit()
    return {"message": "Allergy removed"}


# ===================================================== Documents ============
@router.get("/patients/{patient_id}/documents", response_model=list[DocumentOut])
def list_documents(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    p = _patient(db, patient_id)
    _assert_access(db, me, p)
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
    _assert_access(db, me, p)
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
    _assert_access(db, me, d.patient)
    db.delete(d)
    db.commit()
    return {"message": "Document deleted"}


# =================================================== Vitals =================
def _vital_out(db: Session, v: PatientVital) -> VitalsOut:
    """Serialise a vital with its derived BMI / abnormal flags and recorder name."""
    out = VitalsOut.model_validate(v)
    ev = vitals_service.evaluate(v)
    out.bmi, out.flags, out.abnormal = ev["bmi"], ev["flags"], ev["abnormal"]
    if v.recorded_by:
        u = db.get(User, v.recorded_by)
        out.recorded_by_name = u.name if u else None
    if v.family_member_id:
        fm = db.get(FamilyMember, v.family_member_id)
        out.family_member_name = fm.name if fm else None
    return out


@router.get("/vitals/recent", response_model=list[VitalsOut])
def recent_vitals(limit: int = Query(50, ge=1, le=200), me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    """The clinic's vitals log — most recent readings recorded by this hospital's
    staff, newest first, each tagged with the patient's name/UHID. Powers the
    receptionist 'Vitals & Measurements' page."""
    staff_ids = select(User.user_id).where(User.hospital_id == me.hospital_id)
    rows = db.scalars(
        select(PatientVital).where(PatientVital.recorded_by.in_(staff_ids))
        .order_by(PatientVital.recorded_at.desc()).limit(limit)
    ).all()
    out = []
    for v in rows:
        o = _vital_out(db, v)
        p = db.get(Patient, v.patient_id)
        o.patient_name = p.name if p else None
        o.patient_uhid = p.uhid if p else None
        out.append(o)
    return out


@router.get("/patients/{patient_id}/vitals", response_model=list[VitalsOut])
def list_vitals(patient_id: int, me: User = Depends(require_permission("patient", "read")), db: Session = Depends(get_db)):
    """Vitals history for a patient, newest first (latest reading is index 0)."""
    p = _patient(db, patient_id)
    _assert_access(db, me, p)
    rows = db.scalars(
        select(PatientVital).where(PatientVital.patient_id == patient_id).order_by(PatientVital.recorded_at.desc())
    ).all()
    return [_vital_out(db, v) for v in rows]


@router.post("/vitals", response_model=VitalsOut, status_code=201)
def record_vitals(body: VitalsCreate, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    """Record a set of vitals (nurse/reception at check-in). At least one measure
    must be provided — an all-empty reading is rejected."""
    p = _patient(db, body.patient_id)
    _assert_access(db, me, p)
    data = body.model_dump()
    measures = ("bp_systolic", "bp_diastolic", "pulse", "temperature_f", "spo2",
                "respiratory_rate", "weight_kg", "height_cm", "blood_sugar")
    if not any(data.get(k) is not None for k in measures):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Enter at least one vital measurement")
    v = PatientVital(**data, recorded_by=me.user_id)
    db.add(v)
    db.commit()
    db.refresh(v)
    return _vital_out(db, v)


@router.delete("/vitals/{vital_id}")
def delete_vitals(vital_id: int, me: User = Depends(require_permission("patient", "update")), db: Session = Depends(get_db)):
    v = db.get(PatientVital, vital_id)
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Vitals record not found")
    _assert_access(db, me, v.patient)
    db.delete(v)
    db.commit()
    return {"message": "Vitals record deleted"}


# ============================================ Patient appointments ==========
@router.get("/patients/{patient_id}/appointments", response_model=list[AppointmentOut])
def patient_appointments(
    patient_id: int,
    status_filter: str | None = Query(None, alias="status"),
    me: User = Depends(require_permission("appointment", "read")),
    db: Session = Depends(get_db),
):
    p = _patient(db, patient_id)
    _assert_access(db, me, p)
    stmt = select(Appointment).where(Appointment.patient_id == patient_id)
    if status_filter:
        stmt = stmt.where(Appointment.status == status_filter)
    appts = db.scalars(stmt.order_by(Appointment.appointment_date.desc())).all()

    # Enrich each visit with the doctor seen and the clinic visited, so the
    # history reads "saw Dr X (Cardiology) at City Care" rather than bare ids.
    doc_ids = {a.doctor_id for a in appts}
    hosp_ids = {a.hospital_id for a in appts}
    fam_ids = {a.family_member_id for a in appts if a.family_member_id}
    doctors = {d.doctor_id: d for d in db.scalars(select(Doctor).where(Doctor.doctor_id.in_(doc_ids)))} if doc_ids else {}
    hospitals = {h.hospital_id: h for h in db.scalars(select(Hospital).where(Hospital.hospital_id.in_(hosp_ids)))} if hosp_ids else {}
    members = {m.member_id: m.name for m in db.scalars(select(FamilyMember).where(FamilyMember.member_id.in_(fam_ids)))} if fam_ids else {}
    for a in appts:
        d = doctors.get(a.doctor_id)
        a.doctor_name = d.name if d else None
        a.doctor_specialty = d.specialization if d else None
        h = hospitals.get(a.hospital_id)
        a.hospital_name = getattr(h, "name", None)
        if a.family_member_id:
            a.family_member_name = members.get(a.family_member_id)
    return appts
