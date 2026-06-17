"""
Notification dispatcher — MOCK provider (Phase 5).

Creates the logical Notification + the per-channel delivery log and walks them
through a realistic status lifecycle, but the actual provider call is simulated
(no MSG91/Twilio/SES network call). Each `send_*` returns the Notification row.

To go live later, replace the `_provider_send` stubs with real SDK calls — the
DB writes, status handling and public API stay identical.
"""
from uuid import uuid4

from sqlalchemy.orm import Session

from ..database import utcnow
from ..models import (
    EmailLog, Notification, PushNotification, SmsLog, WhatsappLog,
)

# Canned message templates exposed via GET /notification-templates.
TEMPLATES = [
    {"key": "booking", "channel": "sms", "title": "Appointment Confirmed",
     "body": "Hi {name}, your token {code} with Dr. {doctor} is confirmed for {date}."},
    {"key": "reminder", "channel": "sms", "title": "Appointment Reminder",
     "body": "Reminder: your appointment with Dr. {doctor} is today. Token {code}."},
    {"key": "delay", "channel": "sms", "title": "Doctor Delayed",
     "body": "Dr. {doctor} is running ~{minutes} min late. Your token {code} is still valid."},
    {"key": "recall", "channel": "sms", "title": "Your Turn",
     "body": "Token {code}: please proceed to {room}. Dr. {doctor} is ready."},
    {"key": "travel_alert", "channel": "sms", "title": "Time to Leave",
     "body": "Token {code}: ~{minutes} min to your turn. Please start for the clinic."},
    {"key": "cancel", "channel": "sms", "title": "Appointment Cancelled",
     "body": "Your appointment (token {code}) has been cancelled. {reason}"},
]


def _mock_id(channel: str) -> str:
    return f"mock_{channel}_{uuid4().hex[:16]}"


def _notification(db: Session, *, channel: str, ntype: str, title: str, message: str,
                  hospital_id=None, patient_id=None, appointment_id=None, token_id=None) -> Notification:
    n = Notification(
        hospital_id=hospital_id, patient_id=patient_id, appointment_id=appointment_id,
        token_id=token_id, type=ntype, channel=channel, title=title, message=message,
        status="sent", sent_at=utcnow(),
    )
    db.add(n)
    db.flush()
    return n


def send_sms(db: Session, phone: str, message: str, *, ntype: str = "general", title: str = "",
             template_id: str | None = None, **refs) -> Notification:
    n = _notification(db, channel="sms", ntype=ntype, title=title, message=message, **refs)
    n.sms_log = SmsLog(
        phone=phone, provider="mock", provider_msg_id=_mock_id("sms"), template_id=template_id,
        message_text=message, status="delivered", cost=0.20, sent_at=utcnow(), delivered_at=utcnow(),
    )
    n.delivered_at = utcnow()
    return n


def send_whatsapp(db: Session, phone: str, message: str, *, ntype: str = "general", title: str = "",
                  template_name: str | None = None, **refs) -> Notification:
    n = _notification(db, channel="whatsapp", ntype=ntype, title=title, message=message, **refs)
    n.whatsapp_log = WhatsappLog(
        phone=phone, provider="mock", provider_msg_id=_mock_id("wa"), template_name=template_name,
        status="delivered", cost=0.35, sent_at=utcnow(), delivered_at=utcnow(),
    )
    n.delivered_at = utcnow()
    return n


def send_email(db: Session, to_email: str, subject: str, body: str, *, ntype: str = "general", **refs) -> Notification:
    n = _notification(db, channel="email", ntype=ntype, title=subject, message=body, **refs)
    n.email_log = EmailLog(
        to_email=to_email, subject=subject, provider="mock", provider_msg_id=_mock_id("email"),
        status="sent", sent_at=utcnow(),
    )
    return n


def send_push(db: Session, device_token: str, title: str, body: str, *, platform: str = "android",
              payload: dict | None = None, ntype: str = "general", **refs) -> Notification:
    n = _notification(db, channel="push", ntype=ntype, title=title, message=body, **refs)
    n.push_log = PushNotification(
        device_token=device_token, platform=platform, title=title, body=body,
        data_payload=payload, status="sent", sent_at=utcnow(),
    )
    return n
