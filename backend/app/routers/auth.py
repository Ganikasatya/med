"""
Module 1 — Authentication endpoints.

login / logout / refresh (rotating refresh tokens) / change-password /
forgot-password / reset-password / verify-email / register (public patient).
Passwords are bcrypt-hashed; access tokens are short-lived JWTs, refresh tokens
are opaque and stored only as SHA-256 hashes.
"""
import re

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db, utcnow
from ..deps import get_current_user
from ..models import (
    Department, Doctor, DoctorAffiliation, DoctorDocument, DoctorStatus,
    Hospital, HospitalSettings, Patient, RefreshToken, Role, User,
)
from ..rbac import ROLE_DOCTOR, ROLE_HOSPITAL_ADMIN, ROLE_PATIENT
from ..schemas.hospital import ClinicRegister
from ..schemas.security import (
    ChangePasswordRequest, ForgotPasswordRequest, LoginRequest, LoginResponse,
    OtpLogin, OtpRegister, OtpRequest, RefreshRequest, RegisterRequest,
    ResetPasswordRequest, TokenPair, UserOut, VerifyEmailRequest,
)
from ..security import (
    create_access_token, create_purpose_token, decode_access_token,
    hash_password, hash_token, new_otp, new_refresh_token, refresh_expiry,
    verify_password,
)
from ..services import audit, normalize, otp_store, storage, uhid as uhid_service
from ..services import notifications as notify

router = APIRouter(prefix="/auth", tags=["auth"])

_PHONE_RE = re.compile(r"^\d{10}$")


def _issue_tokens(db: Session, user: User) -> TokenPair:
    access = create_access_token(subject=str(user.user_id), role=user.role.name if user.role else "")
    raw_refresh = new_refresh_token()
    db.add(RefreshToken(user_id=user.user_id, token_hash=hash_token(raw_refresh), expires_at=refresh_expiry()))
    return TokenPair(access_token=access, refresh_token=raw_refresh)


def _find_by_identifier(db: Session, ident: str) -> User | None:
    ident = ident.strip()
    if _PHONE_RE.match(ident):
        return db.scalar(select(User).where(User.phone == ident))
    return db.scalar(select(User).where(User.email == ident.lower())) or db.scalar(
        select(User).where(User.email == ident)
    )


@router.post("/login", response_model=LoginResponse)
def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = _find_by_identifier(db, body.identifier)
    ip = request.client.host if request.client else ""
    ua = request.headers.get("user-agent", "")

    if not user or not verify_password(body.password, user.password_hash):
        audit.log_login(db, user.user_id if user else None, ip, ua, "failed")
        db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials")
    if not user.is_active:
        hosp = db.get(Hospital, user.hospital_id) if user.hospital_id else None
        if hosp and hosp.status == "pending":
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Your clinic registration is pending approval.")
        if user.role and user.role.name == ROLE_DOCTOR:
            doc = db.scalar(select(Doctor).where(Doctor.user_id == user.user_id))
            if doc and doc.verification_status == "pending":
                raise HTTPException(status.HTTP_403_FORBIDDEN,
                                    "Your doctor registration is pending verification. "
                                    "You'll be notified once your documents are reviewed.")
            if doc and doc.verification_status == "rejected":
                raise HTTPException(status.HTTP_403_FORBIDDEN,
                                    f"Your registration was not approved. {doc.rejection_reason or ''}".strip())
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Account {user.status}")

    tokens = _issue_tokens(db, user)
    user.last_login_at = utcnow()
    audit.log_login(db, user.user_id, ip, ua, "success")
    audit.log_activity(db, user.user_id, "auth.login", "auth")
    db.commit()
    return LoginResponse(**tokens.model_dump(), user=UserOut.model_validate(user))


@router.post("/register", response_model=LoginResponse, status_code=201)
def register(body: RegisterRequest, db: Session = Depends(get_db)):
    """Public self-registration — always creates a PATIENT."""
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    if db.scalar(select(User).where(User.phone == body.phone)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Phone already registered")

    role = db.scalar(select(Role).where(Role.name == ROLE_PATIENT))
    if not role:
        raise HTTPException(500, "PATIENT role not seeded")

    # Self-registering patients don't pick a clinic. Anchor them to one tenant so
    # they can immediately book + view records: the explicit hospital_id if given,
    # else the first active hospital (single-tenant dev / demo default).
    hospital_id = body.hospital_id
    if hospital_id is None:
        default_hosp = db.scalar(
            select(Hospital).where(Hospital.is_active.is_(True)).order_by(Hospital.hospital_id)
        )
        hospital_id = default_hosp.hospital_id if default_hosp else None

    user = User(
        hospital_id=hospital_id, role_id=role.role_id, name=body.name,
        email=body.email, phone=body.phone, password_hash=hash_password(body.password),
    )
    db.add(user)
    db.flush()

    # Create the linked Patient record so the patient console has an identity to
    # hang appointments, records and tokens on.
    if hospital_id is not None:
        patient = Patient(
            hospital_id=hospital_id, user_id=user.user_id, name=body.name,
            phone=body.phone, email=body.email, city=body.city or "",
            abha_number=body.abha_number,
            is_registered=True, registration_source="app",
            uhid=uhid_service.allocate(db),
        )
        db.add(patient)
        db.flush()

    tokens = _issue_tokens(db, user)
    audit.log_activity(db, user.user_id, "auth.register", "auth")
    db.commit()
    db.refresh(user)
    return LoginResponse(**tokens.model_dump(), user=UserOut.model_validate(user))


def _default_hospital_id(db: Session, given: int | None) -> int | None:
    if given is not None:
        return given
    h = db.scalar(select(Hospital).where(Hospital.is_active.is_(True)).order_by(Hospital.hospital_id))
    return h.hospital_id if h else None


def _otp_key(phone: str) -> str:
    return f"otp:{phone.strip()}"


# ---- Mobile-OTP auth (patient self-service). DEMO mode: the OTP is returned in
# the response (`dev_otp`) instead of being sent over SMS. Swap otp_store.put for
# a real SMS gateway call to go live. ------------------------------------------
_STAFF_PHONE_MSG = "This number belongs to a staff account. Please use the clinic/staff login."


@router.post("/otp/request")
def otp_request(body: OtpRequest, db: Session = Depends(get_db)):
    phone = body.phone.strip()
    otp = new_otp()
    otp_store.put(_otp_key(phone), otp)
    existing = db.scalar(select(User).where(User.phone == phone))
    role_name = existing.role.name if (existing and existing.role) else None
    return {
        "message": "OTP sent",
        # Mobile-OTP is a PATIENT-only flow. registered = a patient with this phone.
        "registered": role_name == ROLE_PATIENT,
        "is_staff": existing is not None and role_name != ROLE_PATIENT,
        "dev_otp": otp,
    }


@router.post("/otp/login", response_model=LoginResponse)
def otp_login(body: OtpLogin, request: Request, db: Session = Depends(get_db)):
    phone = body.phone.strip()
    if not otp_store.verify(_otp_key(phone), body.otp.strip()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired OTP")
    user = db.scalar(select(User).where(User.phone == phone))
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This number isn't registered yet. Please sign up.")
    # Mobile-OTP login is for patients only — staff must use email + password.
    if user.role and user.role.name != ROLE_PATIENT:
        raise HTTPException(status.HTTP_403_FORBIDDEN, _STAFF_PHONE_MSG)
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Account {user.status}")
    tokens = _issue_tokens(db, user)
    user.last_login_at = utcnow()
    ip = request.client.host if request.client else ""
    audit.log_login(db, user.user_id, ip, request.headers.get("user-agent", ""), "success")
    audit.log_activity(db, user.user_id, "auth.login_otp", "auth")
    db.commit()
    return LoginResponse(**tokens.model_dump(), user=UserOut.model_validate(user))


@router.post("/otp/register", response_model=LoginResponse, status_code=201)
def otp_register(body: OtpRegister, db: Session = Depends(get_db)):
    """Create a PATIENT from just name + mobile, verified by OTP (no password/email)."""
    phone = body.phone.strip()
    if not otp_store.verify(_otp_key(phone), body.otp.strip()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired OTP")
    existing_user = db.scalar(select(User).where(User.phone == phone))
    if existing_user:
        if existing_user.role and existing_user.role.name == ROLE_PATIENT:
            raise HTTPException(status.HTTP_409_CONFLICT, "Phone already registered — please log in.")
        raise HTTPException(status.HTTP_403_FORBIDDEN, _STAFF_PHONE_MSG)
    role = db.scalar(select(Role).where(Role.name == ROLE_PATIENT))
    if not role:
        raise HTTPException(500, "PATIENT role not seeded")

    hospital_id = _default_hospital_id(db, None)
    # Voice registration transcribes name/city in the patient's own script
    # (Telugu/Hindi). Normalize to English before storing so records stay
    # uniformly English — name is transliterated, city snapped to a known
    # spelling. No-ops for text that is already Latin.
    known_cities = list(db.scalars(
        select(Hospital.city).where(Hospital.city != "").distinct()
    ))
    clean_name = normalize.to_english_name(body.name)
    clean_city = normalize.to_english_city(body.city or "", known_cities)
    # No email/password collected — synthesise a unique placeholder email and a
    # random password (the patient authenticates by OTP, never by password).
    synthetic_email = f"{phone}@mobile.tapcure.in"
    user = User(
        hospital_id=hospital_id, role_id=role.role_id, name=clean_name,
        email=synthetic_email, phone=phone, password_hash=hash_password(new_refresh_token()),
    )
    db.add(user)
    db.flush()

    if hospital_id is not None:
        # A walk-in desk may already hold a Patient row for this phone — link it
        # to the new account instead of violating the (hospital, phone) unique key.
        existing = db.scalar(
            select(Patient).where(Patient.hospital_id == hospital_id, Patient.phone == phone)
        )
        if existing:
            existing.user_id = user.user_id
            existing.is_registered = True
            if not existing.name:
                existing.name = clean_name
            if clean_city and not existing.city:
                existing.city = clean_city
            if body.abha_number and not existing.abha_number:
                existing.abha_number = body.abha_number
        else:
            db.add(Patient(
                hospital_id=hospital_id, user_id=user.user_id, name=clean_name,
                phone=phone, email=synthetic_email, city=clean_city,
                abha_number=body.abha_number,
                is_registered=True, registration_source="app",
                uhid=uhid_service.allocate(db),
            ))
        db.flush()

    tokens = _issue_tokens(db, user)
    audit.log_activity(db, user.user_id, "auth.register_otp", "auth")
    db.commit()
    db.refresh(user)
    return LoginResponse(**tokens.model_dump(), user=UserOut.model_validate(user))


def _unique_short_code(db: Session, name: str) -> str:
    initials = "".join(w[0] for w in name.upper().split() if w)[:6]
    alnum = "".join(ch for ch in name.upper() if ch.isalnum())[:6]
    base = (initials or alnum or "CLN")[:6]
    code, i = base, 1
    while db.scalar(select(Hospital).where(Hospital.short_code == code)):
        code = f"{base[:4]}{i}"
        i += 1
    return code


@router.post("/register-clinic", status_code=201)
def register_clinic(body: ClinicRegister, db: Session = Depends(get_db)):
    """Public clinic onboarding: creates a PENDING hospital + an INACTIVE owner
    admin. The account cannot log in until a Super Admin approves it."""
    if db.scalar(select(User).where(User.email == body.email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    if db.scalar(select(User).where(User.phone == body.phone)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Phone already registered")
    role = db.scalar(select(Role).where(Role.name == ROLE_HOSPITAL_ADMIN))
    if not role:
        raise HTTPException(500, "HOSPITAL_ADMIN role not seeded")

    short = _unique_short_code(db, body.clinic_name)
    hospital = Hospital(
        name=body.clinic_name, short_code=short,
        address=body.address or body.area, city=body.city, pincode=body.pincode or "",
        latitude=body.latitude, longitude=body.longitude,
        phone=body.phone, email=str(body.email), hfr_id=body.hfr_id,
        status="pending", is_active=False,
    )
    settings = HospitalSettings(token_prefix=short, consultation_duration=body.consultation_minutes)
    if body.open_time:
        settings.op_start_time = body.open_time
    if body.close_time:
        settings.op_end_time = body.close_time
    hospital.settings = settings
    hospital.departments = [Department(name="General OPD", code="OPD")]
    db.add(hospital)
    db.flush()

    admin = User(
        hospital_id=hospital.hospital_id, role_id=role.role_id, name=body.owner_name,
        email=body.email, phone=body.phone, password_hash=hash_password(body.password),
        status="inactive",  # activated on approval
    )
    db.add(admin)
    audit.log_activity(db, None, "clinic.register", "hospital", {"hospital_id": hospital.hospital_id})
    db.commit()
    return {
        "message": "Registration received. Your clinic is pending approval — "
                   "you'll be notified once it's approved.",
        "hospital_id": hospital.hospital_id,
        "status": "pending",
    }


_ALLOWED_DOC_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf",
}
_DOC_LABELS = {
    "registration_certificate": "Medical registration certificate",
    "degree_certificate": "Degree certificate",
    "council_certificate": "Medical council proof",
    "id_proof": "ID proof",
}


def _require_credential_file(upload: UploadFile) -> None:
    if (upload.content_type or "").lower() not in _ALLOWED_DOC_TYPES:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Upload a PDF or image (JPG/PNG) for credential documents",
        )


@router.post("/register-doctor", status_code=201)
def register_doctor(
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    password: str = Form(...),
    registration_number: str = Form(...),
    specialization: str = Form("General Physician"),
    qualification: str = Form(""),
    hpr_id: str | None = Form(None),
    experience_years: int = Form(0),
    consultation_fee: float = Form(0),
    city: str = Form(""),
    languages: str = Form(""),
    bio: str = Form(""),
    registration_certificate: UploadFile = File(...),
    degree_certificate: UploadFile = File(...),
    council_certificate: UploadFile | None = File(None),
    id_proof: UploadFile | None = File(None),
    db: Session = Depends(get_db),
):
    """Public solo-doctor onboarding: creates a PENDING, INACTIVE doctor with the
    uploaded credential documents. The account can't log in until a Super Admin
    verifies the documents. Clinic-onboarded doctors don't use this path."""
    email = email.strip().lower()
    phone = phone.strip()
    if not _PHONE_RE.match(phone):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Enter a valid 10-digit mobile number")
    if len(password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be at least 6 characters")
    if not registration_number.strip():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Medical council registration number is required")
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email already registered")
    if db.scalar(select(User).where(User.phone == phone)):
        raise HTTPException(status.HTTP_409_CONFLICT, "Phone already registered")

    # Validate every provided file up-front (before writing anything).
    files = [
        ("registration_certificate", registration_certificate),
        ("degree_certificate", degree_certificate),
    ]
    if council_certificate is not None:
        files.append(("council_certificate", council_certificate))
    if id_proof is not None:
        files.append(("id_proof", id_proof))
    for _, upload in files:
        _require_credential_file(upload)

    role = db.scalar(select(Role).where(Role.name == ROLE_DOCTOR))
    if not role:
        raise HTTPException(500, "DOCTOR role not seeded")

    # Solo doctors aren't tied to a clinic; anchor them to the default tenant
    # (like self-registering patients) but flag the practice as personal.
    hospital_id = _default_hospital_id(db, None)

    user = User(
        hospital_id=hospital_id, role_id=role.role_id, name=name.strip(),
        email=email, phone=phone, password_hash=hash_password(password),
        status="inactive",  # activated on verification
    )
    db.add(user)
    db.flush()

    doctor = Doctor(
        name=name.strip(), user_id=user.user_id, hospital_id=hospital_id,
        specialization=specialization, qualification=qualification,
        registration_number=registration_number.strip(),
        hpr_id=(hpr_id or "").strip() or None,
        experience_years=experience_years, consultation_fee=consultation_fee,
        bio=bio, languages=languages,
        status="inactive",  # operationally hidden until verified
        verification_status="pending", is_self_registered=True,
    )
    doctor.presence = DoctorStatus(status="off_duty")
    db.add(doctor)
    db.flush()

    # Personal-practice affiliation (not managed by any hospital).
    db.add(DoctorAffiliation(
        doctor_id=doctor.doctor_id, hospital_id=None, practice_type="personal_clinic",
        name=f"{name.strip()} — Personal Practice", city=city or "",
        consultation_fee=consultation_fee, managed_by_hospital=False, is_active=True,
    ))

    # Persist the uploaded credential documents.
    for doc_type, upload in files:
        url, size_kb = storage.save_upload("doctor_docs", doctor.doctor_id, upload)
        db.add(DoctorDocument(
            doctor_id=doctor.doctor_id, doc_type=doc_type,
            label=_DOC_LABELS.get(doc_type, doc_type), file_url=url, file_size_kb=size_kb,
        ))

    audit.log_activity(db, None, "doctor.register", "doctor", {"doctor_id": doctor.doctor_id})
    db.commit()
    return {
        "message": "Registration received. Your documents are pending verification — "
                   "you'll be notified once approved.",
        "doctor_id": doctor.doctor_id,
        "status": "pending",
    }


@router.post("/refresh", response_model=TokenPair)
def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    """Rotate: validate the presented refresh token, revoke it, issue a fresh pair."""
    th = hash_token(body.refresh_token)
    rt = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == th))
    if not rt or rt.revoked or rt.expires_at < utcnow():
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    user = db.get(User, rt.user_id)
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User inactive")
    rt.revoked = True  # rotation
    tokens = _issue_tokens(db, user)
    db.commit()
    return tokens


@router.post("/logout")
def logout(body: RefreshRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    rt = db.scalar(select(RefreshToken).where(RefreshToken.token_hash == hash_token(body.refresh_token)))
    if rt and rt.user_id == user.user_id:
        rt.revoked = True
    audit.log_activity(db, user.user_id, "auth.logout", "auth")
    db.commit()
    return {"message": "Logged out"}


@router.post("/change-password")
def change_password(
    body: ChangePasswordRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    if not verify_password(body.old_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Old password is incorrect")
    user.password_hash = hash_password(body.new_password)
    # Revoke all existing refresh tokens on password change.
    for rt in db.scalars(select(RefreshToken).where(RefreshToken.user_id == user.user_id, RefreshToken.revoked == False)):  # noqa: E712
        rt.revoked = True
    audit.log_activity(db, user.user_id, "auth.change_password", "auth")
    db.commit()
    return {"message": "Password updated"}


@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = _find_by_identifier(db, body.identifier)
    # Always respond the same way (don't leak which identifiers exist).
    if user:
        otp = new_otp()
        otp_store.put(body.identifier.strip().lower(), otp)
        # TODO(Phase 5): dispatch via SMS/email provider. For dev we return it.
        return {"message": "OTP sent", "dev_otp": otp}
    return {"message": "OTP sent"}


@router.post("/reset-password")
def reset_password(body: ResetPasswordRequest, db: Session = Depends(get_db)):
    if not otp_store.verify(body.identifier.strip().lower(), body.otp):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid or expired OTP")
    user = _find_by_identifier(db, body.identifier)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.password_hash = hash_password(body.new_password)
    audit.log_activity(db, user.user_id, "auth.reset_password", "auth")
    db.commit()
    return {"message": "Password reset successful"}


@router.post("/verify-email")
def verify_email(body: VerifyEmailRequest, db: Session = Depends(get_db)):
    payload = decode_access_token(body.token)
    if not payload or payload.get("type") != "verify_email":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid verification token")
    user = db.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    user.is_email_verified = True
    db.commit()
    return {"message": "Email verified"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)):
    return user


@router.post("/request-email-verification")
def request_email_verification(user: User = Depends(get_current_user)):
    """Issue an email-verification token (dev returns it; prod emails the link)."""
    token = create_purpose_token(str(user.user_id), "verify_email", minutes=60)
    return {"message": "Verification token issued", "dev_token": token}
