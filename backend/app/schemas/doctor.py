"""Schemas for Module 3 — Doctor."""
from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

Weekday = Literal["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def _trim_to_none(v: Optional[str]) -> Optional[str]:
    """Normalize an optional free-form ID: trim whitespace, blank -> None.

    Used for HPR ID (ABDM). Formats vary across professional types, so we don't
    enforce a strict pattern — just store a clean value or nothing.
    """
    if v is None:
        return None
    s = str(v).strip()
    return s or None


# ---- Doctor ----
class DoctorCreate(BaseModel):
    name: str = ""
    user_id: Optional[int] = None
    hospital_id: int
    department_id: Optional[int] = None
    specialization: str = "General Physician"
    qualification: str = ""
    registration_number: Optional[str] = None
    hpr_id: Optional[str] = None
    experience_years: int = 0
    consultation_fee: Decimal = Decimal(0)
    bio: str = ""
    languages: str = ""

    _norm_hpr = field_validator("hpr_id")(_trim_to_none)


class DoctorOnboard(BaseModel):
    """Admin adds a doctor to their hospital, optionally creating a login."""
    name: str = Field(..., min_length=1)
    specialization: str = "General Physician"
    qualification: str = ""
    registration_number: Optional[str] = None
    hpr_id: Optional[str] = None
    experience_years: int = 0
    consultation_fee: Decimal = Decimal(0)
    department_id: Optional[int] = None
    languages: str = ""
    phone: Optional[str] = Field(None, pattern=r"^\d{10}$")

    _norm_hpr = field_validator("hpr_id")(_trim_to_none)
    # Optional doctor login (so the doctor can use the Doctor console).
    create_login: bool = False
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=6, max_length=128)


class DoctorUpdate(BaseModel):
    name: Optional[str] = None
    department_id: Optional[int] = None
    specialization: Optional[str] = None
    qualification: Optional[str] = None
    registration_number: Optional[str] = None
    hpr_id: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[Decimal] = None
    bio: Optional[str] = None
    profile_photo_url: Optional[str] = None
    languages: Optional[str] = None
    status: Optional[Literal["active", "inactive", "on_leave", "suspended"]] = None
    is_available_today: Optional[bool] = None

    _norm_hpr = field_validator("hpr_id")(_trim_to_none)


class DoctorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    doctor_id: int
    user_id: Optional[int] = None
    hospital_id: int
    department_id: Optional[int] = None
    name: str
    specialization: str
    qualification: str
    registration_number: Optional[str] = None
    hpr_id: Optional[str] = None
    experience_years: int
    consultation_fee: Decimal
    bio: str
    profile_photo_url: Optional[str] = None
    languages: str
    status: str
    is_available_today: bool
    verification_status: str = "verified"
    is_self_registered: bool = False


class DoctorDocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    document_id: int
    doc_type: str
    label: str
    file_url: str
    file_size_kb: int


class DoctorVerificationOut(DoctorOut):
    """Admin review payload: doctor + contact + uploaded credential documents."""
    email: Optional[str] = None
    phone: Optional[str] = None
    verified_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    documents: List[DoctorDocumentOut] = []


class AffiliationCreate(BaseModel):
    doctor_id: int
    hospital_id: Optional[int] = None
    practice_type: Literal["clinic", "personal_clinic", "home", "online"] = "clinic"
    name: str = Field(..., min_length=1)
    address: str = ""
    city: str = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    consultation_fee: Decimal = Decimal(0)
    mode: Literal["slot", "token"] = "slot"
    is_active: bool = True
    managed_by_hospital: bool = True


class AffiliationUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    consultation_fee: Optional[Decimal] = None
    mode: Optional[Literal["slot", "token"]] = None
    is_active: Optional[bool] = None


class AffiliationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    affiliation_id: int
    doctor_id: int
    hospital_id: Optional[int] = None
    practice_type: str
    name: str
    address: str
    city: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    consultation_fee: Decimal
    mode: str
    is_active: bool
    managed_by_hospital: bool


# ---- Schedule + breaks ----
class BreakCreate(BaseModel):
    schedule_id: int
    break_start: time
    break_end: time
    label: str = "Break"
    is_recurring: bool = True


class BreakOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    break_id: int
    schedule_id: int
    break_start: time
    break_end: time
    label: str
    is_recurring: bool


class ScheduleCreate(BaseModel):
    doctor_id: int
    affiliation_id: Optional[int] = None
    day_of_week: Weekday
    start_time: time
    end_time: time
    max_tokens: int = 40
    consultation_mins: int = 10
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class ScheduleUpdate(BaseModel):
    day_of_week: Optional[Weekday] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_tokens: Optional[int] = None
    consultation_mins: Optional[int] = None
    is_active: Optional[bool] = None
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None


class ScheduleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    schedule_id: int
    doctor_id: int
    affiliation_id: Optional[int] = None
    day_of_week: str
    start_time: time
    end_time: time
    max_tokens: int
    consultation_mins: int
    is_active: bool
    valid_from: Optional[date] = None
    valid_until: Optional[date] = None
    breaks: List[BreakOut] = []


class DoctorDetail(DoctorOut):
    schedules: List[ScheduleOut] = []


# ---- Holidays ----
class HolidayCreate(BaseModel):
    doctor_id: int
    holiday_date: date
    reason: str = ""
    is_full_day: bool = True
    partial_start: Optional[time] = None
    partial_end: Optional[time] = None


class HolidayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    holiday_id: int
    doctor_id: int
    holiday_date: date
    reason: str
    is_full_day: bool
    partial_start: Optional[time] = None
    partial_end: Optional[time] = None


# ---- Delay ----
class DelayCreate(BaseModel):
    doctor_id: int
    delay_minutes: int = Field(..., gt=0)
    reason: str = ""
    delay_date: Optional[date] = None  # defaults to today


class DelayOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    delay_id: int
    doctor_id: int
    delay_date: date
    delay_minutes: int
    reason: str
    notified_patients: bool


# ---- Leave ----
class LeaveCreate(BaseModel):
    doctor_id: int
    leave_from: date
    leave_to: date
    leave_type: Literal["casual", "sick", "conference", "maternity"] = "casual"
    reason: str = ""


class LeaveDecision(BaseModel):
    status: Literal["approved", "rejected", "cancelled"]
    rejection_reason: Optional[str] = None


class LeaveOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    leave_id: int
    doctor_id: int
    leave_from: date
    leave_to: date
    leave_type: str
    reason: str
    status: str
    approved_by: Optional[int] = None
    rejection_reason: Optional[str] = None


# ---- Presence status ----
class PresenceUpdate(BaseModel):
    status: Literal["available", "busy", "on_break", "away", "off_duty"]
    note: str = ""


class PresenceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    status_id: int
    doctor_id: int
    status: str
    note: str
    current_token_id: Optional[int] = None
    tokens_served_today: int
