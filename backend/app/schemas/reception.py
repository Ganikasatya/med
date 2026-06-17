"""Schemas for Module 4 — Reception."""
from datetime import date, time
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ReceptionistCreate(BaseModel):
    user_id: int
    hospital_id: int
    employee_id: Optional[str] = None
    designation: str = "Front Desk Executive"
    departments_assigned: Optional[List[int]] = None
    joined_date: Optional[date] = None


class ReceptionistOnboard(BaseModel):
    """Admin adds a receptionist to their own clinic, creating the login too."""
    name: str = Field(..., min_length=1)
    email: EmailStr
    phone: Optional[str] = Field(None, pattern=r"^\d{10}$")
    password: str = Field(..., min_length=6, max_length=128)
    employee_id: Optional[str] = None
    designation: str = "Front Desk Executive"


class StaffOut(BaseModel):
    """Receptionist record enriched with their login's display fields."""
    model_config = ConfigDict(from_attributes=True)
    receptionist_id: int
    user_id: int
    hospital_id: int
    employee_id: Optional[str] = None
    designation: str
    is_active: bool
    joined_date: Optional[date] = None
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class ReceptionistUpdate(BaseModel):
    employee_id: Optional[str] = None
    designation: Optional[str] = None
    departments_assigned: Optional[List[int]] = None
    is_active: Optional[bool] = None


class ReceptionistOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    receptionist_id: int
    user_id: int
    hospital_id: int
    employee_id: Optional[str] = None
    designation: str
    departments_assigned: Optional[List[int]] = None
    is_active: bool
    joined_date: Optional[date] = None


class ShiftCreate(BaseModel):
    receptionist_id: int
    hospital_id: int
    shift_date: date
    start_time: time
    end_time: time
    department_id: Optional[int] = None
    notes: str = ""


class ShiftUpdate(BaseModel):
    shift_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    department_id: Optional[int] = None
    notes: Optional[str] = None


class ShiftOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    shift_id: int
    receptionist_id: int
    hospital_id: int
    shift_date: date
    start_time: time
    end_time: time
    department_id: Optional[int] = None
    notes: str
