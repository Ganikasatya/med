"""
Module 1 — Authentication endpoints.

login / logout / refresh (rotating refresh tokens) / change-password /
forgot-password / reset-password / verify-email / register (public patient).
Passwords are bcrypt-hashed; access tokens are short-lived JWTs, refresh tokens
are opaque and stored only as SHA-256 hashes.
"""
import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db, utcnow
from ..deps import get_current_user
from ..models import Department, Hospital, HospitalSettings, Patient, RefreshToken, Role, User
from ..rbac import ROLE_HOSPITAL_ADMIN, ROLE_PATIENT
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
from ..services import audit, otp_store

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
            is_registered=True, registration_source="app",
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
    # No email/password collected — synthesise a unique placeholder email and a
    # random password (the patient authenticates by OTP, never by password).
    synthetic_email = f"{phone}@mobile.doctormitra.in"
    user = User(
        hospital_id=hospital_id, role_id=role.role_id, name=body.name,
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
                existing.name = body.name
            if body.city and not existing.city:
                existing.city = body.city
        else:
            db.add(Patient(
                hospital_id=hospital_id, user_id=user.user_id, name=body.name,
                phone=phone, email=synthetic_email, city=body.city or "",
                is_registered=True, registration_source="app",
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
        address=body.address or body.area, city=body.city,
        phone=body.phone, email=str(body.email),
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
