"""
Module 11 — Reports & Analytics endpoints (15 APIs).

Snapshot reports (daily/monthly/doctor/department) compute live and persist a
row; analytical endpoints (peak-hours, wait-time trend, funnel, forecast, etc.)
compute on the fly. Revenue is the completed-visit consultation-fee proxy (the
Payment module is deferred).
"""
import csv
import io
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import ensure_same_tenant, require_permission, require_role
from ..models import (
    Appointment, Doctor, DoctorAffiliation, Hospital, Patient, Receptionist, Token, User,
)
from ..rbac import ROLE_SUPER_ADMIN
from ..services import reports as rp

router = APIRouter(prefix="/reports", tags=["reports"])


def _scope_hid(me: User, hospital_id: int | None) -> int:
    """Resolve the hospital to report on (own tenant unless super admin)."""
    if me.role and me.role.name == ROLE_SUPER_ADMIN:
        if not hospital_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "hospital_id required")
        return hospital_id
    return me.hospital_id


def _date(s: str | None, default: date) -> date:
    if not s:
        return default
    try:
        return datetime.strptime(s, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid date (YYYY-MM-DD)")


# ===================================================== Snapshots ===========
@router.get("/daily")
def daily(hospital_id: int | None = Query(None), date: str | None = Query(None), doctor_id: int | None = Query(None),
          me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    from datetime import date as d
    out = rp.daily(db, _scope_hid(me, hospital_id), _date(date, d.today()), doctor_id)
    db.commit()
    return out


@router.get("/monthly")
def monthly(hospital_id: int | None = Query(None), month: int | None = Query(None), year: int | None = Query(None),
            me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    today = date.today()
    out = rp.monthly(db, _scope_hid(me, hospital_id), year or today.year, month or today.month)
    db.commit()
    return out


@router.get("/doctor")
def doctor_report(doctor_id: int = Query(...), month: int | None = Query(None), year: int | None = Query(None),
                  me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    d = db.get(Doctor, doctor_id)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Doctor not found")
    ensure_same_tenant(me, d.hospital_id)
    today = date.today()
    out = rp.doctor(db, doctor_id, year or today.year, month or today.month)
    db.commit()
    return out


@router.get("/department")
def department_report(department_id: int = Query(...), hospital_id: int | None = Query(None),
                      month: int | None = Query(None), year: int | None = Query(None),
                      me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    today = date.today()
    out = rp.department(db, _scope_hid(me, hospital_id), department_id, year or today.year, month or today.month)
    db.commit()
    return out


# ===================================================== Analytics ===========
def _range(start: str | None, end: str | None) -> tuple[date, date]:
    today = date.today()
    return _date(start, today - timedelta(days=29)), _date(end, today)


@router.get("/revenue")
def revenue(hospital_id: int | None = Query(None), start: str | None = Query(None), end: str | None = Query(None),
            me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    hid = _scope_hid(me, hospital_id)
    s, e = _range(start, end)
    tokens = rp.tokens_in(db, s, e, hospital_id=hid)
    agg = rp.aggregate(db, tokens)
    return {"hospital_id": hid, "start": s.isoformat(), "end": e.isoformat(),
            "total_revenue": agg["total_revenue"], "completed_visits": agg["tokens_completed"],
            "note": "revenue = sum of consultation fees on completed visits (Payment module deferred)"}


@router.get("/peak-hours")
def peak_hours(hospital_id: int | None = Query(None), start: str | None = Query(None), end: str | None = Query(None),
               me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    hid = _scope_hid(me, hospital_id)
    s, e = _range(start, end)
    buckets: dict[str, int] = {}
    for t in rp.tokens_in(db, s, e, hospital_id=hid):
        key = f"{t.created_at.hour:02d}:00"
        buckets[key] = buckets.get(key, 0) + 1
    dist = [{"hour": k, "tokens": v} for k, v in sorted(buckets.items())]
    return {"hospital_id": hid, "distribution": dist, "busiest": max(dist, key=lambda x: x["tokens"]) if dist else None}


@router.get("/no-show")
def no_show(hospital_id: int | None = Query(None), start: str | None = Query(None), end: str | None = Query(None),
            me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    hid = _scope_hid(me, hospital_id)
    s, e = _range(start, end)
    tokens = rp.tokens_in(db, s, e, hospital_id=hid)
    total = len(tokens) or 1
    missed = [t for t in tokens if t.status == "missed"]
    return {"hospital_id": hid, "total": len(tokens), "no_shows": len(missed),
            "no_show_rate": round(len(missed) / total * 100, 2)}


@router.get("/cancellations")
def cancellations(hospital_id: int | None = Query(None), start: str | None = Query(None), end: str | None = Query(None),
                  me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    hid = _scope_hid(me, hospital_id)
    s, e = _range(start, end)
    tokens = rp.tokens_in(db, s, e, hospital_id=hid)
    total = len(tokens) or 1
    cancelled = [t for t in tokens if t.status == "cancelled"]
    return {"hospital_id": hid, "total": len(tokens), "cancelled": len(cancelled),
            "cancellation_rate": round(len(cancelled) / total * 100, 2)}


@router.get("/wait-time")
def wait_time(hospital_id: int | None = Query(None), start: str | None = Query(None), end: str | None = Query(None),
              me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    hid = _scope_hid(me, hospital_id)
    s, e = _range(start, end)
    by_day: dict[str, list[int]] = {}
    for t in rp.tokens_in(db, s, e, hospital_id=hid):
        if t.status == "completed" and t.wait_duration_mins is not None:
            by_day.setdefault(t.token_date.isoformat(), []).append(t.wait_duration_mins)
    trend = [{"date": d, "avg_wait_mins": round(sum(v) / len(v), 1)} for d, v in sorted(by_day.items())]
    return {"hospital_id": hid, "trend": trend}


@router.get("/patient-flow")
def patient_flow(hospital_id: int | None = Query(None), date: str | None = Query(None),
                 me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    from datetime import date as d
    hid = _scope_hid(me, hospital_id)
    on_date = _date(date, d.today())
    appts = db.scalars(
        select(Appointment)
        .outerjoin(DoctorAffiliation, Appointment.affiliation_id == DoctorAffiliation.affiliation_id)
        .where(
            Appointment.hospital_id == hid,
            Appointment.appointment_date == on_date,
            or_(Appointment.affiliation_id.is_(None), DoctorAffiliation.managed_by_hospital.is_(True)),
        )
    ).all()
    tokens = rp.tokens_in(db, on_date, on_date, hospital_id=hid)
    return {"hospital_id": hid, "date": on_date.isoformat(), "funnel": {
        "booked": len(appts),
        "tokens_generated": len(tokens),
        "in_progress": sum(1 for t in tokens if t.status == "current"),
        "completed": sum(1 for t in tokens if t.status == "completed"),
        "no_show": sum(1 for t in tokens if t.status == "missed"),
    }}


@router.get("/token-forecast")
def token_forecast(hospital_id: int | None = Query(None), next_days: int = Query(7, ge=1, le=30),
                   me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    hid = _scope_hid(me, hospital_id)
    today = date.today()
    hist = rp.tokens_in(db, today - timedelta(days=29), today, hospital_id=hid)
    days = len({t.token_date for t in hist}) or 1
    avg = round(len(hist) / days, 1)
    forecast = [{"date": (today + timedelta(days=i)).isoformat(), "predicted_tokens": avg} for i in range(1, next_days + 1)]
    return {"hospital_id": hid, "avg_daily_tokens": avg, "forecast": forecast}


@router.get("/receptionist")
def receptionist_report(hospital_id: int | None = Query(None), month: int | None = Query(None), year: int | None = Query(None),
                        me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    hid = _scope_hid(me, hospital_id)
    today = date.today()
    s, e = rp.month_bounds(year or today.year, month or today.month)
    recs = db.scalars(select(Receptionist).where(Receptionist.hospital_id == hid)).all()
    out = []
    for r in recs:
        booked = db.scalar(select(func.count(Appointment.appointment_id)).where(
            Appointment.booked_by == r.user_id, Appointment.appointment_date >= s, Appointment.appointment_date <= e))
        out.append({"receptionist_id": r.receptionist_id, "user_id": r.user_id, "appointments_booked": booked or 0})
    return {"hospital_id": hid, "month": month or today.month, "year": year or today.year, "receptionists": out}


@router.get("/clinic-overview")
def clinic_overview(hospital_id: int | None = Query(None), month: int | None = Query(None), year: int | None = Query(None),
                    me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    """One payload for the clinic Reports page — KPIs, weekday visits, department
    split and top doctors, across ALL of the hospital's doctors for the month."""
    today = date.today()
    out = rp.clinic_overview(db, _scope_hid(me, hospital_id), year or today.year, month or today.month)
    db.commit()
    return out


_WEEK_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]


@router.get("/dashboard")
def dashboard(hospital_id: int | None = Query(None), me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    hid = _scope_hid(me, hospital_id)
    today = date.today()
    tokens = rp.tokens_in(db, today, today, hospital_id=hid)
    doctors = db.scalar(select(func.count(Doctor.doctor_id)).where(Doctor.hospital_id == hid)) or 0
    active = db.scalar(select(func.count(Doctor.doctor_id)).where(Doctor.hospital_id == hid, Doctor.status == "active")) or 0
    patients = db.scalar(select(func.count(Patient.patient_id)).where(Patient.hospital_id == hid)) or 0
    rev = rp._revenue(db, tokens)  # money collected today (paid consult + booking)

    # Per-doctor breakdown for today: how many OPs each doctor completed,
    # how many are still waiting, and their total tokens. Sorted by completed.
    doc_names = {d.doctor_id: d.name for d in db.scalars(select(Doctor).where(Doctor.hospital_id == hid)).all()}
    by_doc: dict[int, dict] = {}
    for t in tokens:
        row = by_doc.setdefault(t.doctor_id, {"completed": 0, "waiting": 0, "total": 0})
        row["total"] += 1
        if t.status == "completed":
            row["completed"] += 1
        elif t.status == "waiting":
            row["waiting"] += 1
    by_doctor = sorted(
        (
            {"doctor_id": did, "name": doc_names.get(did, "Doctor"), **v}
            for did, v in by_doc.items()
        ),
        key=lambda r: (r["completed"], r["total"]),
        reverse=True,
    )

    # Real visits for the last 7 calendar days (oldest → today).
    start = today - timedelta(days=6)
    week_tokens = rp.tokens_in(db, start, today, hospital_id=hid)
    day_counts: dict[date, int] = {}
    for t in week_tokens:
        day_counts[t.token_date] = day_counts.get(t.token_date, 0) + 1
    visits_week = [
        {"day": _WEEK_SHORT[(start + timedelta(days=i)).weekday()],
         "value": day_counts.get(start + timedelta(days=i), 0)}
        for i in range(7)
    ]

    return {"hospital_id": hid, "date": today.isoformat(), "kpis": {
        "tokens_today": len(tokens),
        "completed_today": sum(1 for t in tokens if t.status == "completed"),
        "waiting_now": sum(1 for t in tokens if t.status == "waiting"),
        "no_shows_today": sum(1 for t in tokens if t.status == "missed"),
        # Clinic's OWN collection = consultation fees taken at the clinic. The
        # booking fee is the platform's charge (collected online), NOT the
        # clinic's money, so it's excluded here.
        "revenue_today": rev["consultation"],
        "doctors": doctors, "doctors_active": active, "total_patients": patients,
    }, "by_doctor": by_doctor, "visits_week": visits_week}


@router.get("/super-admin", dependencies=[Depends(require_role(ROLE_SUPER_ADMIN))])
def super_admin_report(month: int | None = Query(None), year: int | None = Query(None), db: Session = Depends(get_db)):
    today = date.today()
    s, e = rp.month_bounds(year or today.year, month or today.month)
    out = []
    for h in db.scalars(select(Hospital)).all():
        tokens = rp.tokens_in(db, s, e, hospital_id=h.hospital_id)
        agg = rp.aggregate(db, tokens)
        out.append({"hospital_id": h.hospital_id, "name": h.name,
                    "total_tokens": agg["total_tokens"], "completed": agg["tokens_completed"],
                    "revenue": agg["total_revenue"]})
    return {"month": month or today.month, "year": year or today.year, "hospitals": out,
            "platform_totals": {"tokens": sum(x["total_tokens"] for x in out),
                                "revenue": sum(x["revenue"] for x in out)}}


@router.get("/export")
def export_report(report_type: str = Query("daily"), hospital_id: int | None = Query(None),
                  date: str | None = Query(None), format: str = Query("csv"),
                  me: User = Depends(require_permission("report", "read")), db: Session = Depends(get_db)):
    from datetime import date as d
    hid = _scope_hid(me, hospital_id)
    on_date = _date(date, d.today())
    tokens = rp.tokens_in(db, on_date, on_date, hospital_id=hid)
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(["token_id", "display_code", "doctor_id", "status", "priority", "wait_mins", "consult_mins"])
    for t in tokens:
        w.writerow([t.token_id, t.display_code, t.doctor_id, t.status, t.priority, t.wait_duration_mins, t.consult_duration_mins])
    return Response(content=buf.getvalue(), media_type="text/csv",
                    headers={"Content-Disposition": f"attachment; filename={report_type}_{on_date}.csv"})
