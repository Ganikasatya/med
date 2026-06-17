"""
Audit middleware — writes one immutable audit_logs row per successful mutating
request (POST/PUT/PATCH/DELETE), capturing who/what/where/when.

It decodes the caller from the Bearer token, derives module+action+entity from
the path, and records IP, user-agent and a generated request id (also returned
as the X-Request-ID header). Failures here never break the request.
"""
from uuid import uuid4

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from .database import SessionLocal
from .models import AuditLog, User
from .security import decode_access_token

_MUTATING = {"POST", "PUT", "PATCH", "DELETE"}
_SKIP_PREFIXES = ("/docs", "/openapi", "/redoc", "/health", "/favicon")


def _entity_id_from_path(parts: list[str]) -> int | None:
    for seg in reversed(parts):
        if seg.isdigit():
            return int(seg)
    return None


class AuditMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = uuid4().hex
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id

        try:
            if request.method in _MUTATING and response.status_code < 400:
                path = request.url.path
                if not path.startswith(_SKIP_PREFIXES):
                    self._record(request, path, request.method, response.status_code, request_id)
        except Exception:
            pass  # auditing must never break the actual request
        return response

    def _record(self, request: Request, path: str, method: str, status_code: int, request_id: str) -> None:
        parts = [p for p in path.strip("/").split("/") if p]
        module = parts[0] if parts else "root"
        entity_id = _entity_id_from_path(parts)

        user_id = role = hospital_id = None
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            payload = decode_access_token(auth[7:])
            if payload and payload.get("type") == "access":
                role = payload.get("role")
                try:
                    user_id = int(payload["sub"])
                except (KeyError, TypeError, ValueError):
                    user_id = None

        db = SessionLocal()
        try:
            if user_id:
                u = db.get(User, user_id)
                if u:
                    hospital_id = u.hospital_id
                    role = u.role.name if u.role else role
            db.add(AuditLog(
                hospital_id=hospital_id, user_id=user_id, user_role=role,
                module=module, action=f"{module}.{method.lower()}",
                entity_type=module, entity_id=entity_id,
                new_value={"status_code": status_code, "path": path, "method": method},
                ip_address=request.client.host if request.client else None,
                user_agent=request.headers.get("user-agent"),
                request_id=request_id,
            ))
            db.commit()
        finally:
            db.close()
