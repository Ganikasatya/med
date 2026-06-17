"""Schemas for Module 8 — Notification."""
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field

NType = Literal["booking", "reminder", "delay", "cancel", "recall", "travel_alert", "general"]


# ---- send requests ----
class SmsSend(BaseModel):
    phone: str = Field(..., pattern=r"^\d{10}$")
    message: str = Field(..., min_length=1)
    type: NType = "general"
    title: str = ""
    template_id: Optional[str] = None
    hospital_id: Optional[int] = None
    patient_id: Optional[int] = None


class SmsBulk(BaseModel):
    phones: List[str] = Field(..., min_length=1)
    message: str = Field(..., min_length=1)
    type: NType = "general"
    hospital_id: Optional[int] = None


class WhatsappSend(BaseModel):
    phone: str = Field(..., pattern=r"^\d{10}$")
    message: str = Field(..., min_length=1)
    template_name: Optional[str] = None
    type: NType = "general"
    hospital_id: Optional[int] = None
    patient_id: Optional[int] = None


class EmailSend(BaseModel):
    to: str
    subject: str = Field(..., min_length=1)
    body: str = ""
    hospital_id: Optional[int] = None
    patient_id: Optional[int] = None


class PushSend(BaseModel):
    device_token: str = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    body: str = ""
    platform: Literal["android", "ios", "web"] = "android"
    payload: Optional[dict] = None
    hospital_id: Optional[int] = None
    patient_id: Optional[int] = None


class PushBulk(BaseModel):
    patient_ids: List[int] = Field(..., min_length=1)
    title: str = Field(..., min_length=1)
    body: str = ""
    hospital_id: Optional[int] = None


class NotificationTest(BaseModel):
    channel: Literal["sms", "whatsapp", "email", "push"]
    phone: Optional[str] = None
    email: Optional[str] = None


class NotificationSettings(BaseModel):
    hospital_id: int
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None


# ---- read models ----
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    notification_id: int
    hospital_id: Optional[int] = None
    patient_id: Optional[int] = None
    appointment_id: Optional[int] = None
    token_id: Optional[int] = None
    type: str
    channel: str
    title: str
    message: str
    status: str
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    created_at: datetime


class SmsLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    sms_id: int
    notification_id: int
    phone: str
    provider: str
    provider_msg_id: Optional[str] = None
    status: str
    cost: float
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


class WhatsappLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    wa_id: int
    notification_id: int
    phone: str
    provider: str
    status: str
    cost: float
    sent_at: Optional[datetime] = None


class EmailLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    email_id: int
    notification_id: int
    to_email: str
    subject: str
    status: str
    sent_at: Optional[datetime] = None
