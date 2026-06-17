"""Schemas for Module 5 — Patient."""
from datetime import date
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

Gender = Literal["Male", "Female", "Other"]


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
    registration_source: Literal["app", "whatsapp", "csc", "walkin", "phone"] = "walkin"


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
    is_registered: Optional[bool] = None


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    patient_id: int
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
    is_registered: bool
    registration_source: str


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
