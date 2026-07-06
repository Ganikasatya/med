"""Schemas for Prescriptions."""
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PrescriptionItemIn(BaseModel):
    drug_name: str = Field(..., min_length=1)
    dosage: str = ""
    frequency: str = ""
    duration: str = ""
    instructions: str = ""


class PrescriptionItemOut(PrescriptionItemIn):
    model_config = ConfigDict(from_attributes=True)
    item_id: int


class PrescriptionCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    family_member_id: Optional[int] = None
    diagnosis: str = ""
    advice: str = ""
    follow_up_date: Optional[date] = None
    items: List[PrescriptionItemIn] = []


class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    prescription_id: int
    hospital_id: int
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    family_member_id: Optional[int] = None
    family_member_name: Optional[str] = None
    diagnosis: str
    advice: str
    follow_up_date: Optional[date] = None
    created_at: datetime
    items: List[PrescriptionItemOut] = []
    # Enriched for display (who wrote it / where / for whom).
    doctor_name: Optional[str] = None
    doctor_specialty: Optional[str] = None
    hospital_name: Optional[str] = None
    patient_name: Optional[str] = None
