"""
One-off migration: add the travel-origin / leave-by columns and give existing
clinics a default location.

The app creates tables with Base.metadata.create_all(), which never ALTERs an
existing table — so these ADD COLUMNs are applied here. Idempotent: safe to run
repeatedly (every statement is IF NOT EXISTS / guarded).

Run from the backend dir with the project venv:
    python migrate_travel.py
"""
from sqlalchemy import text

from app.database import engine

DDL = [
    # Clinic location (destination of the travel estimate).
    "ALTER TABLE hospitals    ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9,6)",
    "ALTER TABLE hospitals    ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6)",
    # Per-practice-location coords (a doctor's "another clinic"/home practice has
    # its own destination, independent of the hospital).
    "ALTER TABLE doctor_affiliations ADD COLUMN IF NOT EXISTS latitude  NUMERIC(9,6)",
    "ALTER TABLE doctor_affiliations ADD COLUMN IF NOT EXISTS longitude NUMERIC(9,6)",
    # Travel origin captured at booking, carried onto the token.
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS origin_lat     NUMERIC(9,6)",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS origin_lng     NUMERIC(9,6)",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS origin_label   VARCHAR(120) DEFAULT ''",
    "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS travel_minutes INTEGER",
    "ALTER TABLE tokens       ADD COLUMN IF NOT EXISTS origin_lat     NUMERIC(9,6)",
    "ALTER TABLE tokens       ADD COLUMN IF NOT EXISTS origin_lng     NUMERIC(9,6)",
    "ALTER TABLE tokens       ADD COLUMN IF NOT EXISTS origin_label   VARCHAR(120) DEFAULT ''",
    "ALTER TABLE tokens       ADD COLUMN IF NOT EXISTS travel_minutes INTEGER",
]

# Seed a location for any clinic that doesn't have one yet so the demo works.
# Bengaluru city centre (the seeded "City Care Hospital" is in Bengaluru).
SEED = "UPDATE hospitals SET latitude = 12.971600, longitude = 77.594600 WHERE latitude IS NULL"


def main() -> None:
    with engine.begin() as conn:
        for stmt in DDL:
            conn.execute(text(stmt))
            print("ok:", stmt)
        result = conn.execute(text(SEED))
        print(f"ok: seeded location on {result.rowcount} clinic(s) without one")
    print("Migration complete.")


if __name__ == "__main__":
    main()
