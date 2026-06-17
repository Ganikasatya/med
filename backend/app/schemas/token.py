"""Schemas for Module 7 — Token Engine."""
from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


# ---- requests ----
class GenerateTokenRequest(BaseModel):
    appointment_id: int
    priority: Literal["normal", "urgent", "emergency"] = "normal"


class TokenIdRequest(BaseModel):
    token_id: int


class RecallRequest(BaseModel):
    token_id: int
    recall_method: Literal["sms", "display", "manual", "pa_announcement"] = "display"


class CancelTokenRequest(BaseModel):
    token_id: int
    reason: str = ""


class SkipRequest(BaseModel):
    token_id: int
    reason: str = ""


class PriorityRequest(BaseModel):
    new_priority: Literal["normal", "urgent", "emergency"]
    reason: str = ""


class ReorderRequest(BaseModel):
    doctor_id: int
    token_ids: List[int] = Field(..., min_length=1)


class BulkCancelRequest(BaseModel):
    doctor_id: int
    date: Optional[date] = None
    reason: str = ""


class NotifyRequest(BaseModel):
    token_id: int
    message_type: str = "general"


class EmergencyCreate(BaseModel):
    doctor_id: int
    condition_description: str = ""
    priority: Literal["urgent", "emergency", "critical"] = "emergency"
    patient_id: Optional[int] = None
    patient_name: str = ""
    patient_phone: Optional[str] = None


# ---- responses ----
class TokenOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    token_id: int
    appointment_id: Optional[int] = None
    doctor_id: int
    affiliation_id: Optional[int] = None
    patient_id: Optional[int] = None
    hospital_id: int
    token_number: int
    display_code: str
    token_date: date
    status: str
    priority: str
    queue_position: int
    estimated_time: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    wait_duration_mins: Optional[int] = None
    consult_duration_mins: Optional[int] = None
    is_walkin: bool
    origin_lat: Optional[float] = None
    origin_lng: Optional[float] = None
    origin_label: str = ""
    travel_minutes: Optional[int] = None
    notified_leave: bool = False


class EstimateOut(BaseModel):
    token_id: int
    # Token identity (so the patient UI can render it without the queue endpoint).
    display_code: str = ""
    token_number: int = 0
    token_date: Optional[date] = None
    status: str = ""
    # Live queue context.
    queue_position: int
    total_waiting: int = 0
    now_serving: Optional[str] = None
    avg_consult_min: int
    delay_min: int
    wait_min: int
    estimated_time: Optional[datetime] = None
    # Travel / leave-by hints — null unless a travel time is known for the token.
    travel_min: Optional[int] = None
    origin_label: Optional[str] = None
    leave_by: Optional[datetime] = None
    remind_at: Optional[datetime] = None
    should_leave_now: bool = False


class TokenStatusHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    history_id: int
    old_status: Optional[str] = None
    new_status: str
    changed_by: Optional[int] = None
    reason: str
    changed_at: datetime


class MovementLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    log_id: int
    action: str
    from_position: Optional[int] = None
    to_position: Optional[int] = None
    notes: str
    logged_at: datetime


class EmergencyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    emergency_id: int
    hospital_id: int
    doctor_id: int
    patient_id: Optional[int] = None
    token_id: Optional[int] = None
    patient_name: str
    patient_phone: Optional[str] = None
    condition_description: str
    priority: str
    status: str
    created_at: datetime
