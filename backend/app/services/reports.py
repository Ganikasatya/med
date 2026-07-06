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
    Appointment, DailyReport, Department, DepartmentReport, Doctor, DoctorAffiliation,
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


def _revenue(db: Session, tokens: list[Token]) -> dict:
    """Money actually collected for these tokens' appointments:
        consultation fees that were PAID (collected at the clinic)
      + booking fees (the ₹ collected online at booking).
    Returns a breakdown so reports can show where the money came from. The caller
    already scopes `tokens` (clinic = all doctors; a doctor = only their own), so
    this is correct for both the clinic and doctor views."""
    appt_ids = list({t.appointment_id for t in tokens if t.appointment_id})
    if not appt_ids:
        return {"total": 0.0, "consultation": 0.0, "booking": 0.0}
    rows = db.execute(
        select(
            Appointment.consultation_fee, Appointment.consultation_paid, Appointment.booking_fee_paid
        ).where(Appointment.appointment_id.in_(appt_ids))
    ).all()
    consultation = float(sum((fee or 0) for fee, paid, _ in rows if paid))
    booking = float(sum((bf or 0) for _, _, bf in rows))
    return {"total": consultation + booking, "consultation": consultation, "booking": booking}


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
    rev = _revenue(db, tokens)  # collected money for ALL tokens in scope (paid consult + booking)
    return {
        "total_tokens": len(tokens),
        "tokens_completed": len(completed),
        "tokens_missed": len(missed),
        "tokens_cancelled": len(cancelled),
        "avg_wait_mins": round(sum(waits) / len(waits), 2) if waits else 0.0,
        "avg_consult_mins": round(sum(consults) / len(consults), 2) if consults else 0.0,
        "total_revenue": rev["total"],
        "consultation_revenue": rev["consultation"],
        "booking_revenue": rev["booking"],
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


_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


def clinic_overview(db: Session, hospital_id: int, year: int, month: int) -> dict:
    """Everything the clinic Reports page shows, in one payload — aggregated over
    ALL of the hospital's doctors for the given month: headline KPIs (collected
    money = paid consultations + booking fees), visits per weekday, the visit
    split by department, and the top doctors by completed consultations."""
    start, end = month_bounds(year, month)
    tokens = tokens_in(db, start, end, hospital_id=hospital_id)
    agg = aggregate(db, tokens)

    # Lookup maps for this hospital's doctors and departments.
    doctors = {d.doctor_id: d for d in db.scalars(select(Doctor).where(Doctor.hospital_id == hospital_id)).all()}
    dept_names = {dep.department_id: dep.name for dep in db.scalars(select(Department).where(Department.hospital_id == hospital_id)).all()}

    # Visits per weekday (Mon..Sun).
    week_counts = {d: 0 for d in _WEEK}
    for t in tokens:
        week_counts[_WEEK[t.token_date.weekday()]] += 1
    visits_week = [{"day": d, "value": week_counts[d]} for d in _WEEK]

    # Visit split by department (share of all tokens).
    dept_counts: dict[str, int] = {}
    for t in tokens:
        doc = doctors.get(t.doctor_id)
        label = dept_names.get(doc.department_id) if doc and doc.department_id else None
        label = label or "General"
        dept_counts[label] = dept_counts.get(label, 0) + 1
    total = len(tokens) or 1
    dept_split = sorted(
        ({"label": k, "count": v, "value": round(v / total * 100)} for k, v in dept_counts.items()),
        key=lambda x: x["count"], reverse=True,
    )

    # Top doctors by completed consultations, with average rating from feedback.
    done_by_doc: dict[int, int] = {}
    for t in tokens:
        if t.status == "completed":
            done_by_doc[t.doctor_id] = done_by_doc.get(t.doctor_id, 0) + 1
    rating_rows = db.execute(
        select(Appointment.doctor_id, Appointment.rating).where(
            Appointment.hospital_id == hospital_id,
            Appointment.appointment_date >= start, Appointment.appointment_date <= end,
            Appointment.rating.is_not(None),
        )
    ).all()
    rating_acc: dict[int, list] = {}
    for did, r in rating_rows:
        rating_acc.setdefault(did, []).append(r)
    top_doctors = []
    for did, consults in sorted(done_by_doc.items(), key=lambda x: x[1], reverse=True)[:5]:
        d = doctors.get(did)
        rs = rating_acc.get(did, [])
        top_doctors.append({
            "doctor_id": did,
            "name": (d.name if d and d.name else "Doctor"),
            "specialty": (d.specialization if d else ""),
            "photo": (d.profile_photo_url if d else None),
            "consults": consults,
            "rating": round(sum(rs) / len(rs), 1) if rs else None,
        })

    unique_patients = len({t.patient_id for t in tokens if t.patient_id})
    return {
        "hospital_id": hospital_id, "month": month, "year": year,
        "kpis": {
            "total_patients": unique_patients,
            "consultations": agg["tokens_completed"],
            "total_tokens": agg["total_tokens"],
            "revenue": agg["total_revenue"],
            "consultation_revenue": agg["consultation_revenue"],
            "booking_revenue": agg["booking_revenue"],
            "no_shows": agg["tokens_missed"],
        },
        "visits_week": visits_week,
        "dept_split": dept_split,
        "top_doctors": top_doctors,
    }
