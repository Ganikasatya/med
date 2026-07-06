"""
Module 2 — Hospital & Department (the tenancy backbone).

Every tenant-scoped table in the platform carries `hospital_id` and ultimately
points back here. A hospital owns its settings (OP hours, token prefix, booking
fee) and its departments (OPD, Cardiology, ...).
"""
from datetime import datetime, time
from typing import Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Text, Time
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, BigIntPK, utcnow


class Hospital(Base):
    __tablename__ = "hospitals"

    hospital_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    short_code: Mapped[str] = mapped_column(String(20), unique=True, index=True)  # token prefix e.g. APL
    address: Mapped[str] = mapped_column(Text, default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    state: Mapped[str] = mapped_column(String(100), default="")
    pincode: Mapped[str] = mapped_column(String(10), default="")
    phone: Mapped[str] = mapped_column(String(20), default="")
    email: Mapped[str] = mapped_column(String(100), default="")
    logo_url: Mapped[Optional[str]] = mapped_column(String(255))
    gstin: Mapped[Optional[str]] = mapped_column(String(20))
    # HFR ID — Health Facility Registry ID (ABDM). Optional now; the clinic's
    # national facility identifier. Free-form (formats vary across facility types).
    hfr_id: Mapped[Optional[str]] = mapped_column(String(64), index=True)
    # Geo-location of the clinic — the destination for the patient travel-time /
    # leave-by calculation (services/token_engine.py). Null until the clinic sets it.
    latitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    longitude: Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    # Onboarding lifecycle: pending (awaiting approval) | active | suspended.
    status: Mapped[str] = mapped_column(String(12), default="active", index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    settings: Mapped[Optional["HospitalSettings"]] = relationship(
        back_populates="hospital", cascade="all, delete-orphan", uselist=False
    )
    departments: Mapped[list["Department"]] = relationship(
        back_populates="hospital", cascade="all, delete-orphan"
    )


class HospitalSettings(Base):
    __tablename__ = "hospital_settings"

    setting_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("hospitals.hospital_id"), unique=True, nullable=False
    )
    op_start_time: Mapped[time] = mapped_column(Time, default=time(8, 0))
    op_end_time: Mapped[time] = mapped_column(Time, default=time(17, 0))
    lunch_start: Mapped[Optional[time]] = mapped_column(Time)
    lunch_end: Mapped[Optional[time]] = mapped_column(Time)
    token_prefix: Mapped[str] = mapped_column(String(10), default="OPD")
    booking_fee: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    consultation_duration: Mapped[int] = mapped_column(default=10)  # default mins per consult
    max_advance_days: Mapped[int] = mapped_column(default=7)
    emergency_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    sms_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    timezone: Mapped[str] = mapped_column(String(50), default="Asia/Kolkata")
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    hospital: Mapped["Hospital"] = relationship(back_populates="settings")


class Department(Base):
    __tablename__ = "departments"

    department_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(
        BigIntPK, ForeignKey("hospitals.hospital_id"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)   # General OPD, Cardiology
    code: Mapped[str] = mapped_column(String(20), default="")        # OPD, CARD
    description: Mapped[str] = mapped_column(Text, default="")
    floor: Mapped[str] = mapped_column(String(50), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    hospital: Mapped["Hospital"] = relationship(back_populates="departments")
