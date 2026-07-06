"""Schemas for Module 2 — Hospital & Department."""
from datetime import time
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


def _trim_to_none(v: Optional[str]) -> Optional[str]:
    """Normalize an optional free-form ID: trim whitespace, blank -> None.
    Used for HFR ID (ABDM Health Facility Registry); formats vary, so no strict
    pattern is enforced."""
    if v is None:
        return None
    s = str(v).strip()
    return s or None


# ---- Hospital ----
class HospitalCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    short_code: str = Field(..., min_length=1, max_length=20)
    address: str = ""
    city: str = ""
    state: str = ""
    pincode: str = ""
    phone: str = ""
    email: Optional[EmailStr] = None
    gstin: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class HospitalUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    logo_url: Optional[str] = None
    gstin: Optional[str] = None
    hfr_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_active: Optional[bool] = None

    _norm_hfr = field_validator("hfr_id")(_trim_to_none)


class HospitalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    hospital_id: int
    name: str
    short_code: str
    address: str
    city: str
    state: str
    pincode: str
    phone: str
    email: str
    logo_url: Optional[str] = None
    gstin: Optional[str] = None
    hfr_id: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: str
    is_active: bool


# ---- Public clinic self-registration (creates a PENDING hospital + owner admin) ----
class ClinicRegister(BaseModel):
    clinic_name: str = Field(..., min_length=1, max_length=150)
    clinic_type: str = ""
    registration_number: str = ""
    hfr_id: Optional[str] = None
    city: str = ""
    area: str = ""
    address: str = ""
    pincode: str = ""
    # Precise clinic coordinates from the Google Places picker (null when the
    # user typed a plain address without picking a suggestion).
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    owner_name: str = Field(..., min_length=1)
    phone: str = Field(..., pattern=r"^\d{10}$")
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    open_time: Optional[time] = None
    close_time: Optional[time] = None
    consultation_minutes: int = 10
    working_days: list[str] = []
    services: list[str] = []


class RejectRequest(BaseModel):
    reason: str = ""


# ---- Settings ----
class HospitalSettingsUpdate(BaseModel):
    op_start_time: Optional[time] = None
    op_end_time: Optional[time] = None
    lunch_start: Optional[time] = None
    lunch_end: Optional[time] = None
    token_prefix: Optional[str] = None
    booking_fee: Optional[Decimal] = None
    consultation_duration: Optional[int] = None
    max_advance_days: Optional[int] = None
    emergency_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    timezone: Optional[str] = None


class HospitalSettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    setting_id: int
    hospital_id: int
    op_start_time: Optional[time] = None
    op_end_time: Optional[time] = None
    lunch_start: Optional[time] = None
    lunch_end: Optional[time] = None
    token_prefix: str
    booking_fee: Decimal
    consultation_duration: int
    max_advance_days: int
    emergency_enabled: bool
    sms_enabled: bool
    whatsapp_enabled: bool
    timezone: str


class HospitalDetail(HospitalOut):
    settings: Optional[HospitalSettingsOut] = None


# ---- Department ----
class DepartmentCreate(BaseModel):
    hospital_id: int
    name: str = Field(..., min_length=1, max_length=100)
    code: str = ""
    description: str = ""
    floor: str = ""


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    floor: Optional[str] = None
    is_active: Optional[bool] = None


class DepartmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    department_id: int
    hospital_id: int
    name: str
    code: str
    description: str
    floor: str
    is_active: bool
