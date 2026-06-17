"""
Module 6 — Appointment.

appointments              the booking master (doctor + patient + date/slot)
appt_status_history       every status transition (audit trail)
appt_reschedule_history   date/time changes
appt_cancellation_logs    cancellations + refund disposition

Booking resolves a (doctor, date, slot) against the doctor's schedule; the
actual *token* is minted by the Token Engine (Phase 4). rating/feedback columns
back the post-consult feedback API and feed the Reports module later.
"""
from datetime import date, datetime, time
from typing import Optional

from sqlalchemy import (
    Date, DateTime, ForeignKey, Numeric, String, Text, Time,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, BigIntPK, utcnow

APPOINTMENT_TYPES = ("regular", "walkin", "emergency")
APPOINTMENT_STATUSES = (
    "scheduled", "confirmed", "in_progress", "completed",
    "cancelled", "no_show", "rescheduled",
)
SOURCES = ("app", "whatsapp", "csc", "walkin", "phone")
REFUND_STATUSES = ("none", "pending", "processed", "rejected")


class Appointment(Base):
    __tablename__ = "appointments"

    appointment_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    affiliation_id: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("doctor_affiliations.affiliation_id"), index=True)
    patient_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("patients.patient_id"), nullable=False, index=True)
    family_member_id: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("family_members.member_id"))
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    slot_time: Mapped[Optional[time]] = mapped_column(Time)
    appointment_type: Mapped[str] = mapped_column(String(12), default="regular")
    status: Mapped[str] = mapped_column(String(12), default="scheduled", index=True)
    consultation_fee: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    booking_fee_paid: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    notes: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(12), default="app")
    booked_by: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"))
    # Where the patient will travel FROM for this visit (chosen at booking). Used
    # to compute the leave-by time; copied onto the Token when it is generated.
    origin_lat: Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    origin_lng: Mapped[Optional[float]] = mapped_column(Numeric(9, 6))
    origin_label: Mapped[str] = mapped_column(String(120), default="")
    travel_minutes: Mapped[Optional[int]] = mapped_column()
    rating: Mapped[Optional[int]] = mapped_column()       # post-consult feedback 1..5
    feedback: Mapped[Optional[str]] = mapped_column(Text)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    doctor: Mapped["object"] = relationship("Doctor")
    patient: Mapped["object"] = relationship("Patient")
    affiliation: Mapped["object"] = relationship("DoctorAffiliation")
    status_history: Mapped[list["ApptStatusHistory"]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan"
    )
    reschedule_history: Mapped[list["ApptRescheduleHistory"]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan"
    )
    cancellation_logs: Mapped[list["ApptCancellationLog"]] = relationship(
        back_populates="appointment", cascade="all, delete-orphan"
    )

    @property
    def patient_name(self) -> Optional[str]:
        """Convenience for read schemas: the booked patient's display name."""
        return self.patient.name if self.patient else None

    @property
    def practice_type(self) -> Optional[str]:
        """Which practice this visit is for: clinic / personal_clinic / home / online."""
        return self.affiliation.practice_type if self.affiliation else None

    @property
    def practice_name(self) -> Optional[str]:
        return (self.affiliation.name if self.affiliation else None) or None

    @property
    def managed_by_hospital(self) -> bool:
        """False for a doctor's personal/home practice — those are private to the
        doctor and the clinic console must never list them. Appointments with no
        affiliation are legacy clinic bookings → treated as hospital-managed."""
        return self.affiliation.managed_by_hospital if self.affiliation else True


class ApptStatusHistory(Base):
    __tablename__ = "appt_status_history"

    history_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    appointment_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("appointments.appointment_id"), nullable=False, index=True)
    old_status: Mapped[Optional[str]] = mapped_column(String(12))
    new_status: Mapped[str] = mapped_column(String(12))
    changed_by: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"))
    reason: Mapped[str] = mapped_column(Text, default="")
    changed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    appointment: Mapped["Appointment"] = relationship(back_populates="status_history")


class ApptRescheduleHistory(Base):
    __tablename__ = "appt_reschedule_history"

    reschedule_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    appointment_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("appointments.appointment_id"), nullable=False, index=True)
    old_date: Mapped[Optional[date]] = mapped_column(Date)
    old_time: Mapped[Optional[time]] = mapped_column(Time)
    new_date: Mapped[Optional[date]] = mapped_column(Date)
    new_time: Mapped[Optional[time]] = mapped_column(Time)
    rescheduled_by: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"))
    reason: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    appointment: Mapped["Appointment"] = relationship(back_populates="reschedule_history")


class ApptCancellationLog(Base):
    __tablename__ = "appt_cancellation_logs"

    log_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    appointment_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("appointments.appointment_id"), nullable=False, index=True)
    cancelled_by: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"))
    cancel_reason: Mapped[str] = mapped_column(Text, default="")
    refund_status: Mapped[str] = mapped_column(String(12), default="none")
    refund_amount: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    appointment: Mapped["Appointment"] = relationship(back_populates="cancellation_logs")
