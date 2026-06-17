"""
Module 8 — Notification endpoints (15 APIs).

Send per channel (sms/whatsapp/email/push) + bulk, browse history + per-channel
delivery logs, stats, templates, and per-hospital channel settings. Dispatch is
the mocked provider (services/notifications.py) — records + lifecycle are real.
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import ensure_same_tenant, require_permission
from ..models import (
    Appointment, DoctorAffiliation, EmailLog, Hospital, HospitalSettings,
    Notification, Patient, SmsLog, Token, WhatsappLog, User,
)
from ..rbac import ROLE_PATIENT, is_clinic_staff
from ..schemas.notification import (
    EmailLogOut, EmailSend, NotificationOut, NotificationSettings,
    NotificationTest, PushBulk, PushSend, SmsBulk, SmsLogOut, SmsSend,
    WhatsappLogOut, WhatsappSend,
)
from ..services import notifications as notify

router = APIRouter(tags=["notifications"])


def _tenant(me: User, hospital_id: int | None) -> int | None:
    """Resolve the hospital to attribute a notification to, with tenant guard."""
    if hospital_id is not None:
        ensure_same_tenant(me, hospital_id)
        return hospital_id
    return me.hospital_id


def _hide_personal_notifications(stmt, me: User):
    """Clinic staff must not see notifications tied to a doctor's personal practice
    (e.g. a travel-alert SMS carrying the patient's phone + message). A notification
    is personal when its token OR appointment belongs to an unmanaged affiliation.
    Standalone notifications (no token/appointment) are clinic-originated → kept.
    Requires `Notification` to be selectable in `stmt` (entity or joined)."""
    if not is_clinic_staff(me.role.name if me.role else None):
        return stmt
    personal_aff = select(DoctorAffiliation.affiliation_id).where(
        DoctorAffiliation.managed_by_hospital.is_(False)
    )
    personal_tokens = select(Token.token_id).where(Token.affiliation_id.in_(personal_aff))
    personal_appts = select(Appointment.appointment_id).where(Appointment.affiliation_id.in_(personal_aff))
    return stmt.where(
        or_(Notification.token_id.is_(None), Notification.token_id.not_in(personal_tokens)),
        or_(Notification.appointment_id.is_(None), Notification.appointment_id.not_in(personal_appts)),
    )


def _notification_is_personal(db: Session, n: Notification) -> bool:
    """Whether a single notification belongs to a doctor's personal practice."""
    aff_id = None
    if n.token_id:
        t = db.get(Token, n.token_id)
        aff_id = t.affiliation_id if t else None
    if aff_id is None and n.appointment_id:
        a = db.get(Appointment, n.appointment_id)
        aff_id = a.affiliation_id if a else None
    if aff_id is None:
        return False
    aff = db.get(DoctorAffiliation, aff_id)
    return bool(aff and not aff.managed_by_hospital)


# ===================================================== Send =================
@router.post("/sms/send", response_model=NotificationOut, status_code=201)
def sms_send(body: SmsSend, me: User = Depends(require_permission("notification", "create")), db: Session = Depends(get_db)):
    n = notify.send_sms(db, body.phone, body.message, ntype=body.type, title=body.title,
                        template_id=body.template_id, hospital_id=_tenant(me, body.hospital_id),
                        patient_id=body.patient_id)
    db.commit()
    db.refresh(n)
    return n


@router.post("/sms/bulk")
def sms_bulk(body: SmsBulk, me: User = Depends(require_permission("notification", "create")), db: Session = Depends(get_db)):
    hid = _tenant(me, body.hospital_id)
    count = 0
    for phone in body.phones:
        notify.send_sms(db, phone, body.message, ntype=body.type, hospital_id=hid)
        count += 1
    db.commit()
    return {"sent": count, "channel": "sms"}


@router.post("/whatsapp/send", response_model=NotificationOut, status_code=201)
def whatsapp_send(body: WhatsappSend, me: User = Depends(require_permission("notification", "create")), db: Session = Depends(get_db)):
    n = notify.send_whatsapp(db, body.phone, body.message, ntype=body.type,
                             template_name=body.template_name, hospital_id=_tenant(me, body.hospital_id),
                             patient_id=body.patient_id)
    db.commit()
    db.refresh(n)
    return n


@router.post("/email/send", response_model=NotificationOut, status_code=201)
def email_send(body: EmailSend, me: User = Depends(require_permission("notification", "create")), db: Session = Depends(get_db)):
    n = notify.send_email(db, body.to, body.subject, body.body, hospital_id=_tenant(me, body.hospital_id),
                          patient_id=body.patient_id)
    db.commit()
    db.refresh(n)
    return n


@router.post("/push/send", response_model=NotificationOut, status_code=201)
def push_send(body: PushSend, me: User = Depends(require_permission("notification", "create")), db: Session = Depends(get_db)):
    n = notify.send_push(db, body.device_token, body.title, body.body, platform=body.platform,
                         payload=body.payload, hospital_id=_tenant(me, body.hospital_id),
                         patient_id=body.patient_id)
    db.commit()
    db.refresh(n)
    return n


@router.post("/push/bulk")
def push_bulk(body: PushBulk, me: User = Depends(require_permission("notification", "create")), db: Session = Depends(get_db)):
    hid = _tenant(me, body.hospital_id)
    count = 0
    for pid in body.patient_ids:
        # Real impl resolves registered device tokens; mock addresses by patient.
        notify.send_push(db, f"patient:{pid}", body.title, body.body, hospital_id=hid, patient_id=pid)
        count += 1
    db.commit()
    return {"sent": count, "channel": "push"}


# ===================================================== Read ================
@router.get("/notification-history", response_model=list[NotificationOut])
def notification_history(
    patient_id: int | None = Query(None),
    channel: str | None = Query(None),
    type: str | None = Query(None),
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    me: User = Depends(require_permission("notification", "read")),
    db: Session = Depends(get_db),
):
    stmt = select(Notification)
    role = me.role.name if me.role else None
    if role == ROLE_PATIENT:
        own_patient_ids = [
            p.patient_id
            for p in db.scalars(select(Patient).where(Patient.user_id == me.user_id)).all()
        ]
        if patient_id:
            if patient_id not in own_patient_ids:
                raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your notifications")
            own_patient_ids = [patient_id]
        if not own_patient_ids:
            return []
        stmt = stmt.where(Notification.patient_id.in_(own_patient_ids))
    elif role != "SUPER_ADMIN":
        stmt = stmt.where(Notification.hospital_id == me.hospital_id)
    if patient_id and role != ROLE_PATIENT:
        stmt = stmt.where(Notification.patient_id == patient_id)
    if channel:
        stmt = stmt.where(Notification.channel == channel)
    if type:
        stmt = stmt.where(Notification.type == type)
    stmt = _hide_personal_notifications(stmt, me)
    return db.scalars(stmt.order_by(Notification.notification_id.desc()).offset((page - 1) * size).limit(size)).all()


@router.get("/notifications/{notification_id}", response_model=NotificationOut)
def get_notification(notification_id: int, me: User = Depends(require_permission("notification", "read")), db: Session = Depends(get_db)):
    n = db.get(Notification, notification_id)
    if not n:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    if n.hospital_id is not None:
        ensure_same_tenant(me, n.hospital_id)
    if is_clinic_staff(me.role.name if me.role else None) and _notification_is_personal(db, n):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Notification not found")
    return n


@router.get("/sms-logs", response_model=list[SmsLogOut])
def sms_logs(status_filter: str | None = Query(None, alias="status"), me: User = Depends(require_permission("notification", "read")), db: Session = Depends(get_db)):
    stmt = select(SmsLog).join(Notification, Notification.notification_id == SmsLog.notification_id)
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        stmt = stmt.where(Notification.hospital_id == me.hospital_id)
    if status_filter:
        stmt = stmt.where(SmsLog.status == status_filter)
    stmt = _hide_personal_notifications(stmt, me)
    return db.scalars(stmt.order_by(SmsLog.sms_id.desc())).all()


@router.get("/whatsapp-logs", response_model=list[WhatsappLogOut])
def whatsapp_logs(me: User = Depends(require_permission("notification", "read")), db: Session = Depends(get_db)):
    stmt = select(WhatsappLog).join(Notification, Notification.notification_id == WhatsappLog.notification_id)
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        stmt = stmt.where(Notification.hospital_id == me.hospital_id)
    stmt = _hide_personal_notifications(stmt, me)
    return db.scalars(stmt.order_by(WhatsappLog.wa_id.desc())).all()


@router.get("/email-logs", response_model=list[EmailLogOut])
def email_logs(me: User = Depends(require_permission("notification", "read")), db: Session = Depends(get_db)):
    stmt = select(EmailLog).join(Notification, Notification.notification_id == EmailLog.notification_id)
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        stmt = stmt.where(Notification.hospital_id == me.hospital_id)
    stmt = _hide_personal_notifications(stmt, me)
    return db.scalars(stmt.order_by(EmailLog.email_id.desc())).all()


@router.get("/notification-stats")
def notification_stats(hospital_id: int | None = Query(None), me: User = Depends(require_permission("notification", "read")), db: Session = Depends(get_db)):
    stmt = select(Notification.channel, Notification.status, func.count(Notification.notification_id))
    if not (me.role and me.role.name == "SUPER_ADMIN"):
        stmt = stmt.where(Notification.hospital_id == me.hospital_id)
    elif hospital_id:
        stmt = stmt.where(Notification.hospital_id == hospital_id)
    stmt = _hide_personal_notifications(stmt, me)
    rows = db.execute(stmt.group_by(Notification.channel, Notification.status)).all()
    by_channel: dict = {}
    total = 0
    for channel, st, cnt in rows:
        by_channel.setdefault(channel, {})[st] = cnt
        total += cnt
    return {"total": total, "by_channel": by_channel}


@router.get("/notification-templates")
def notification_templates(me: User = Depends(require_permission("notification", "read"))):
    return {"templates": notify.TEMPLATES}


# ===================================================== Config / test =======
@router.post("/notification-settings")
def notification_settings(body: NotificationSettings, me: User = Depends(require_permission("notification", "create")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, body.hospital_id)
    h = db.get(Hospital, body.hospital_id)
    if not h:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Hospital not found")
    if not h.settings:
        h.settings = HospitalSettings(hospital_id=body.hospital_id)
        db.flush()
    if body.sms_enabled is not None:
        h.settings.sms_enabled = body.sms_enabled
    if body.whatsapp_enabled is not None:
        h.settings.whatsapp_enabled = body.whatsapp_enabled
    db.commit()
    return {"hospital_id": body.hospital_id, "sms_enabled": h.settings.sms_enabled, "whatsapp_enabled": h.settings.whatsapp_enabled}


@router.post("/notification-test")
def notification_test(body: NotificationTest, me: User = Depends(require_permission("notification", "create")), db: Session = Depends(get_db)):
    hid = me.hospital_id
    if body.channel == "sms":
        n = notify.send_sms(db, body.phone or "9999999999", "Test SMS from RuralOP", ntype="general", hospital_id=hid)
    elif body.channel == "whatsapp":
        n = notify.send_whatsapp(db, body.phone or "9999999999", "Test WhatsApp from RuralOP", hospital_id=hid)
    elif body.channel == "email":
        n = notify.send_email(db, body.email or "test@example.com", "Test", "Test email from RuralOP", hospital_id=hid)
    else:
        n = notify.send_push(db, "test-device", "Test", "Test push from RuralOP", hospital_id=hid)
    db.commit()
    return {"ok": True, "channel": body.channel, "notification_id": n.notification_id, "status": n.status}
