"""
SQLAlchemy engine, session factory and declarative Base.

`get_db` is the FastAPI dependency every router uses to obtain a request-scoped
session that is always closed afterwards.
"""
from datetime import datetime, timezone
from typing import Generator

from sqlalchemy import BigInteger, Integer, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import settings

# Portable BIGINT primary key: the deck specifies BIGINT, but SQLite only
# autoincrements INTEGER affinity columns — so it renders as INTEGER on SQLite
# and BIGINT on MySQL/Postgres. Reused across every PK/FK column.
BigIntPK = BigInteger().with_variant(Integer, "sqlite")


def utcnow() -> datetime:
    # Naive UTC: SQLite returns naive datetimes on read, so storing naive UTC
    # keeps all comparisons consistent across SQLite/MySQL/Postgres.
    return datetime.now(timezone.utc).replace(tzinfo=None)

# Per-driver connection args:
#  - SQLite needs check_same_thread=False to be used across FastAPI's threadpool.
#  - Postgres columns are timestamptz, but the app writes *naive* UTC (utcnow()).
#    Without a fixed session timezone, Postgres interprets those naive values in
#    the server's local tz (e.g. IST +05:30) — so stored instants come back
#    hours off and elapsed/ETA timers read e.g. "331:26". Pinning the session
#    timezone to UTC makes it interpret the naive UTC values as UTC.
if settings.database_url.startswith("sqlite"):
    _connect_args = {"check_same_thread": False}
elif settings.database_url.startswith("postgresql"):
    _connect_args = {"options": "-c timezone=utc"}
else:
    _connect_args = {}

engine = create_engine(
    settings.database_url,
    connect_args=_connect_args,
    pool_pre_ping=True,
    echo=False,
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
)


class Base(DeclarativeBase):
    """Declarative base for all ORM models."""


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
