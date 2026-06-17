"""
Reports aggregation — computes analytics live from tokens + appointments and
upserts snapshot rows into the report tables.

Aggregation runs in Python over the window's tokens (portable across
SQLite/MySQL/Postgres; fine at clinic scale). Revenue is a proxy: the sum of
consultation fees on completed visits (the Payment module is deferred, so there
is no settled-payment figure yet).
"""
from calendar import monthrange
from datetime import date

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..database import utcnow
from ..models import (
    Appointment, DailyReport, DepartmentReport, Doctor, DoctorAffiliation,
    DoctorDelayLog, DoctorReport, MonthlyReport, Patient, Token,
)

DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


def month_bounds(year: int, month: int) -> tuple[date, date]:
    return date(year, month, 1), date(year, month, monthrange(year, month)[1])


def tokens_in(db: Session, start: date, end: date, *, hospital_id=None, doctor_id=None, department_id=None) -> list[Token]:
    stmt = select(Token).where(Token.token_date >= start, Token.token_date <= end)
    if hospital_id:
        stmt = stmt.where(Token.hospital_id == hospital_id)
        # Hospital-scoped reporting must NOT include a doctor's personal practice
        # (its tokens inherit the clinic's hospital_id). Doctor-only aggregation
        # (no hospital_id) is left untouched — that's the doctor's own report.
        stmt = stmt.outerjoin(
            DoctorAffiliation, Token.affiliation_id == DoctorAffiliation.affiliation_id
        ).where(
            or_(
                Token.affiliation_id.is_(None),
                DoctorAffiliation.managed_by_hospital.is_(True),
            )
        )
    if doctor_id:
        stmt = stmt.where(Token.doctor_id == doctor_id)
    if department_id:
        doc_ids = db.scalars(select(Doctor.doctor_id).where(Doctor.department_id == department_id)).all()
        stmt = stmt.where(Token.doctor_id.in_(list(doc_ids) or [-1]))
    return list(db.scalars(stmt).all())


def _revenue(db: Session, completed: list[Token]) -> float:
    appt_ids = [t.appointment_id for t in completed if t.appointment_id]
    if not appt_ids:
        return 0.0
    rows = db.execute(
        select(Appointment.appointment_id, Appointment.consultation_fee).where(
            Appointment.appointment_id.in_(appt_ids)
        )
    ).all()
    return float(sum((fee or 0) for _, fee in rows))


def _peak_hour(tokens: list[Token]) -> str | None:
    buckets: dict[int, int] = {}
    for t in tokens:
        buckets[t.created_at.hour] = buckets.get(t.created_at.hour, 0) + 1
    if not buckets:
        return None
    h = max(buckets, key=buckets.get)
    return f"{h:02d}:00-{(h + 1) % 24:02d}:00"


def aggregate(db: Session, tokens: list[Token]) -> dict:
    completed = [t for t in tokens if t.status == "completed"]
    missed = [t for t in tokens if t.status == "missed"]
    cancelled = [t for t in tokens if t.status == "cancelled"]
    waits = [t.wait_duration_mins for t in completed if t.wait_duration_mins is not None]
    consults = [t.consult_duration_mins for t in completed if t.consult_duration_mins is not None]
    return {
        "total_tokens": len(tokens),
        "tokens_completed": len(completed),
        "tokens_missed": len(missed),
        "tokens_cancelled": len(cancelled),
        "avg_wait_mins": round(sum(waits) / len(waits), 2) if waits else 0.0,
        "avg_consult_mins": round(sum(consults) / len(consults), 2) if consults else 0.0,
        "total_revenue": _revenue(db, completed),
        "peak_hour": _peak_hour(tokens),
    }


# ---- snapshot generators ----------------------------------------------------
def daily(db: Session, hospital_id: int, on_date: date, doctor_id: int | None = None) -> dict:
    tokens = tokens_in(db, on_date, on_date, hospital_id=hospital_id, doctor_id=doctor_id)
    agg = aggregate(db, tokens)
    row = db.scalar(
        select(DailyReport).where(
            DailyReport.hospital_id == hospital_id,
            DailyReport.doctor_id == doctor_id,
            DailyReport.report_date == on_date,
        )
    )
    if not row:
        row = DailyReport(hospital_id=hospital_id, doctor_id=doctor_id, report_date=on_date)
        db.add(row)
    for k, v in agg.items():
        setattr(row, k, v)
    row.generated_at = utcnow()
    return {"hospital_id": hospital_id, "doctor_id": doctor_id, "date": on_date.isoformat(), **agg}


def monthly(db: Session, hospital_id: int, year: int, month: int) -> dict:
    start, end = month_bounds(year, month)
    tokens = tokens_in(db, start, end, hospital_id=hospital_id)
    agg = aggregate(db, tokens)
    total = agg["total_tokens"] or 1
    unique_patients = len({t.patient_id for t in tokens if t.patient_id})
    new_patients = db.scalar(
        select(Patient.patient_id).where(Patient.hospital_id == hospital_id).where(
            Patient.created_at >= start, Patient.created_at <= end
        ).limit(1)
    )
    new_count = len(db.scalars(
        select(Patient.patient_id).where(
            Patient.hospital_id == hospital_id, Patient.created_at >= start, Patient.created_at <= end
        )
    ).all())
    distinct_days = len({t.token_date for t in tokens}) or 1
    out = {
        "hospital_id": hospital_id, "month": month, "year": year,
        "total_tokens": agg["total_tokens"], "unique_patients": unique_patients,
        "new_patients": new_count, "total_revenue": agg["total_revenue"],
        "avg_daily_tokens": round(agg["total_tokens"] / distinct_days, 2),
        "no_show_rate": round(agg["tokens_missed"] / total * 100, 2),
        "cancellation_rate": round(agg["tokens_cancelled"] / total * 100, 2),
    }
    row = db.scalar(select(MonthlyReport).where(MonthlyReport.hospital_id == hospital_id, MonthlyReport.month == month, MonthlyReport.year == year))
    if not row:
        row = MonthlyReport(hospital_id=hospital_id, month=month, year=year)
        db.add(row)
    for k in ("total_tokens", "unique_patients", "new_patients", "total_revenue", "avg_daily_tokens", "no_show_rate", "cancellation_rate"):
        setattr(row, k, out[k])
    row.generated_at = utcnow()
    return out


def doctor(db: Session, doctor_id: int, year: int, month: int) -> dict:
    d = db.get(Doctor, doctor_id)
    start, end = month_bounds(year, month)
    tokens = tokens_in(db, start, end, doctor_id=doctor_id)
    agg = aggregate(db, tokens)
    ratings = db.scalars(
        select(Appointment.rating).where(
            Appointment.doctor_id == doctor_id, Appointment.rating.is_not(None)
        )
    ).all()
    satisfaction = round(sum(ratings) / len(ratings), 2) if ratings else 0.0
    delays = db.scalars(
        select(DoctorDelayLog.delay_minutes).where(
            DoctorDelayLog.doctor_id == doctor_id,
            DoctorDelayLog.delay_date >= start, DoctorDelayLog.delay_date <= end,
        )
    ).all()
    out = {
        "doctor_id": doctor_id, "hospital_id": d.hospital_id if d else None,
        "month": month, "year": year, "total_tokens": agg["total_tokens"],
        "completed_tokens": agg["tokens_completed"], "missed_tokens": agg["tokens_missed"],
        "avg_consult_mins": agg["avg_consult_mins"], "avg_wait_mins": agg["avg_wait_mins"],
        "patient_satisfaction_avg": satisfaction, "total_delays_mins": int(sum(delays)),
    }
    row = db.scalar(select(DoctorReport).where(DoctorReport.doctor_id == doctor_id, DoctorReport.month == month, DoctorReport.year == year))
    if not row:
        row = DoctorReport(doctor_id=doctor_id, hospital_id=out["hospital_id"], month=month, year=year)
        db.add(row)
    for k in ("total_tokens", "completed_tokens", "missed_tokens", "avg_consult_mins", "avg_wait_mins", "patient_satisfaction_avg", "total_delays_mins"):
        setattr(row, k, out[k])
    row.generated_at = utcnow()
    return out


def department(db: Session, hospital_id: int, department_id: int, year: int, month: int) -> dict:
    start, end = month_bounds(year, month)
    tokens = tokens_in(db, start, end, hospital_id=hospital_id, department_id=department_id)
    agg = aggregate(db, tokens)
    active_doctors = len(db.scalars(select(Doctor.doctor_id).where(Doctor.department_id == department_id, Doctor.status == "active")).all())
    day_counts: dict[str, int] = {}
    for t in tokens:
        nm = DAY_NAMES[t.token_date.weekday()]
        day_counts[nm] = day_counts.get(nm, 0) + 1
    busiest_day = max(day_counts, key=day_counts.get) if day_counts else None
    out = {
        "department_id": department_id, "hospital_id": hospital_id, "month": month, "year": year,
        "total_tokens": agg["total_tokens"], "active_doctors": active_doctors,
        "avg_wait_mins": agg["avg_wait_mins"], "total_revenue": agg["total_revenue"],
        "busiest_day": busiest_day, "busiest_hour": agg["peak_hour"],
    }
    row = db.scalar(select(DepartmentReport).where(DepartmentReport.department_id == department_id, DepartmentReport.month == month, DepartmentReport.year == year))
    if not row:
        row = DepartmentReport(department_id=department_id, hospital_id=hospital_id, month=month, year=year)
        db.add(row)
    for k in ("total_tokens", "active_doctors", "avg_wait_mins", "total_revenue", "busiest_day", "busiest_hour"):
        setattr(row, k, out[k])
    row.generated_at = utcnow()
    return out
