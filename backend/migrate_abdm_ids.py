"""
One-off migration: add the optional ABDM registry IDs for doctors and clinics.

  doctors.hpr_id   — Healthcare Professionals Registry ID (the doctor's national
                     professional identifier under ABDM).
  hospitals.hfr_id — Health Facility Registry ID (the clinic/hospital's national
                     facility identifier under ABDM).

Both are optional now (nullable) so the columns exist before ABDM integration is
mandated — no scramble later. Companion to migrate_abha.py (patients.abha_number).

create_all() never ALTERs an existing table, so we apply the ADD COLUMNs here.
Idempotent: every statement is IF NOT EXISTS, safe to run repeatedly.

Run from the backend dir with the project venv:
    python migrate_abdm_ids.py
"""
from sqlalchemy import text

from app.database import engine

DDL = [
    "ALTER TABLE doctors   ADD COLUMN IF NOT EXISTS hpr_id VARCHAR(64)",
    "ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS hfr_id VARCHAR(64)",
    "CREATE INDEX IF NOT EXISTS ix_doctors_hpr_id   ON doctors   (hpr_id)",
    "CREATE INDEX IF NOT EXISTS ix_hospitals_hfr_id ON hospitals (hfr_id)",
]


def main() -> None:
    with engine.begin() as conn:
        for stmt in DDL:
            conn.execute(text(stmt))
            print("ok:", stmt)
    print("Migration complete.")


if __name__ == "__main__":
    main()
