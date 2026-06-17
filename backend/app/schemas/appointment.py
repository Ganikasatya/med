"""Schemas for Module 6 — Appointment."""
from datetime import date, datetime, time
from decimal import Decimal
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class AppointmentCreate(BaseModel):
    doctor_id: int
    affiliation_id: Optional[int] = None
    patient_id: int
    appointment_date: date
    slot_time: Optional[time] = None
    family_member_id: Optional[int] = None
    appointment_type: Literal["regular", "walkin", "emergency"] = "regular"
    notes: str = ""
    source: Literal["app", "whatsapp", "csc", "walkin", "phone"] = "app"
    # Travel origin for this visit (where the patient leaves FROM). Optional —
    # powers the leave-by / "time to leave" reminder. Either pass coordinates,
    # an explicit travel_minutes, or both.
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    origin_label: str = ""
    travel_minutes: Optional[int] = Field(None, ge=0, le=24 * 60)


class AppointmentUpdate(BaseModel):
    notes: Optional[str] = None
    appointment_type: Optional[Literal["regular", "walkin", "emergency"]] = None


class WalkInRequest(BaseModel):
    doctor_id: int
    affiliation_id: Optional[int] = None
    name: str = Field(..., min_length=1)
    phone: str = Field(..., pattern=r"^\d{10}$")
    notes: str = ""


class RescheduleRequest(BaseModel):
    appointment_id: int
    new_date: date
    new_time: Optional[time] = None
    reason: str = ""


class CancelRequest(BaseModel):
    appointment_id: int
    reason: str = ""


class FeedbackRequest(BaseModel):
    appointment_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: str = ""


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    appointment_id: int
    hospital_id: int
    doctor_id: int
    affiliation_id: Optional[int] = None
    practice_type: Optional[str] = None
    practice_name: Optional[str] = None
    managed_by_hospital: bool = True
    patient_id: int
    patient_name: Optional[str] = None
    family_member_id: Optional[int] = None
    appointment_date: date
    slot_time: Optional[time] = None
    appointment_type: str
    status: str
    consultation_fee: Decimal
    booking_fee_paid: Decimal
    notes: str
    source: str
    rating: Optional[int] = None
    feedback: Optional[str] = None
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    origin_label: str = ""
    travel_minutes: Optional[int] = None
    confirmed_at: Optional[datetime] = None
    created_at: datetime


class StatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    history_id: int
    old_status: Optional[str] = None
    new_status: str
    changed_by: Optional[int] = None
    reason: str
    changed_at: datetime


class RescheduleHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    reschedule_id: int
    old_date: Optional[date] = None
    old_time: Optional[time] = None
    new_date: Optional[date] = None
    new_time: Optional[time] = None
    reason: str
    created_at: datetime


class CancellationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    log_id: int
    appointment_id: int
    cancelled_by: Optional[int] = None
    cancel_reason: str
    refund_status: str
    refund_amount: Decimal
    created_at: datetime
