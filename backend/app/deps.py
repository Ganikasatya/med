"""
Auth & authorization dependencies.

  get_current_user      resolve + validate the Bearer access token
  get_optional_user     same but returns None instead of raising
  require_permission     RBAC guard: role must hold (module, action)
  require_role           coarse guard by role name
  ensure_same_tenant     multi-tenant scoping: non-super-admins are confined to
                         their own hospital_id
"""
from typing import Callable, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import exists, select
from sqlalchemy.orm import Session

from .database import get_db
from .models import Permission, RolePermission, User
from .rbac import ROLE_PATIENT, ROLE_SUPER_ADMIN
from .security import decode_access_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

_CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise _CREDENTIALS_ERROR
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "access" or "sub" not in payload:
        raise _CREDENTIALS_ERROR
    try:
        user_id = int(payload["sub"])
    except (TypeError, ValueError):
        raise _CREDENTIALS_ERROR
    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise _CREDENTIALS_ERROR
    return user


def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    if not token:
        return None
    payload = decode_access_token(token)
    if not payload or payload.get("type") != "access" or "sub" not in payload:
        return None
    try:
        user = db.get(User, int(payload["sub"]))
    except (TypeError, ValueError):
        return None
    return user if user and user.is_active else None


def user_has_permission(db: Session, user: User, module: str, action: str) -> bool:
    if user.role and user.role.name == ROLE_SUPER_ADMIN:
        return True
    return bool(
        db.scalar(
            select(
                exists().where(
                    RolePermission.role_id == user.role_id,
                    RolePermission.permission_id == Permission.permission_id,
                    Permission.module == module,
                    Permission.action == action,
                )
            )
        )
    )


def require_permission(module: str, action: str) -> Callable[..., User]:
    """Dependency factory: caller's role must hold (module, action)."""

    def _guard(
        user: User = Depends(get_current_user), db: Session = Depends(get_db)
    ) -> User:
        if not user_has_permission(db, user, module, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing permission: {module}.{action}",
            )
        return user

    return _guard


def require_role(*role_names: str) -> Callable[..., User]:
    def _guard(user: User = Depends(get_current_user)) -> User:
        if not user.role or user.role.name not in role_names:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires role: {', '.join(role_names)}",
            )
        return user

    return _guard


def ensure_same_tenant(user: User, hospital_id: Optional[int]) -> None:
    """Confine clinic staff to their own hospital.

    No-op for SUPER_ADMIN (platform owner) and PATIENT (global marketplace user
    who browses/books across every clinic). Patient-record and patient-appointment
    endpoints enforce per-record ownership separately, so patients still can't
    read other patients' data — only catalog/queue-board data is cross-tenant.
    """
    if user.role and user.role.name in (ROLE_SUPER_ADMIN, ROLE_PATIENT):
        return
    if hospital_id is not None and user.hospital_id != hospital_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-tenant access denied",
        )
