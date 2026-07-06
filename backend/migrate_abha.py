"""
One-off migration: add the optional ABHA (Ayushman Bharat Health Account)
columns to the patients table.

ABHA is set to become the national health identifier; we add the columns now
(nullable / optional) so the field exists before it's mandated — no scramble
later. abha_number is the 14-digit ID (stored digits-only); abha_address is the
PHR handle (e.g. name@abdm).

create_all() never ALTERs an existing table, so we apply the ADD COLUMNs here.
Idempotent: every statement is IF NOT EXISTS, safe to run repeatedly.

Run from the backend dir with the project venv:
    python migrate_abha.py
"""
from sqlalchemy import text

from app.database import engine

DDL = [
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_number  VARCHAR(17)",
    "ALTER TABLE patients ADD COLUMN IF NOT EXISTS abha_address VARCHAR(64)",
    "CREATE INDEX IF NOT EXISTS ix_patients_abha_number ON patients (abha_number)",
]


def main() -> None:
    with engine.begin() as conn:
        for stmt in DDL:
            conn.execute(text(stmt))
            print("ok:", stmt)
    print("Migration complete.")


if __name__ == "__main__":
    main()
