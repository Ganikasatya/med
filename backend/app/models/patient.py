"""
Module 5 — Patient.

patients            master record (phone = primary identifier for rural patients)
family_members      dependents booked under one patient
medical_history     chronic/past conditions (ICD-coded)
allergies           allergen + severity
patient_documents   uploaded files (prescriptions, lab reports, scans, id proof)

Multi-tenant note: the deck marks patient.phone UNIQUE; here it's unique
*per hospital* (composite) so the same person can exist across tenants. An
optional user_id links a patient to their app-login account (self-service).
"""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, ForeignKey, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, BigIntPK, utcnow

GENDERS = ("Male", "Female", "Other")
REGISTRATION_SOURCES = ("app", "whatsapp", "csc", "walkin", "phone")
ALLERGY_TYPES = ("drug", "food", "environmental", "other")
ALLERGY_SEVERITIES = ("Mild", "Moderate", "Severe", "Life-threatening")
DOCUMENT_TYPES = ("prescription", "lab_report", "scan", "id_proof", "other")


class Patient(Base):
    __tablename__ = "patients"
    __table_args__ = (UniqueConstraint("hospital_id", "phone", name="uq_patient_hospital_phone"),)

    patient_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), nullable=False, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"), index=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(15), nullable=False, index=True)
    email: Mapped[Optional[str]] = mapped_column(String(100))
    dob: Mapped[Optional[date]] = mapped_column(Date)
    age: Mapped[Optional[int]] = mapped_column()
    gender: Mapped[Optional[str]] = mapped_column(String(8))
    blood_group: Mapped[Optional[str]] = mapped_column(String(5))
    address: Mapped[str] = mapped_column(Text, default="")
    city: Mapped[str] = mapped_column(String(100), default="")
    pincode: Mapped[str] = mapped_column(String(10), default="")
    emergency_contact_name: Mapped[Optional[str]] = mapped_column(String(100))
    emergency_contact_phone: Mapped[Optional[str]] = mapped_column(String(15))
    preferred_language: Mapped[str] = mapped_column(String(50), default="English")
    is_registered: Mapped[bool] = mapped_column(Boolean, default=False)  # verified vs walk-in
    registration_source: Mapped[str] = mapped_column(String(12), default="walkin")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    family_members: Mapped[list["FamilyMember"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    medical_history: Mapped[list["MedicalHistory"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    allergies: Mapped[list["Allergy"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )
    documents: Mapped[list["PatientDocument"]] = relationship(
        back_populates="patient", cascade="all, delete-orphan"
    )


class FamilyMember(Base):
    __tablename__ = "family_members"

    member_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("patients.patient_id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    relation: Mapped[str] = mapped_column(String(50), default="")
    phone: Mapped[Optional[str]] = mapped_column(String(15))
    dob: Mapped[Optional[date]] = mapped_column(Date)
    gender: Mapped[Optional[str]] = mapped_column(String(8))
    blood_group: Mapped[Optional[str]] = mapped_column(String(5))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="family_members")


class MedicalHistory(Base):
    __tablename__ = "medical_history"

    history_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("patients.patient_id"), nullable=False, index=True)
    condition: Mapped[str] = mapped_column(String(200), nullable=False)
    icd_code: Mapped[Optional[str]] = mapped_column(String(20))
    diagnosed_date: Mapped[Optional[date]] = mapped_column(Date)
    is_chronic: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_by: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="medical_history")


class Allergy(Base):
    __tablename__ = "allergies"

    allergy_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("patients.patient_id"), nullable=False, index=True)
    allergen: Mapped[str] = mapped_column(String(100), nullable=False)
    allergy_type: Mapped[str] = mapped_column(String(16), default="other")
    severity: Mapped[str] = mapped_column(String(20), default="Mild")
    reaction: Mapped[str] = mapped_column(Text, default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="allergies")


class PatientDocument(Base):
    __tablename__ = "patient_documents"

    document_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    patient_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("patients.patient_id"), nullable=False, index=True)
    document_type: Mapped[str] = mapped_column(String(16), default="other")
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(String(500), default="")
    file_size_kb: Mapped[Optional[int]] = mapped_column()
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    uploaded_by: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("users.user_id"))
    appointment_id: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("appointments.appointment_id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    patient: Mapped["Patient"] = relationship(back_populates="documents")
