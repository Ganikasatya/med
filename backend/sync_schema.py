"""
sync_schema.py — bring an EXISTING database up to the current model schema,
data-safe. It only ADDS what's missing (new tables, new columns, new indexes)
and never drops or alters existing data.

Use it to upgrade an older copy of the DB (e.g. one from before ABHA / UHID /
photos / payments) to match the current code.

Run from this folder, with the target DB set:
    # set DATABASE_URL to the database you want to upgrade (in .env or env var)
    .venv/Scripts/python.exe sync_schema.py            # Windows
    python sync_schema.py                              # Linux/Mac

Safe to run repeatedly — if everything is already present it reports "nothing to add".
"""
from sqlalchemy import inspect, select, text
from sqlalchemy.dialects import postgresql

import app.models  # noqa: F401 — registers every table on Base.metadata
from app.database import Base, SessionLocal, engine
from app.models import Patient
from app.services import uhid


def _coltype(col) -> str:
    try:
        return col.type.compile(dialect=engine.dialect)
    except Exception:
        return col.type.compile(dialect=postgresql.dialect())


def main() -> None:
    print(f"Target DB: {engine.url.render_as_string(hide_password=True)}")
    insp = inspect(engine)
    pre_existing = set(insp.get_table_names())

    # 1) Create any tables the models have but the DB doesn't (checkfirst=True →
    #    never touches existing tables).
    Base.metadata.create_all(bind=engine)
    insp = inspect(engine)
    new_tables = sorted(set(insp.get_table_names()) - pre_existing)
    print(f"New tables created: {new_tables or 'none'}")

    # 2) Add any columns the models have but existing tables are missing.
    added_cols = []
    for table in Base.metadata.sorted_tables:
        if table.name not in pre_existing:
            continue  # freshly created above — already complete
        db_cols = {c["name"] for c in insp.get_columns(table.name)}
        for col in table.columns:
            if col.name in db_cols:
                continue
            ddl = f'ALTER TABLE "{table.name}" ADD COLUMN IF NOT EXISTS "{col.name}" {_coltype(col)}'
            with engine.begin() as conn:
                conn.execute(text(ddl))
            added_cols.append(f"{table.name}.{col.name}")
    print(f"Columns added: {added_cols or 'none'}")

    # 3) Backfill UHID for any patient missing one (before the unique index).
    db = SessionLocal()
    try:
        missing = db.scalars(select(Patient).where(Patient.uhid.is_(None))).all()
        for p in missing:
            p.uhid = uhid.allocate(db)
        if missing:
            db.commit()
        print(f"UHID backfilled for {len(missing)} patient(s)")
    finally:
        db.close()

    # 4) Create any indexes/unique constraints the models declare but are missing.
    insp = inspect(engine)
    made_idx = []
    for table in Base.metadata.sorted_tables:
        if table.name not in insp.get_table_names():
            continue
        have = {i["name"] for i in insp.get_indexes(table.name)}
        for idx in table.indexes:
            if idx.name in have:
                continue
            try:
                idx.create(bind=engine)
                made_idx.append(idx.name)
            except Exception as e:  # noqa: BLE001
                print(f"  (skipped index {idx.name}: {type(e).__name__})")
    print(f"Indexes created: {made_idx or 'none'}")

    print("Done — schema is now in sync with the models.")


if __name__ == "__main__":
    main()
