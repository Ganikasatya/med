"""
Module 10 — Subscription (the SaaS billing layer).

plans          pricing tiers + plan limits (max doctors/departments/tokens, quotas)
subscriptions  a hospital's active plan (trial/active/expired…) + billing cycle
invoices       generated bills against a subscription
"""
from datetime import date, datetime
from typing import Optional

from sqlalchemy import (
    JSON, Boolean, Date, DateTime, ForeignKey, Numeric, String, Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..database import Base, BigIntPK, utcnow

SUBSCRIPTION_STATUSES = ("trial", "active", "expired", "cancelled", "suspended")
BILLING_CYCLES = ("monthly", "annually")
INVOICE_STATUSES = ("draft", "sent", "paid", "overdue", "void")


class Plan(Base):
    __tablename__ = "plans"

    plan_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    price_monthly: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    price_annually: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    max_doctors: Mapped[int] = mapped_column(default=-1)        # -1 = unlimited
    max_departments: Mapped[int] = mapped_column(default=-1)
    max_tokens_per_day: Mapped[int] = mapped_column(default=-1)
    sms_quota_monthly: Mapped[int] = mapped_column(default=0)
    whatsapp_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    reports_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    api_access_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    features_json: Mapped[Optional[dict]] = mapped_column(JSON)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    subscription_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), nullable=False, index=True)
    plan_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("plans.plan_id"), nullable=False)
    status: Mapped[str] = mapped_column(String(12), default="trial", index=True)
    billing_cycle: Mapped[str] = mapped_column(String(10), default="monthly")
    start_date: Mapped[Optional[date]] = mapped_column(Date)
    end_date: Mapped[Optional[date]] = mapped_column(Date)
    trial_end_date: Mapped[Optional[date]] = mapped_column(Date)
    auto_renew: Mapped[bool] = mapped_column(Boolean, default=True)
    discount_pct: Mapped[float] = mapped_column(Numeric(5, 2), default=0)
    razorpay_subscription_id: Mapped[Optional[str]] = mapped_column(String(100))
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    cancel_reason: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    plan: Mapped["Plan"] = relationship()
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="subscription", cascade="all, delete-orphan")


class Invoice(Base):
    __tablename__ = "invoices"

    invoice_id: Mapped[int] = mapped_column(BigIntPK, primary_key=True, autoincrement=True)
    subscription_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("subscriptions.subscription_id"), nullable=False, index=True)
    hospital_id: Mapped[int] = mapped_column(BigIntPK, ForeignKey("hospitals.hospital_id"), index=True)
    plan_id: Mapped[Optional[int]] = mapped_column(BigIntPK, ForeignKey("plans.plan_id"))
    invoice_number: Mapped[str] = mapped_column(String(50), unique=True)
    amount: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    tax_amount: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    total_amount: Mapped[float] = mapped_column(Numeric(8, 2), default=0)
    currency: Mapped[str] = mapped_column(String(3), default="INR")
    due_date: Mapped[Optional[date]] = mapped_column(Date)
    paid_date: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(12), default="sent")
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    subscription: Mapped["Subscription"] = relationship(back_populates="invoices")
