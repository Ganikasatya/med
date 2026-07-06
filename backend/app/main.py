"""
TapCure — Healthcare Appointment & Token Platform — backend API.

Multi-tenant SaaS (FastAPI + SQLAlchemy). Built phase-by-phase against the
full-architecture deck. SQLite by default; MySQL/Postgres via DATABASE_URL.

  Phase 1 (current): Security/RBAC + Hospital/Department
  Run:  uvicorn app.main:app --reload --port 8000
  Docs: http://localhost:8000/docs
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import models  # noqa: F401  (register all tables on Base.metadata)
from .config import settings
from .database import Base, SessionLocal, engine
from .middleware import AuditMiddleware
from .routers import (
    appointments, audit, auth, departments, doctors, hospitals, notifications,
    patients, payments, prescriptions, reception, reports, subscriptions, tokens,
    users, voice,
)
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Zero-setup local dev (SQLite) builds the schema from the models directly.
    # On any real DB (Postgres/MySQL) the schema is owned by Alembic ONLY — never
    # create_all, or it races the migrations and teammates get "already exists"
    # errors on `alembic upgrade head`. Single source of truth = Alembic there.
    if engine.dialect.name == "sqlite":
        Base.metadata.create_all(bind=engine)
    if settings.seed_on_startup:
        db = SessionLocal()
        try:
            if seed(db):
                print("[seed] RBAC + demo tenant seeded")
        finally:
            db.close()
    yield


app = FastAPI(
    title="TapCure — Healthcare Appointment & Token Platform",
    version=settings.app_version,
    description="Multi-tenant hospital OP queue SaaS — Security/RBAC + Hospital modules (Phase 1).",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# Immutable audit trail for every mutating request (Module 12).
app.add_middleware(AuditMiddleware)

for r in (auth, users, hospitals, departments, doctors, reception, patients,
          appointments, prescriptions, tokens, payments, notifications, subscriptions, reports, audit, voice):
    app.include_router(r.router)

# Serve uploaded files (patient/doctor photos, clinic logos, documents). Dev uses
# local disk under backend/uploads; swap for S3/CDN in production.
_UPLOADS_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(_UPLOADS_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_UPLOADS_DIR), name="uploads")


@app.get("/", tags=["meta"])
def root():
    return {"service": "TapCure Platform API", "version": settings.app_version,
            "phase": "1 — Security/RBAC + Hospital", "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["meta"])
def health():
    return {"status": "healthy"}
