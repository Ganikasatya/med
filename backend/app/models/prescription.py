"""
Prescriptions — what the doctor prescribes at a consultation.

prescriptions        one Rx per visit: diagnosis, advice, optional follow-up
prescription_items   the individual drugs on that Rx (name, dosage, frequency…)

A prescription is written by a doctor (optionally tied to the appointment it came
from) and is visible to that patient in their app. Drugs are kept as child rows
(not JSON) to match the relational style of the rest of the schema.
"""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, BigIntPK, utcnow


class Prescription(Base):
    __tablename__ = "prescriptions"

    prescription_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), nullable=False, index=True)
    patient_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("patients.patient_id"), nullable=False, index=True)
    doctor_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("doctors.doctor_id"), nullable=False, index=True)
    appointment_id: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("appointments.appointment_id"), index=True)
    # Set when the Rx is for a dependent booked under the patient's account.
    family_member_id: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("family_members.member_id"), index=True)
    diagnosis: Mapped[str] = mapped_column(Text, default="")
    advice: Mapped[str] = mapped_column(Text, default="")          # general notes / lifestyle advice
    follow_up_date: Mapped[Optional[date]] = mapped_column(Date)
    created_by: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    items: Mapped[list["PrescriptionItem"]] = relationship(
        back_populates="prescription", cascade="all, delete-orphan",
    )


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    item_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    prescription_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("prescriptions.prescription_id"), nullable=False, index=True)
    drug_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str] = mapped_column(String(100), default="")       # e.g. "500 mg"
    frequency: Mapped[str] = mapped_column(String(100), default="")    # e.g. "1-0-1 after food"
    duration: Mapped[str] = mapped_column(String(100), default="")     # e.g. "5 days"
    instructions: Mapped[str] = mapped_column(Text, default="")

    prescription: Mapped["Prescription"] = relationship(back_populates="items")
