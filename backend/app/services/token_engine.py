"""
Token Engine core — the queue brain.

Pure-ish helpers the tokens router orchestrates: daily token numbering, the
patient-facing display code, queue-position recomputation (priority-aware),
live ETA, and the status/movement/recall audit writes.

ETA model:  estimated_time = now + (queue_position - 1) * avg_consult + active_delay
where active_delay is the sum of today's logged delays for the doctor.

Leave-by model:  the patient also carries a travel time (door → clinic). We work
*backwards* from the call ETA so they start their journey at the right moment:

    leave_by  = estimated_time - travel_minutes - ARRIVAL_BUFFER_MIN
    remind_at = leave_by - REMIND_BEFORE_MIN          (the "time to leave" alert)

travel_minutes is taken from the token if set (entered/derived at booking), else
computed from the origin + hospital coordinates via the haversine helper below.
"""
import math
from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import utcnow
from ..models import (
    Appointment, ApptStatusHistory, Doctor, DoctorAffiliation, DoctorDelayLog,
    Hospital, Token, TokenMovementLog, TokenRecallHistory, TokenStatusHistory,
)
from . import google_maps
from . import notifications as notify
from . import routing

PRIORITY_RANK = {"emergency": 0, "urgent": 1, "normal": 2}
_DEFAULT_CONSULT = 10

# Travel / leave-by tuning. AVG_SPEED + DETOUR turn straight-line distance into a
# road-ish travel time; the two buffers add safety margin around the call ETA.
AVG_SPEED_KMPH = 30.0       # assumed door-to-clinic speed
DETOUR_FACTOR = 1.3         # roads aren't straight lines — pad ~30%
ARRIVAL_BUFFER_MIN = 10     # aim to arrive this many minutes before being called
REMIND_BEFORE_MIN = 15      # fire the "time to leave" alert this long before leave_by


# ---- numbering / labels -----------------------------------------------------
def next_token_number(db: Session, doctor_id: int, token_date: date) -> int:
    current_max = db.scalar(
        select(func.max(Token.token_number)).where(
            Token.doctor_id == doctor_id, Token.token_date == token_date
        )
    )
    return (current_max or 0) + 1


def make_display_code(db: Session, hospital_id: int, number: int) -> str:
    hospital = db.get(Hospital, hospital_id)
    prefix = "OPD"
    if hospital:
        prefix = (hospital.settings.token_prefix if hospital.settings else None) or hospital.short_code or "OPD"
    return f"{prefix}-{number:03d}"


# ---- timing -----------------------------------------------------------------
def avg_consult_mins(doctor: Doctor, on_date: date, affiliation_id: int | None = None) -> int:
    from .scheduling import active_schedules
    scheds = active_schedules(doctor, on_date, affiliation_id)
    if scheds:
        return min(s.consultation_mins for s in scheds) or _DEFAULT_CONSULT
    return _DEFAULT_CONSULT


def active_delay_mins(db: Session, doctor_id: int, on_date: date) -> int:
    total = db.scalar(
        select(func.coalesce(func.sum(DoctorDelayLog.delay_minutes), 0)).where(
            DoctorDelayLog.doctor_id == doctor_id, DoctorDelayLog.delay_date == on_date
        )
    )
    return int(total or 0)


# ---- travel / leave-by ------------------------------------------------------
def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two lat/lng points, in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def travel_minutes_for(db: Session, token: Token) -> Optional[int]:
    """Door-to-clinic travel time for a token.

    Prefers the value stored on the token (entered/derived at booking). Falls
    back to a haversine estimate from the origin to the *booked practice
    location* — a doctor's personal clinic or home has its own coordinates, so
    we use those rather than the parent hospital; the hospital is only the
    fallback when the affiliation has no location set. Returns None when we have
    neither — the caller then omits the leave-by hints.
    """
    if token.travel_minutes is not None:
        return int(token.travel_minutes)
    if token.origin_lat is None or token.origin_lng is None:
        return None

    # Destination = the affiliation the patient actually chose, then hospital.
    dest_lat = dest_lng = None
    if token.affiliation_id is not None:
        aff = db.get(DoctorAffiliation, token.affiliation_id)
        if aff and aff.latitude is not None and aff.longitude is not None:
            dest_lat, dest_lng = aff.latitude, aff.longitude
    if dest_lat is None or dest_lng is None:
        hospital = db.get(Hospital, token.hospital_id)
        if hospital and hospital.latitude is not None and hospital.longitude is not None:
            dest_lat, dest_lng = hospital.latitude, hospital.longitude
    if dest_lat is None or dest_lng is None:
        return None

    # Prefer real road driving time, tried in order of accuracy:
    #   Google Distance Matrix (live traffic) → OpenRouteService → haversine.
    # Each provider fails open (returns None) when unconfigured/unreachable.
    o_lat, o_lng = float(token.origin_lat), float(token.origin_lng)
    d_lat, d_lng = float(dest_lat), float(dest_lng)
    road = (
        google_maps.driving_minutes(o_lat, o_lng, d_lat, d_lng)
        or routing.driving_minutes(o_lat, o_lng, d_lat, d_lng)
    )
    if road is not None:
        return road
    km = haversine_km(
        float(token.origin_lat), float(token.origin_lng),
        float(dest_lat), float(dest_lng),
    ) * DETOUR_FACTOR
    return max(1, round(km / AVG_SPEED_KMPH * 60))


# ---- queue ------------------------------------------------------------------
def _managed_only(stmt):
    """Restrict a Token query to hospital-managed practices — used to keep a
    doctor's *personal* practice tokens out of clinic-staff queue views. Tokens
    with no affiliation are legacy clinic tokens → kept."""
    return stmt.outerjoin(
        DoctorAffiliation, Token.affiliation_id == DoctorAffiliation.affiliation_id
    ).where(
        or_(
            Token.affiliation_id.is_(None),
            DoctorAffiliation.managed_by_hospital.is_(True),
        )
    )


def waiting_tokens(db: Session, doctor_id: int, on_date: date, affiliation_id: int | None = None,
                   managed_only: bool = False) -> list[Token]:
    stmt = select(Token).where(
        Token.doctor_id == doctor_id, Token.token_date == on_date, Token.status == "waiting"
    )
    if affiliation_id:
        stmt = stmt.where(Token.affiliation_id == affiliation_id)
    if managed_only:
        stmt = _managed_only(stmt)
    rows = db.scalars(stmt).all()
    return sorted(rows, key=lambda t: (PRIORITY_RANK.get(t.priority, 2), t.queue_position, t.token_number))


def current_token(db: Session, doctor_id: int, on_date: date, affiliation_id: int | None = None,
                  managed_only: bool = False) -> Optional[Token]:
    stmt = select(Token).where(
        Token.doctor_id == doctor_id, Token.token_date == on_date, Token.status == "current"
    )
    if affiliation_id:
        stmt = stmt.where(Token.affiliation_id == affiliation_id)
    if managed_only:
        stmt = _managed_only(stmt)
    return db.scalar(stmt)


def recompute_positions(db: Session, doctor_id: int, on_date: date, affiliation_id: int | None = None) -> list[Token]:
    """Re-number waiting tokens 1..N (priority floats up) and refresh ETAs."""
    ordered = waiting_tokens(db, doctor_id, on_date, affiliation_id)
    doctor = db.get(Doctor, doctor_id)
    avg = avg_consult_mins(doctor, on_date, affiliation_id) if doctor else _DEFAULT_CONSULT
    delay = active_delay_mins(db, doctor_id, on_date)
    base = utcnow()
    for i, t in enumerate(ordered, start=1):
        t.queue_position = i
        t.estimated_time = base + timedelta(minutes=(i - 1) * avg + delay)
        # As positions shift, anyone now within their leave window gets the alert.
        maybe_send_leave_alert(db, t)
    return ordered


def allocate_token(db: Session, appt, by: Optional[int], priority: str = "normal") -> Token:
    """Mint the queue token for an appointment (idempotent — returns the existing
    one if already allocated). Used by patient booking and the clinic generate API
    so a token exists the moment a visit is booked.
    """
    existing = db.scalar(select(Token).where(Token.appointment_id == appt.appointment_id))
    if existing:
        return existing
    number = next_token_number(db, appt.doctor_id, appt.appointment_date)
    token = Token(
        appointment_id=appt.appointment_id, doctor_id=appt.doctor_id, patient_id=appt.patient_id,
        affiliation_id=getattr(appt, "affiliation_id", None),
        hospital_id=appt.hospital_id, token_number=number,
        display_code=make_display_code(db, appt.hospital_id, number),
        token_date=appt.appointment_date, status="waiting", priority=priority,
        queue_position=9999, is_walkin=(appt.appointment_type == "walkin"),
        origin_lat=appt.origin_lat, origin_lng=appt.origin_lng,
        origin_label=appt.origin_label, travel_minutes=appt.travel_minutes,
    )
    db.add(token)
    db.flush()
    set_status(db, token, "waiting", by, "Token generated")
    log_movement(db, token, "generate", None, token.queue_position, by, "Generated")
    appt.status = "confirmed"
    appt.confirmed_at = utcnow()
    recompute_positions(db, appt.doctor_id, appt.appointment_date, token.affiliation_id)
    return token


def estimate(db: Session, token: Token) -> dict:
    """Complete patient-facing "my token" status: identity + live queue context +
    travel / leave-by. Live timing (ETA, leave-by) is computed only for *today's*
    queue; for a future date we return the token identity and let the UI show the
    booked slot time instead."""
    doctor = db.get(Doctor, token.doctor_id)
    avg = avg_consult_mins(doctor, token.token_date, token.affiliation_id) if doctor else _DEFAULT_CONSULT
    delay = active_delay_mins(db, token.doctor_id, token.token_date)
    pos = token.queue_position or 0
    now = utcnow()
    waiting = waiting_tokens(db, token.doctor_id, token.token_date, token.affiliation_id)
    cur = current_token(db, token.doctor_id, token.token_date, token.affiliation_id)
    is_today = token.token_date == date.today()
    travel = travel_minutes_for(db, token)

    out = {
        "token_id": token.token_id,
        "display_code": token.display_code,
        "token_number": token.token_number,
        "token_date": token.token_date,
        "status": token.status,
        "queue_position": pos,
        "total_waiting": len(waiting),
        "now_serving": cur.display_code if cur else None,
        "avg_consult_min": avg,
        "delay_min": delay,
        "wait_min": 0,
        "estimated_time": None,
        "travel_min": travel,
        "origin_label": token.origin_label or None,
        "leave_by": None,
        "remind_at": None,
        "should_leave_now": False,
    }

    if is_today and token.status in ("waiting", "current"):
        wait_min = max(0, (pos - 1)) * avg + delay
        eta = now + timedelta(minutes=wait_min)
        out["wait_min"] = wait_min
        out["estimated_time"] = eta
        if travel is not None and token.status == "waiting":
            leave_by = eta - timedelta(minutes=travel + ARRIVAL_BUFFER_MIN)
            out.update(
                leave_by=leave_by,
                remind_at=leave_by - timedelta(minutes=REMIND_BEFORE_MIN),
                should_leave_now=now >= leave_by,
            )
    return out


def maybe_send_leave_alert(db: Session, token: Token) -> bool:
    """Fire the one-time "time to leave" SMS once we're within REMIND_BEFORE_MIN
    of the patient's leave-by time. Returns whether an alert was sent."""
    if token.notified_leave or token.status != "waiting" or not token.patient_id:
        return False
    est = estimate(db, token)
    remind_at = est.get("remind_at")
    if remind_at is None or utcnow() < remind_at:
        return False
    patient = token.patient
    if not patient or not getattr(patient, "phone", None):
        return False
    notify.send_sms(
        db, patient.phone,
        f"Token {token.display_code}: about {est['wait_min']} min to your turn. "
        f"Please start for the clinic now to arrive on time.",
        ntype="travel_alert", title="Time to Leave",
        hospital_id=token.hospital_id, patient_id=patient.patient_id, token_id=token.token_id,
    )
    token.notified_leave = True
    return True


# ---- audit writes -----------------------------------------------------------
# A token reaching a terminal state drags its appointment to the matching one,
# so patient-facing views (which read appointment.status) stay in sync.
_TOKEN_TO_APPT_STATUS = {"completed": "completed", "cancelled": "cancelled", "missed": "no_show"}


def set_status(db: Session, token: Token, new_status: str, by: Optional[int], reason: str = "") -> None:
    db.add(TokenStatusHistory(
        token_id=token.token_id, old_status=token.status, new_status=new_status,
        changed_by=by, reason=reason,
    ))
    token.status = new_status
    appt_status = _TOKEN_TO_APPT_STATUS.get(new_status)
    if appt_status:
        sync_appointment_status(db, token, appt_status, by, reason)


def log_movement(db: Session, token: Token, action: str, frm: Optional[int],
                 to: Optional[int], by: Optional[int], notes: str = "") -> None:
    db.add(TokenMovementLog(
        token_id=token.token_id, action=action, from_position=frm,
        to_position=to, triggered_by=by, notes=notes,
    ))


def record_recall(db: Session, token: Token, method: str, by: Optional[int]) -> TokenRecallHistory:
    rec = token.recall
    if rec is None:
        rec = TokenRecallHistory(token_id=token.token_id, recall_count=0)
        db.add(rec)
        token.recall = rec
    rec.recall_count += 1
    rec.last_recalled_at = utcnow()
    rec.recall_method = method
    rec.recalled_by = by
    return rec


# ---- orchestrations ---------------------------------------------------------
def _naive_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """Coerce a datetime to naive UTC. Postgres returns timezone-AWARE datetimes
    for our DateTime(timezone=True) columns, but utcnow() is naive — subtracting
    the two raises. Normalise before any datetime arithmetic."""
    if dt is not None and dt.tzinfo is not None:
        return dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def start_serving(db: Session, token: Token, by: Optional[int]) -> None:
    """Mark a waiting token as the one currently being seen."""
    frm = token.queue_position
    token.actual_start = utcnow()
    created = _naive_utc(token.created_at)
    token.wait_duration_mins = max(0, int((token.actual_start - created).total_seconds() // 60)) if created else 0
    token.queue_position = 0
    set_status(db, token, "current", by, "Called")
    log_movement(db, token, "next", frm, 0, by, "Now serving")
    doctor = db.get(Doctor, token.doctor_id)
    if doctor and doctor.presence:
        doctor.presence.current_token_id = token.token_id
        doctor.presence.status = "busy"


def sync_appointment_status(db: Session, token: Token, new_status: str, by: Optional[int], reason: str = "") -> None:
    """Mirror a token's terminal state onto its appointment, so patient-facing
    views (which read appointment.status) stay in sync with the queue. Skips if
    the appointment is already in a terminal state."""
    if not token.appointment_id:
        return
    appt = db.get(Appointment, token.appointment_id)
    if not appt or appt.status in ("completed", "cancelled"):
        return
    db.add(ApptStatusHistory(
        appointment_id=appt.appointment_id, old_status=appt.status,
        new_status=new_status, changed_by=by, reason=reason,
    ))
    appt.status = new_status


def finish_serving(db: Session, token: Token, by: Optional[int]) -> None:
    token.actual_end = utcnow()
    started = _naive_utc(token.actual_start)
    if started:
        token.consult_duration_mins = max(0, int((token.actual_end - started).total_seconds() // 60))
    set_status(db, token, "completed", by, "Completed")
    log_movement(db, token, "complete", None, None, by, "Consultation done")
    doctor = db.get(Doctor, token.doctor_id)
    if doctor and doctor.presence:
        doctor.presence.tokens_served_today = (doctor.presence.tokens_served_today or 0) + 1
        if doctor.presence.current_token_id == token.token_id:
            doctor.presence.current_token_id = None
