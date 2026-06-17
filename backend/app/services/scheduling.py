"""
Scheduling resolver (deck model).

Given a doctor + date it answers: does the doctor consult that day, is the day
blocked (holiday/leave), and what consultation slots are open? Slots come from
doctor_schedule (stepped by consultation_mins), minus break windows, minus
already-booked appointments. This is what the booking + available-slots APIs and
(in Phase 4) the token engine build on.
"""
from datetime import date, datetime, time, timedelta
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Appointment, Doctor, DoctorLeaveRequest, DoctorSchedule

DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
_BLOCKING_STATUSES = {"cancelled", "no_show", "rescheduled"}


def weekday_of(d: date) -> str:
    return DAY_ORDER[d.weekday()]


def fmt_time(t: time) -> str:
    h, m = t.hour, t.minute
    ap = "PM" if h >= 12 else "AM"
    hr = ((h + 11) % 12) + 1
    return f"{hr}:{m:02d} {ap}"


def active_schedules(doctor: Doctor, on_date: date, affiliation_id: int | None = None) -> list[DoctorSchedule]:
    wd = weekday_of(on_date)
    out = []
    for s in doctor.schedules:
        if not s.is_active or s.day_of_week != wd:
            continue
        if affiliation_id and s.affiliation_id is not None and s.affiliation_id != affiliation_id:
            continue
        if s.valid_from and on_date < s.valid_from:
            continue
        if s.valid_until and on_date > s.valid_until:
            continue
        out.append(s)
    return sorted(out, key=lambda s: s.start_time)


def is_on_holiday(doctor: Doctor, on_date: date) -> bool:
    return any(h.holiday_date == on_date and h.is_full_day for h in doctor.holidays)


def is_on_leave(db: Session, doctor: Doctor, on_date: date) -> bool:
    if doctor.status in ("inactive", "suspended"):
        return True
    return bool(
        db.scalar(
            select(DoctorLeaveRequest.leave_id).where(
                DoctorLeaveRequest.doctor_id == doctor.doctor_id,
                DoctorLeaveRequest.status == "approved",
                DoctorLeaveRequest.leave_from <= on_date,
                DoctorLeaveRequest.leave_to >= on_date,
            ).limit(1)
        )
    )


def _in_break(slot: time, schedule: DoctorSchedule) -> bool:
    return any(b.break_start <= slot < b.break_end for b in schedule.breaks)


def generate_slots(schedule: DoctorSchedule) -> list[time]:
    """Step from start_time to end_time by consultation_mins, skipping breaks."""
    step = max(1, schedule.consultation_mins)
    base = date(2000, 1, 1)
    cur = datetime.combine(base, schedule.start_time)
    end = datetime.combine(base, schedule.end_time)
    slots: list[time] = []
    while cur < end and len(slots) < schedule.max_tokens:
        t = cur.time()
        if not _in_break(t, schedule):
            slots.append(t)
        cur += timedelta(minutes=step)
    return slots


def booked_times(db: Session, doctor_id: int, on_date: date, affiliation_id: int | None = None) -> set[time]:
    stmt = select(Appointment.slot_time).where(
        Appointment.doctor_id == doctor_id,
        Appointment.appointment_date == on_date,
        Appointment.status.not_in(_BLOCKING_STATUSES),
    )
    if affiliation_id:
        stmt = stmt.where(
            (Appointment.affiliation_id == affiliation_id) | (Appointment.affiliation_id.is_(None))
        )
    rows = db.scalars(
        stmt
    ).all()
    return {t for t in rows if t is not None}


def available_slots(db: Session, doctor: Doctor, on_date: date, affiliation_id: int | None = None) -> dict:
    """Resolve a date → open slots (or the reason none are available)."""
    if is_on_holiday(doctor, on_date):
        return {"available": False, "reason": "Doctor on holiday", "slots": []}
    if is_on_leave(db, doctor, on_date):
        return {"available": False, "reason": "Doctor on leave", "slots": []}
    schedules = active_schedules(doctor, on_date, affiliation_id)
    if not schedules:
        return {"available": False, "reason": "Doctor does not consult on " + weekday_of(on_date), "slots": []}

    taken = booked_times(db, doctor.doctor_id, on_date, affiliation_id)
    slots = []
    for s in schedules:
        for t in generate_slots(s):
            if t not in taken:
                slots.append({
                    "schedule_id": s.schedule_id,
                    "time": t.strftime("%H:%M"),
                    "label": fmt_time(t),
                })
    return {"available": bool(slots), "reason": None if slots else "Fully booked", "slots": slots}


def schedule_for_slot(doctor: Doctor, on_date: date, slot: time, affiliation_id: int | None = None) -> Optional[DoctorSchedule]:
    """Which active schedule (if any) contains this slot time."""
    for s in active_schedules(doctor, on_date, affiliation_id):
        if s.start_time <= slot < s.end_time:
            return s
    return None
