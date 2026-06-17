"""
Module 11 — Reports (analytics snapshots).

Snapshot tables for daily / monthly / doctor / department aggregates. The report
APIs compute live from tokens+appointments and upsert a snapshot row here, so the
tables double as a cache and a historical record.
"""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, Numeric, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from ..database import Base, BigIntPK, utcnow


class DailyReport(Base):
    __tablename__ = "daily_reports"
    __table_args__ = (UniqueConstraint("hospital_id", "doctor_id", "report_date", name="uq_daily_report"),)

    report_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), nullable=False, index=True)
    doctor_id: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("doctors.doctor_id"), index=True)
    report_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    total_tokens: Mapped[int] = mapped_column(default=0)
    tokens_completed: Mapped[int] = mapped_column(default=0)
    tokens_missed: Mapped[int] = mapped_column(default=0)
    tokens_cancelled: Mapped[int] = mapped_column(default=0)
    avg_wait_mins: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    avg_consult_mins: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    total_revenue: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    peak_hour: Mapped[Optional[str]] = mapped_column(String(10))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class MonthlyReport(Base):
    __tablename__ = "monthly_reports"
    __table_args__ = (UniqueConstraint("hospital_id", "month", "year", name="uq_monthly_report"),)

    report_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), nullable=False, index=True)
    month: Mapped[int] = mapped_column()
    year: Mapped[int] = mapped_column()
    total_tokens: Mapped[int] = mapped_column(default=0)
    unique_patients: Mapped[int] = mapped_column(default=0)
    new_patients: Mapped[int] = mapped_column(default=0)
    total_revenue: Mapped[float] = mapped_column(Numeric(12, 2), default=0)
    avg_daily_tokens: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    no_show_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    cancellation_rate: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class DoctorReport(Base):
    __tablename__ = "doctor_reports"
    __table_args__ = (UniqueConstraint("doctor_id", "month", "year", name="uq_doctor_report"),)

    report_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    doctor_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), index=True)
    month: Mapped[int] = mapped_column()
    year: Mapped[int] = mapped_column()
    total_tokens: Mapped[int] = mapped_column(default=0)
    completed_tokens: Mapped[int] = mapped_column(default=0)
    missed_tokens: Mapped[int] = mapped_column(default=0)
    avg_consult_mins: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    avg_wait_mins: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    patient_satisfaction_avg: Mapped[float] = mapped_column(Numeric(3, 2), default=0)
    total_delays_mins: Mapped[int] = mapped_column(default=0)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class DepartmentReport(Base):
    __tablename__ = "department_reports"
    __table_args__ = (UniqueConstraint("department_id", "month", "year", name="uq_department_report"),)

    report_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    department_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("departments.department_id"), nullable=False, index=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), index=True)
    month: Mapped[int] = mapped_column()
    year: Mapped[int] = mapped_column()
    total_tokens: Mapped[int] = mapped_column(default=0)
    active_doctors: Mapped[int] = mapped_column(default=0)
    avg_wait_mins: Mapped[float] = mapped_column(Numeric(6, 2), default=0)
    total_revenue: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    busiest_day: Mapped[Optional[str]] = mapped_column(String(10))
    busiest_hour: Mapped[Optional[str]] = mapped_column(String(10))
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
