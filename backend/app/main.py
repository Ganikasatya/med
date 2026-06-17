"""
Rural Digital OP Queue Management Platform — backend API.

Multi-tenant SaaS (FastAPI + SQLAlchemy). Built phase-by-phase against the
full-architecture deck. SQLite by default; MySQL/Postgres via DATABASE_URL.

  Phase 1 (current): Security/RBAC + Hospital/Department
  Run:  uvicorn app.main:app --reload --port 8000
  Docs: http://localhost:8000/docs
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (register all tables on Base.metadata)
from .config import settings
from .database import Base, SessionLocal, engine
from .middleware import AuditMiddleware
from .routers import (
    appointments, audit, auth, departments, doctors, hospitals, notifications,
    patients, reception, reports, subscriptions, tokens, users, voice,
)
from .seed import seed


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)  # dev convenience; prod uses Alembic
    if settings.seed_on_startup:
        db = SessionLocal()
        try:
            if seed(db):
                print("[seed] RBAC + demo tenant seeded")
        finally:
            db.close()
    yield


app = FastAPI(
    title="Rural Digital OP Queue Management Platform",
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
          appointments, tokens, notifications, subscriptions, reports, audit, voice):
    app.include_router(r.router)


@app.get("/", tags=["meta"])
def root():
    return {"service": "RuralOP Platform API", "version": settings.app_version,
            "phase": "1 — Security/RBAC + Hospital", "status": "ok", "docs": "/docs"}


@app.get("/health", tags=["meta"])
def health():
    return {"status": "healthy"}
