"""Schemas for Module 1 — Security & Auth."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from .patient import _normalize_abha_number


# ---- Tokens ----
class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ---- Auth flows ----
class LoginRequest(BaseModel):
    identifier: str = Field(..., min_length=1, description="email or 10-digit phone")
    password: str = Field(..., min_length=1)


class RegisterRequest(BaseModel):
    """Public self-registration (patients). Staff/doctors are created via /users."""
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str = Field(..., pattern=r"^\d{10}$")
    password: str = Field(..., min_length=6, max_length=128)
    hospital_id: Optional[int] = None
    city: Optional[str] = None
    abha_number: Optional[str] = None  # optional ABHA health ID (14 digits)

    _norm_abha = field_validator("abha_number")(_normalize_abha_number)


class ChangePasswordRequest(BaseModel):
    old_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6, max_length=128)


class ForgotPasswordRequest(BaseModel):
    identifier: str = Field(..., description="email or phone")


class ResetPasswordRequest(BaseModel):
    identifier: str
    otp: str = Field(..., min_length=4, max_length=8)
    new_password: str = Field(..., min_length=6, max_length=128)


class VerifyEmailRequest(BaseModel):
    token: str


# ---- Mobile-OTP auth (patient, demo OTP) ----
class OtpRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\d{10}$")


class OtpLogin(BaseModel):
    phone: str = Field(..., pattern=r"^\d{10}$")
    otp: str = Field(..., min_length=4, max_length=8)


class OtpRegister(BaseModel):
    phone: str = Field(..., pattern=r"^\d{10}$")
    otp: str = Field(..., min_length=4, max_length=8)
    name: str = Field(..., min_length=1, max_length=100)
    city: Optional[str] = None
    abha_number: Optional[str] = None  # optional ABHA health ID (14 digits)

    _norm_abha = field_validator("abha_number")(_normalize_abha_number)


# ---- Users ----
class UserBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r"^\d{10}$")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=128)
    role_id: int
    hospital_id: Optional[int] = None
    status: str = "active"


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\d{10}$")
    role_id: Optional[int] = None
    status: Optional[str] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    user_id: int
    hospital_id: Optional[int] = None
    role_id: int
    role_name: Optional[str] = None
    name: str
    email: EmailStr
    phone: Optional[str] = None
    is_email_verified: bool
    status: str
    last_login_at: Optional[datetime] = None
    created_at: datetime


class LoginResponse(TokenPair):
    user: UserOut


# ---- Roles / permissions ----
class PermissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    permission_id: int
    module: str
    action: str


class RoleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    role_id: int
    name: str
    description: str
    is_active: bool


class RoleWithPermissions(RoleOut):
    permissions: List[PermissionOut] = []


# ---- Audit views ----
class LoginHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    log_id: int
    user_id: Optional[int] = None
    ip_address: str
    user_agent: str
    status: str
    created_at: datetime


class ActivityLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    log_id: int
    user_id: Optional[int] = None
    action: str
    module: str
    meta: Optional[dict] = None
    created_at: datetime
