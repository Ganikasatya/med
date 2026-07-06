"""
One-off migration: doctor credential verification (solo self-registered doctors).

Adds the verification columns to `doctors` and creates the `doctor_documents`
table that holds uploaded credential files (registration certificate, degree,
council proof) reviewed manually by a Super Admin.

  doctors.verification_status  — 'verified' (default) | 'pending' | 'rejected'
  doctors.is_self_registered   — solo doctor who signed up themselves
  doctors.verified_at / _by     — audit of the manual review
  doctors.rejection_reason      — shown to the doctor if rejected
  doctor_documents              — one row per uploaded credential file

Defaults to 'verified' so every existing row and every clinic-onboarded doctor
stays trusted — only self-registration sets 'pending'.

create_all() never ALTERs an existing table, so we apply the ADD COLUMNs here.
Idempotent: every statement is IF NOT EXISTS, safe to run repeatedly.

Run from the backend dir with the project venv:
    python migrate_doctor_verification.py
"""
from sqlalchemy import text

from app.database import engine

DDL = [
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verification_status VARCHAR(12) NOT NULL DEFAULT 'verified'",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS is_self_registered BOOLEAN NOT NULL DEFAULT FALSE",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS verified_by BIGINT REFERENCES users(user_id)",
    "ALTER TABLE doctors ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
    "CREATE INDEX IF NOT EXISTS ix_doctors_verification_status ON doctors (verification_status)",
    """
    CREATE TABLE IF NOT EXISTS doctor_documents (
        document_id  BIGSERIAL PRIMARY KEY,
        doctor_id    BIGINT NOT NULL REFERENCES doctors(doctor_id) ON DELETE CASCADE,
        doc_type     VARCHAR(32) NOT NULL DEFAULT 'other',
        label        VARCHAR(120) NOT NULL DEFAULT '',
        file_url     VARCHAR(255) NOT NULL,
        file_size_kb INTEGER NOT NULL DEFAULT 0,
        uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    )
    """,
    "CREATE INDEX IF NOT EXISTS ix_doctor_documents_doctor_id ON doctor_documents (doctor_id)",
]


def main() -> None:
    with engine.begin() as conn:
        for stmt in DDL:
            conn.execute(text(stmt))
    print("doctor verification migration applied.")


if __name__ == "__main__":
    main()
