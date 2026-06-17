"""Module 2 — Department endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import ensure_same_tenant, require_permission
from ..models import Department, Hospital, User
from ..schemas.hospital import DepartmentCreate, DepartmentOut, DepartmentUpdate
from ..services import audit

router = APIRouter(prefix="/departments", tags=["departments"])


def _require(db: Session, department_id: int) -> Department:
    d = db.get(Department, department_id)
    if not d:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Department not found")
    return d


@router.get("", response_model=list[DepartmentOut])
def list_departments(
    hospital_id: int | None = Query(None),
    me: User = Depends(require_permission("department", "read")),
    db: Session = Depends(get_db),
):
    is_super = bool(me.role and me.role.name == "SUPER_ADMIN")
    stmt = select(Department)
    if is_super:
        if hospital_id is not None:
            stmt = stmt.where(Department.hospital_id == hospital_id)
    else:
        stmt = stmt.where(Department.hospital_id == me.hospital_id)
    return db.scalars(stmt.order_by(Department.department_id)).all()


@router.post("", response_model=DepartmentOut, status_code=201)
def create_department(body: DepartmentCreate, me: User = Depends(require_permission("department", "create")), db: Session = Depends(get_db)):
    ensure_same_tenant(me, body.hospital_id)
    if not db.get(Hospital, body.hospital_id):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid hospital_id")
    d = Department(**body.model_dump())
    db.add(d)
    audit.log_activity(db, me.user_id, "department.create", "department")
    db.commit()
    db.refresh(d)
    return d


@router.put("/{department_id}", response_model=DepartmentOut)
def update_department(department_id: int, body: DepartmentUpdate, me: User = Depends(require_permission("department", "update")), db: Session = Depends(get_db)):
    d = _require(db, department_id)
    ensure_same_tenant(me, d.hospital_id)
    for k, v in body.model_dump(exclude_unset=True).items():
        setattr(d, k, v)
    db.commit()
    db.refresh(d)
    return d


@router.delete("/{department_id}")
def deactivate_department(department_id: int, me: User = Depends(require_permission("department", "delete")), db: Session = Depends(get_db)):
    d = _require(db, department_id)
    ensure_same_tenant(me, d.hospital_id)
    d.is_active = False
    db.commit()
    return {"message": "Department deactivated"}
