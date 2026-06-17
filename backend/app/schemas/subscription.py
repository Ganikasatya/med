"""Schemas for Module 10 — Subscription."""
from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class PlanCreate(BaseModel):
    name: str = Field(..., min_length=1)
    price_monthly: Decimal = Decimal(0)
    price_annually: Decimal = Decimal(0)
    max_doctors: int = -1
    max_departments: int = -1
    max_tokens_per_day: int = -1
    sms_quota_monthly: int = 0
    whatsapp_enabled: bool = False
    reports_enabled: bool = True
    api_access_enabled: bool = False
    features_json: Optional[dict] = None


class PlanUpdate(BaseModel):
    name: Optional[str] = None
    price_monthly: Optional[Decimal] = None
    price_annually: Optional[Decimal] = None
    max_doctors: Optional[int] = None
    max_departments: Optional[int] = None
    max_tokens_per_day: Optional[int] = None
    sms_quota_monthly: Optional[int] = None
    whatsapp_enabled: Optional[bool] = None
    reports_enabled: Optional[bool] = None
    api_access_enabled: Optional[bool] = None
    is_active: Optional[bool] = None


class PlanOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    plan_id: int
    name: str
    price_monthly: Decimal
    price_annually: Decimal
    max_doctors: int
    max_departments: int
    max_tokens_per_day: int
    sms_quota_monthly: int
    whatsapp_enabled: bool
    reports_enabled: bool
    api_access_enabled: bool
    features_json: Optional[dict] = None
    is_active: bool


class SubscriptionCreate(BaseModel):
    hospital_id: int
    plan_id: int
    billing_cycle: Literal["monthly", "annually"] = "monthly"
    status: Literal["trial", "active"] = "trial"
    trial_days: int = 14
    discount_pct: Decimal = Decimal(0)


class SubscriptionUpdate(BaseModel):
    plan_id: Optional[int] = None
    billing_cycle: Optional[Literal["monthly", "annually"]] = None
    status: Optional[Literal["trial", "active", "expired", "cancelled", "suspended"]] = None
    auto_renew: Optional[bool] = None
    discount_pct: Optional[Decimal] = None


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    subscription_id: int
    hospital_id: int
    plan_id: int
    status: str
    billing_cycle: str
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    trial_end_date: Optional[date] = None
    auto_renew: bool
    discount_pct: Decimal


class InvoiceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    invoice_id: int
    subscription_id: int
    hospital_id: int
    invoice_number: str
    amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    currency: str
    due_date: Optional[date] = None
    paid_date: Optional[date] = None
    status: str
    created_at: datetime
