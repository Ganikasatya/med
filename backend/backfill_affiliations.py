"""
One-off backfill: ensure every doctor has at least one practice location.

Doctors created through the API get a default clinic affiliation automatically
(_default_affiliation in routers/doctors.py). Doctors created by the original
seed did not — so the patient "Select clinic / practice location" dropdown was
empty and booking was impossible for them.

This script, for every doctor missing a clinic affiliation, creates one from the
doctor's hospital, then links any schedules that have no affiliation_id to it.
Safe to run multiple times (idempotent).

    cd backend
    python backfill_affiliations.py
"""
from sqlalchemy import select

from app.database import SessionLocal
from app.models import Doctor, DoctorAffiliation, DoctorSchedule, Hospital


def run() -> None:
    db = SessionLocal()
    created = 0
    linked = 0
    try:
        for doctor in db.scalars(select(Doctor)).all():
            clinic_aff = db.scalar(
                select(DoctorAffiliation).where(
                    DoctorAffiliation.doctor_id == doctor.doctor_id,
                    DoctorAffiliation.hospital_id == doctor.hospital_id,
                    DoctorAffiliation.practice_type == "clinic",
                )
            )
            if not clinic_aff:
                hospital = db.get(Hospital, doctor.hospital_id)
                clinic_aff = DoctorAffiliation(
                    doctor_id=doctor.doctor_id,
                    hospital_id=doctor.hospital_id,
                    practice_type="clinic",
                    name=hospital.name if hospital else "Clinic",
                    city=hospital.city if hospital else "",
                    consultation_fee=doctor.consultation_fee,
                    mode="slot",
                    managed_by_hospital=True,
                )
                db.add(clinic_aff)
                db.flush()
                created += 1
                print(f"  + affiliation {clinic_aff.affiliation_id} for doctor {doctor.doctor_id} ({doctor.name})")

            # Attach orphaned (NULL-affiliation) schedules to the clinic affiliation.
            orphans = db.scalars(
                select(DoctorSchedule).where(
                    DoctorSchedule.doctor_id == doctor.doctor_id,
                    DoctorSchedule.affiliation_id.is_(None),
                )
            ).all()
            for s in orphans:
                s.affiliation_id = clinic_aff.affiliation_id
                linked += 1

        db.commit()
        print(f"Done. Created {created} affiliation(s), linked {linked} schedule(s).")
    finally:
        db.close()


if __name__ == "__main__":
    run()
