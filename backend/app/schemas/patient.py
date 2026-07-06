"""Schemas for Module 5 — Patient."""
from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

Gender = Literal["Male", "Female", "Other"]


def _normalize_abha_number(v: Optional[str]) -> Optional[str]:
    """Accept an ABHA number with or without spaces/hyphens; store digits-only.

    Optional — blank/None passes through as None. When given, it must be exactly
    14 digits (the ABHA number format), otherwise it's rejected with a clear
    message. Display formatting (XX-XXXX-XXXX-XXXX) is left to the UI.
    """
    if v is None:
        return None
    digits = "".join(ch for ch in str(v) if ch.isdigit())
    if digits == "":
        return None
    if len(digits) != 14:
        raise ValueError("ABHA number must be 14 digits")
    return digits


# ---- Patient ----
class PatientCreate(BaseModel):
    hospital_id: int
    name: str = Field(..., min_length=1, max_length=150)
    phone: str = Field(..., pattern=r"^\d{10}$")
    email: Optional[str] = None
    dob: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    blood_group: Optional[str] = None
    address: str = ""
    city: str = ""
    pincode: str = ""
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_language: str = "English"
    abha_number: Optional[str] = None
    abha_address: Optional[str] = None
    registration_source: Literal["app", "whatsapp", "csc", "walkin", "phone"] = "walkin"

    _norm_abha = field_validator("abha_number")(_normalize_abha_number)


class PatientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    dob: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[Gender] = None
    blood_group: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    pincode: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_language: Optional[str] = None
    abha_number: Optional[str] = None
    abha_address: Optional[str] = None
    is_registered: Optional[bool] = None

    _norm_abha = field_validator("abha_number")(_normalize_abha_number)


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    patient_id: int
    uhid: Optional[str] = None
    photo_url: Optional[str] = None
    hospital_id: int
    name: str
    phone: str
    email: Optional[str] = None
    dob: Optional[date] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    address: str
    city: str
    pincode: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    preferred_language: str
    abha_number: Optional[str] = None
    abha_address: Optional[str] = None
    is_registered: bool
    registration_source: str
    created_at: Optional[datetime] = None


# ---- Family members ----
class FamilyMemberCreate(BaseModel):
    patient_id: int
    name: str = Field(..., min_length=1)
    relation: str = ""
    phone: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[Gender] = None
    blood_group: Optional[str] = None


class FamilyMemberUpdate(BaseModel):
    name: Optional[str] = None
    relation: Optional[str] = None
    phone: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[Gender] = None
    blood_group: Optional[str] = None
    is_active: Optional[bool] = None


class FamilyMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    member_id: int
    patient_id: int
    name: str
    relation: str
    phone: Optional[str] = None
    dob: Optional[date] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None
    is_active: bool


# ---- Medical history ----
class MedicalHistoryCreate(BaseModel):
    patient_id: int
    condition: str = Field(..., min_length=1)
    icd_code: Optional[str] = None
    diagnosed_date: Optional[date] = None
    is_chronic: bool = False
    notes: str = ""


class MedicalHistoryUpdate(BaseModel):
    condition: Optional[str] = None
    icd_code: Optional[str] = None
    diagnosed_date: Optional[date] = None
    is_chronic: Optional[bool] = None
    notes: Optional[str] = None


class MedicalHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    history_id: int
    patient_id: int
    condition: str
    icd_code: Optional[str] = None
    diagnosed_date: Optional[date] = None
    is_chronic: bool
    notes: str


# ---- Allergies ----
class AllergyCreate(BaseModel):
    patient_id: int
    allergen: str = Field(..., min_length=1)
    allergy_type: Literal["drug", "food", "environmental", "other"] = "other"
    severity: Literal["Mild", "Moderate", "Severe", "Life-threatening"] = "Mild"
    reaction: str = ""


class AllergyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    allergy_id: int
    patient_id: int
    allergen: str
    allergy_type: str
    severity: str
    reaction: str
    is_active: bool


# ---- Vitals ----
SugarType = Literal["fasting", "random", "pp"]


class VitalsCreate(BaseModel):
    patient_id: int
    appointment_id: Optional[int] = None
    family_member_id: Optional[int] = None
    bp_systolic: Optional[int] = Field(None, ge=40, le=300)
    bp_diastolic: Optional[int] = Field(None, ge=20, le=200)
    pulse: Optional[int] = Field(None, ge=20, le=300)
    temperature_f: Optional[float] = Field(None, ge=85, le=115)
    spo2: Optional[int] = Field(None, ge=50, le=100)
    respiratory_rate: Optional[int] = Field(None, ge=4, le=80)
    weight_kg: Optional[float] = Field(None, ge=0.5, le=400)
    height_cm: Optional[float] = Field(None, ge=20, le=260)
    blood_sugar: Optional[int] = Field(None, ge=20, le=900)
    sugar_type: Optional[SugarType] = None
    notes: str = ""

    @field_validator("*")
    @classmethod
    def _blank_to_none(cls, v):
        return None if v == "" else v


class VitalsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    vital_id: int
    patient_id: int
    appointment_id: Optional[int] = None
    family_member_id: Optional[int] = None
    family_member_name: Optional[str] = None
    bp_systolic: Optional[int] = None
    bp_diastolic: Optional[int] = None
    pulse: Optional[int] = None
    temperature_f: Optional[float] = None
    spo2: Optional[int] = None
    respiratory_rate: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    blood_sugar: Optional[int] = None
    sugar_type: Optional[str] = None
    notes: str = ""
    recorded_at: datetime
    recorded_by_name: Optional[str] = None
    # Populated for clinic-wide lists (recent readings across patients).
    patient_name: Optional[str] = None
    patient_uhid: Optional[str] = None
    # Derived (filled by the router via services/vitals.evaluate).
    bmi: Optional[float] = None
    flags: dict = {}
    abnormal: bool = False


# ---- Documents ----
class DocumentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    document_id: int
    patient_id: int
    document_type: str
    file_name: str
    file_url: str
    file_size_kb: Optional[int] = None
    mime_type: Optional[str] = None
    appointment_id: Optional[int] = None


class PatientDetail(PatientOut):
    family_members: List[FamilyMemberOut] = []
    medical_history: List[MedicalHistoryOut] = []
    allergies: List[AllergyOut] = []
