"""Phase 1 end-to-end smoke test (RBAC + multi-tenancy). No server needed."""
import os
import sys

os.environ["DATABASE_URL"] = "sqlite:///./_smoke.db"
if os.path.exists("_smoke.db"):
    os.remove("_smoke.db")

from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.seed import seed  # noqa: E402

Base.metadata.create_all(bind=engine)
_db = SessionLocal()
seed(_db)
_db.close()

c = TestClient(app)
failures = []


def check(name, cond, detail=""):
    print(f"[{'PASS' if cond else 'FAIL'}] {name}" + (f" — {detail}" if detail and not cond else ""))
    if not cond:
        failures.append(name)


def login(identifier, password):
    r = c.post("/auth/login", json={"identifier": identifier, "password": password})
    return r


def auth(tok):
    return {"Authorization": f"Bearer {tok}"}


# health
check("health", c.get("/health").json()["status"] == "healthy")

# super admin login -> token pair
r = login("superadmin@ruralop.com", "Super@123")
check("super admin login", r.status_code == 200 and "access_token" in r.json() and "refresh_token" in r.json(), r.text)
sa = r.json()
sa_h = auth(sa["access_token"])

# /auth/me
r = c.get("/auth/me", headers=sa_h)
check("auth/me", r.status_code == 200 and r.json()["email"] == "superadmin@ruralop.com")

# refresh rotation: old refresh becomes invalid
r = c.post("/auth/refresh", json={"refresh_token": sa["refresh_token"]})
check("refresh issues new pair", r.status_code == 200 and "access_token" in r.json(), r.text)
r2 = c.post("/auth/refresh", json={"refresh_token": sa["refresh_token"]})
check("old refresh revoked after rotation (401)", r2.status_code == 401, r2.text)

# bad password + login history records failure
check("bad password 401", login("superadmin@ruralop.com", "nope").status_code == 401)

# RBAC: patient cannot create a hospital
rp = login("patient@ruralop.com", "Patient@123").json()
pt_h = auth(rp["access_token"])
r = c.post("/hospitals", headers=pt_h, json={"name": "X", "short_code": "X1"})
check("patient create hospital forbidden (403)", r.status_code == 403, r.text)

# Super admin creates a second hospital
r = c.post("/hospitals", headers=sa_h, json={"name": "Rural PHC", "short_code": "PHC", "city": "Karimnagar"})
check("super admin create hospital (201)", r.status_code == 201, r.text)
phc_id = r.json()["hospital_id"] if r.status_code == 201 else None

# Hospital admin: tenant scoping
ra = login("admin@citycare.com", "Admin@123").json()
ad_h = auth(ra["access_token"])
admin_hospital = ra["user"]["hospital_id"]
r = c.get("/hospitals", headers=ad_h)
check("hospital admin sees only own hospital", r.status_code == 200 and len(r.json()) == 1 and r.json()[0]["hospital_id"] == admin_hospital, r.text)
# cannot read another tenant
r = c.get(f"/hospitals/{phc_id}", headers=ad_h)
check("cross-tenant hospital read forbidden (403)", r.status_code == 403, r.text)

# Hospital admin creates a receptionist — forced into own hospital, cannot be super admin
roles = c.get("/roles", headers=sa_h).json()
role_id = {x["name"]: x["role_id"] for x in roles}
r = c.post("/users", headers=ad_h, json={
    "name": "New Reception", "email": "rec2@citycare.com", "phone": "9111111111",
    "password": "Pass@123", "role_id": role_id["RECEPTIONIST"], "hospital_id": phc_id,
})
ok = r.status_code == 201 and r.json()["hospital_id"] == admin_hospital  # ignored phc_id, pinned to own
check("admin creates user pinned to own tenant", ok, r.text)
r = c.post("/users", headers=ad_h, json={
    "name": "Sneaky", "email": "sneaky@x.com", "phone": "9222222222",
    "password": "Pass@123", "role_id": role_id["SUPER_ADMIN"],
})
check("admin cannot mint SUPER_ADMIN (403)", r.status_code == 403, r.text)

# Departments scoped
r = c.get("/departments", headers=ad_h)
check("admin sees own departments (3 seeded)", r.status_code == 200 and len(r.json()) == 3, r.text)
r = c.post("/departments", headers=ad_h, json={"hospital_id": admin_hospital, "name": "ENT", "code": "ENT"})
check("admin creates department (201)", r.status_code == 201, r.text)

# Settings update
r = c.put(f"/hospitals/{admin_hospital}/settings", headers=ad_h, json={"booking_fee": 40, "whatsapp_enabled": True})
check("admin updates settings", r.status_code == 200 and float(r.json()["booking_fee"]) == 40.0, r.text)

# forgot/reset password round-trip
r = c.post("/auth/forgot-password", json={"identifier": "patient@ruralop.com"})
otp = r.json().get("dev_otp")
check("forgot-password returns dev otp", bool(otp), r.text)
r = c.post("/auth/reset-password", json={"identifier": "patient@ruralop.com", "otp": otp, "new_password": "NewPass@1"})
check("reset-password ok", r.status_code == 200, r.text)
check("login with new password", login("patient@ruralop.com", "NewPass@1").status_code == 200)

# change-password
r = c.post("/auth/change-password", headers=ad_h, json={"old_password": "Admin@123", "new_password": "Admin@999"})
check("change-password ok", r.status_code == 200, r.text)
check("login with changed password", login("admin@citycare.com", "Admin@999").status_code == 200)

# audit views
r = c.get("/login-history", headers=sa_h)
check("login-history populated", r.status_code == 200 and len(r.json()) >= 1, r.text)
r = c.get("/activity-logs", headers=sa_h)
check("activity-logs populated", r.status_code == 200, r.text)

# unauthenticated protected route
check("users list without token 401", c.get("/users").status_code == 401)

# ============================ Phase 2: Doctor + Reception ====================
# Re-login admin (password was changed above) for tenant-scoped operations.
ad_h = auth(login("admin@citycare.com", "Admin@999").json()["access_token"])

# Doctor seeded + schedule
r = c.get("/doctors", headers=ad_h)
check("admin lists doctors (1 seeded)", r.status_code == 200 and len(r.json()) == 1, r.text)
doctor_id = r.json()[0]["doctor_id"]
r = c.get(f"/doctors/{doctor_id}", headers=ad_h)
check("doctor detail has 5 weekday schedules", r.status_code == 200 and len(r.json()["schedules"]) == 5, r.text)

# Doctor self-service (doctor role)
doc_h = auth(login("doctor@citycare.com", "Doctor@123").json()["access_token"])
check("doctor can read doctors", c.get("/doctors", headers=doc_h).status_code == 200)
check("doctor cannot create doctor (403)", c.post("/doctors", headers=doc_h, json={"hospital_id": admin_hospital}).status_code == 403)

# Add a Saturday schedule; overlapping Monday session rejected
r = c.post("/doctor-schedule", headers=ad_h, json={
    "doctor_id": doctor_id, "day_of_week": "Sat", "start_time": "09:00", "end_time": "12:00", "max_tokens": 30})
check("add Saturday schedule (201)", r.status_code == 201, r.text)
r = c.post("/doctor-schedule", headers=ad_h, json={
    "doctor_id": doctor_id, "day_of_week": "Mon", "start_time": "10:00", "end_time": "11:00"})
check("overlapping Monday schedule rejected (409)", r.status_code == 409, r.text)

# Break on a schedule
sched_id = c.get("/doctor-schedule", headers=ad_h, params={"doctor_id": doctor_id}).json()[0]["schedule_id"]
r = c.post("/doctor-breaks", headers=ad_h, json={"schedule_id": sched_id, "break_start": "11:00", "break_end": "11:15", "label": "Tea"})
check("add break (201)", r.status_code == 201, r.text)

# Holidays
r = c.post("/doctor-holidays", headers=ad_h, json={"doctor_id": doctor_id, "holiday_date": "2026-01-26", "reason": "Republic Day"})
check("add holiday (201)", r.status_code == 201, r.text)
check("list holidays", len(c.get("/doctor-holidays", headers=ad_h, params={"doctor_id": doctor_id}).json()) == 1)

# Delay log
r = c.post("/doctor-delay", headers=doc_h, json={"doctor_id": doctor_id, "delay_minutes": 20, "reason": "Emergency case"})
check("doctor logs delay (201)", r.status_code == 201, r.text)
check("list delays", len(c.get("/doctor-delay", headers=ad_h, params={"doctor_id": doctor_id}).json()) == 1)

# Leave workflow
r = c.post("/doctor-leave", headers=doc_h, json={"doctor_id": doctor_id, "leave_from": "2026-02-01", "leave_to": "2026-02-03", "leave_type": "casual", "reason": "Family"})
check("doctor submits leave (201, pending)", r.status_code == 201 and r.json()["status"] == "pending", r.text)
leave_id = r.json()["leave_id"]
r = c.put(f"/doctor-leave/{leave_id}", headers=ad_h, json={"status": "approved"})
check("admin approves leave", r.status_code == 200 and r.json()["status"] == "approved", r.text)
check("approved leave flips doctor to on_leave", c.get(f"/doctors/{doctor_id}", headers=ad_h).json()["status"] == "on_leave")

# Presence status
r = c.put("/doctor-status", headers=doc_h, params={"doctor_id": doctor_id}, json={"status": "available", "note": "At desk"})
check("set presence available", r.status_code == 200 and r.json()["status"] == "available", r.text)
check("get presence", c.get("/doctor-status", headers=ad_h, params={"doctor_id": doctor_id}).json()["status"] == "available")

# Reception
r = c.get("/receptionists", headers=ad_h)
check("admin lists receptionists (1 seeded)", r.status_code == 200 and len(r.json()) == 1, r.text)
rid = r.json()[0]["receptionist_id"]
r = c.post("/receptionist-shifts", headers=ad_h, json={
    "receptionist_id": rid, "hospital_id": admin_hospital, "shift_date": "2026-01-15",
    "start_time": "08:00", "end_time": "14:00"})
check("create receptionist shift (201)", r.status_code == 201, r.text)
check("list shifts", len(c.get("/receptionist-shifts", headers=ad_h, params={"receptionist_id": rid}).json()) == 1)

# ============================ Phase 3: Patient + Appointment =================
# Seeded patient (linked to patient user) visible via admin
r = c.get("/patients", headers=ad_h)
check("admin lists patients (1 seeded)", r.status_code == 200 and len(r.json()) == 1, r.text)
seed_patient_id = r.json()[0]["patient_id"]
r = c.get(f"/patients/{seed_patient_id}", headers=ad_h)
check("patient detail has family member", r.status_code == 200 and len(r.json()["family_members"]) == 1, r.text)

# Patient self-service scoping: a fresh patient login sees only own record
pt2 = login("patient@ruralop.com", "NewPass@1")  # password changed earlier in test
pt2_h = auth(pt2.json()["access_token"])
r = c.get("/patients", headers=pt2_h)
check("patient sees only own record", r.status_code == 200 and len(r.json()) == 1 and r.json()[0]["patient_id"] == seed_patient_id, r.text)

# Receptionist registers a new patient
rec_h = auth(login("reception@citycare.com", "Recep@123").json()["access_token"])
r = c.post("/patients", headers=rec_h, json={
    "hospital_id": admin_hospital, "name": "Lakshmi N", "phone": "9333333333",
    "gender": "Female", "city": "Bengaluru", "registration_source": "walkin"})
check("reception registers patient (201)", r.status_code == 201, r.text)
new_patient_id = r.json()["patient_id"]
# duplicate phone at same hospital rejected
check("duplicate patient phone rejected (409)",
      c.post("/patients", headers=rec_h, json={"hospital_id": admin_hospital, "name": "Dup", "phone": "9333333333"}).status_code == 409)

# Medical history + allergy + search
r = c.post("/medical-history", headers=rec_h, json={"patient_id": new_patient_id, "condition": "Type 2 Diabetes", "is_chronic": True})
check("add medical history (201)", r.status_code == 201, r.text)
r = c.post("/allergies", headers=rec_h, json={"patient_id": new_patient_id, "allergen": "Penicillin", "allergy_type": "drug", "severity": "Severe"})
check("add allergy (201)", r.status_code == 201, r.text)
check("search patient by phone", len(c.get("/patients/search", headers=rec_h, params={"q": "9333"}).json()) == 1)

# Available slots for the seeded doctor on a weekday
from datetime import date as _d, timedelta as _td  # noqa: E402
wd = _d.today() + _td(days=1)
while wd.weekday() > 4:
    wd += _td(days=1)
ds = wd.isoformat()
r = c.get("/appointments/available-slots", headers=rec_h, params={"doctor_id": doctor_id, "date": ds})
check("available-slots returns open slots", r.status_code == 200 and r.json()["available"] and r.json()["slot_count"] > 0, r.text)
first_slot = r.json()["slots"][0]["time"]

# Book an appointment, then double-book the same slot -> conflict
r = c.post("/appointments", headers=rec_h, json={
    "doctor_id": doctor_id, "patient_id": new_patient_id, "appointment_date": ds, "slot_time": first_slot, "source": "csc"})
check("book appointment (201)", r.status_code == 201, r.text)
appt_id = r.json()["appointment_id"]
r = c.post("/appointments", headers=rec_h, json={
    "doctor_id": doctor_id, "patient_id": new_patient_id, "appointment_date": ds, "slot_time": first_slot})
check("double-book same slot rejected (409)", r.status_code == 409, r.text)

# Booking on a Sunday (no schedule) rejected
sun = _d.today()
while sun.weekday() != 6:
    sun += _td(days=1)
r = c.post("/appointments", headers=rec_h, json={"doctor_id": doctor_id, "patient_id": new_patient_id, "appointment_date": sun.isoformat()})
check("book on non-working day rejected (409)", r.status_code == 409, r.text)

# Reschedule + history
nd = (wd + _td(days=7))
while nd.weekday() > 4:
    nd += _td(days=1)
r = c.post("/appointments/reschedule", headers=rec_h, json={"appointment_id": appt_id, "new_date": nd.isoformat(), "new_time": first_slot, "reason": "Patient request"})
check("reschedule appointment", r.status_code == 200 and r.json()["appointment_date"] == nd.isoformat(), r.text)
check("reschedule history recorded", len(c.get(f"/appointments/{appt_id}/reschedule-history", headers=rec_h).json()) == 1)

# Walk-in creates patient + appointment
r = c.post("/appointments/walk-in", headers=rec_h, json={"doctor_id": doctor_id, "name": "Mohan L", "phone": "9444444444"})
check("walk-in creates appointment (201)", r.status_code == 201 and r.json()["appointment_type"] == "walkin", r.text)

# Cancel + cancellation report + status history
r = c.post("/appointments/cancel", headers=rec_h, json={"appointment_id": appt_id, "reason": "Patient travelling"})
check("cancel appointment", r.status_code == 200 and r.json()["status"] == "cancelled", r.text)
check("cancellation report has entry", len(c.get("/appointments/cancellations", headers=rec_h).json()) >= 1)
hist = c.get(f"/appointments/{appt_id}/status-history", headers=rec_h).json()
check("status history tracks transitions", any(h["new_status"] == "cancelled" for h in hist), str(hist))

# Patient can view own upcoming appointments; not someone else's
r = c.get("/appointments/upcoming", headers=pt2_h, params={"patient_id": seed_patient_id})
check("patient views own upcoming", r.status_code == 200, r.text)
check("patient blocked from other's appointments (403)",
      c.get("/appointments/upcoming", headers=pt2_h, params={"patient_id": new_patient_id}).status_code == 403)

# Feedback
r = c.post("/appointments/feedback", headers=rec_h, json={"appointment_id": appt_id, "rating": 5, "comment": "Great"})
check("submit feedback", r.status_code == 200 and r.json()["rating"] == 5, r.text)

# ============================ Phase 4: Token Engine ==========================
# Walk-ins are same-day and schedule-independent → ideal for queue-flow testing.
wappts = []
for nm, ph in [("Queue A", "9555000001"), ("Queue B", "9555000002"), ("Queue C", "9555000003")]:
    rr = c.post("/appointments/walk-in", headers=rec_h, json={"doctor_id": doctor_id, "name": nm, "phone": ph})
    wappts.append(rr.json()["appointment_id"])

toks = []
for aid in wappts:
    rr = c.post("/tokens/generate", headers=rec_h, json={"appointment_id": aid})
    if rr.status_code == 201:
        toks.append(rr.json()["token"]["token_id"])
check("generate 3 tokens", len(toks) == 3, str(toks))
r = c.post("/tokens/generate", headers=rec_h, json={"appointment_id": wappts[0]})
check("duplicate token for appointment rejected (409)", r.status_code == 409, r.text)
check("patient cannot generate token (403)", c.post("/tokens/generate", headers=pt2_h, json={"appointment_id": wappts[0]}).status_code == 403)

# Queue + display
r = c.get("/tokens/queue", headers=rec_h, params={"doctor_id": doctor_id})
check("queue shows 3 waiting", r.status_code == 200 and r.json()["total_waiting"] == 3, r.text)
r = c.get("/tokens/live-display", headers=rec_h, params={"doctor_id": doctor_id})
check("live-display: nobody serving yet", r.status_code == 200 and r.json()["now_serving"] is None, r.text)

# Advance queue twice
r = c.post("/tokens/next", headers=rec_h, params={"doctor_id": doctor_id})
check("first next: current set, none completed", r.json()["current"] and r.json()["completed"] is None, r.text)
r = c.post("/tokens/next", headers=rec_h, params={"doctor_id": doctor_id})
check("second next: completes prev + serves next", r.json()["completed"] and r.json()["current"], r.text)

# Emergency jumps the queue
r = c.post("/emergency", headers=rec_h, json={"doctor_id": doctor_id, "condition_description": "Chest pain", "priority": "critical", "patient_name": "Emergency Joe", "patient_phone": "9555999999"})
check("create emergency (201)", r.status_code == 201, r.text)
r = c.get("/tokens/queue", headers=rec_h, params={"doctor_id": doctor_id})
waiting = r.json()["waiting"]
check("emergency is first in waiting queue", waiting and waiting[0]["priority"] == "emergency", str(waiting))

# Estimate for the front waiting token
r = c.get("/tokens/estimate", headers=rec_h, params={"token_id": waiting[0]["token_id"]})
check("estimate returns ETA", r.status_code == 200 and r.json()["queue_position"] == 1 and "estimated_time" in r.json(), r.text)

# Priority bump + recall + stats
r = c.put(f"/tokens/{toks[2]}/priority", headers=rec_h, json={"new_priority": "urgent"})
check("priority bump to urgent", r.status_code == 200 and r.json()["priority"] == "urgent", r.text)
cur = c.get("/tokens/current", headers=rec_h, params={"doctor_id": doctor_id}).json()
r = c.post("/tokens/recall", headers=rec_h, json={"token_id": cur["token_id"]})
check("recall current token", r.status_code == 200 and r.json()["recall_count"] == 1, r.text)
r = c.get("/tokens/stats", headers=rec_h, params={"doctor_id": doctor_id})
check("stats: at least 1 served", r.status_code == 200 and r.json()["served"] >= 1, r.text)

# No-show, audit trails
r = c.post("/tokens/missed", headers=rec_h, json={"token_id": toks[2]})
check("mark token missed", r.status_code == 200 and r.json()["status"] == "missed", r.text)
check("token history lists all", len(c.get("/tokens/history", headers=rec_h, params={"doctor_id": doctor_id}).json()) >= 4)
check("token status-history tracked", len(c.get(f"/tokens/{toks[0]}/status-history", headers=rec_h).json()) >= 2)
check("token movement-logs tracked", len(c.get(f"/tokens/{toks[0]}/movement-logs", headers=rec_h).json()) >= 1)
check("no-show report", c.get("/tokens/no-show", headers=rec_h).json()["count"] >= 1)

# Bulk cancel remaining
r = c.post("/tokens/bulk-cancel", headers=rec_h, json={"doctor_id": doctor_id})
check("bulk-cancel remaining", r.status_code == 200 and r.json()["cancelled"] >= 1, r.text)

# ============================ Phase 5: Notification ==========================
# Direct sends across channels
r = c.post("/sms/send", headers=rec_h, json={"phone": "9888000001", "message": "Hello from RuralOP", "type": "general"})
check("send SMS (201, delivered)", r.status_code == 201 and r.json()["channel"] == "sms" and r.json()["status"] == "sent", r.text)
r = c.post("/whatsapp/send", headers=rec_h, json={"phone": "9888000002", "message": "WA test"})
check("send WhatsApp (201)", r.status_code == 201 and r.json()["channel"] == "whatsapp", r.text)
r = c.post("/email/send", headers=rec_h, json={"to": "p@example.com", "subject": "Hi", "body": "Email test"})
check("send email (201)", r.status_code == 201 and r.json()["channel"] == "email", r.text)
r = c.post("/push/send", headers=rec_h, json={"device_token": "dev-123", "title": "Ping", "body": "Push test"})
check("send push (201)", r.status_code == 201 and r.json()["channel"] == "push", r.text)

# Bulk
r = c.post("/sms/bulk", headers=rec_h, json={"phones": ["9888000010", "9888000011", "9888000012"], "message": "Camp on Sunday"})
check("bulk SMS sends 3", r.status_code == 200 and r.json()["sent"] == 3, r.text)

# History + per-channel logs + stats
r = c.get("/notification-history", headers=rec_h)
check("notification history populated", r.status_code == 200 and len(r.json()) >= 7, r.text)
check("sms-logs populated", len(c.get("/sms-logs", headers=rec_h).json()) >= 4)
check("whatsapp-logs populated", len(c.get("/whatsapp-logs", headers=rec_h).json()) >= 1)
check("email-logs populated", len(c.get("/email-logs", headers=rec_h).json()) >= 1)
r = c.get("/notification-stats", headers=rec_h)
check("notification stats by channel", r.status_code == 200 and r.json()["total"] >= 7 and "sms" in r.json()["by_channel"], r.text)

# Templates + settings + test
check("templates listed", len(c.get("/notification-templates", headers=rec_h).json()["templates"]) >= 5)
r = c.post("/notification-settings", headers=ad_h, json={"hospital_id": admin_hospital, "whatsapp_enabled": True})
check("update notification settings", r.status_code == 200 and r.json()["whatsapp_enabled"] is True, r.text)
r = c.post("/notification-test", headers=rec_h, json={"channel": "sms", "phone": "9000000000"})
check("notification test send", r.status_code == 200 and r.json()["ok"], r.text)

# RBAC: doctor can read notifications but not send
doc_h2 = auth(login("doctor@citycare.com", "Doctor@123").json()["access_token"])
check("doctor can read notification history", c.get("/notification-history", headers=doc_h2).status_code == 200)
check("doctor cannot send SMS (403)", c.post("/sms/send", headers=doc_h2, json={"phone": "9000000000", "message": "x"}).status_code == 403)

# Token recall now actually dispatches a (mock) SMS to the patient
rr = c.post("/appointments/walk-in", headers=rec_h, json={"doctor_id": doctor_id, "name": "Notify Me", "phone": "9888777666"})
gen = c.post("/tokens/generate", headers=rec_h, json={"appointment_id": rr.json()["appointment_id"]})
ntok = gen.json()["token"]["token_id"]
r = c.post("/tokens/recall", headers=rec_h, json={"token_id": ntok, "recall_method": "sms"})
check("token recall notifies patient", r.status_code == 200 and r.json()["notified"] is True, r.text)
hist = c.get("/notification-history", headers=rec_h, params={"type": "recall"}).json()
check("recall created a notification record", len(hist) >= 1 and hist[0]["type"] == "recall", str(hist[:1]))

# ============================ Phase 6: Subscription + Reports + Audit ========
# Plans (3 seeded) + RBAC
r = c.get("/plans", headers=ad_h)
check("admin lists plans (3 seeded)", r.status_code == 200 and len(r.json()) == 3, r.text)
check("patient cannot list plans (403)", c.get("/plans", headers=pt2_h).status_code == 403)
plan_ids = {p["name"]: p["plan_id"] for p in r.json()}
r = c.post("/plans", headers=sa_h, json={"name": "Enterprise", "price_monthly": 9999})
check("super admin creates plan (201)", r.status_code == 201, r.text)
check("admin cannot create plan (403)", c.post("/plans", headers=ad_h, json={"name": "X"}).status_code == 403)

# Subscriptions: trial seeded, super admin adds an active one (→ invoice)
r = c.get("/subscriptions", headers=ad_h)
check("admin sees own subscription (1 trial)", r.status_code == 200 and len(r.json()) == 1, r.text)
r = c.get("/subscriptions/usage", headers=ad_h)
check("subscription usage vs limits", r.status_code == 200 and "usage" in r.json() and r.json()["usage"]["doctors"] >= 1, r.text)
r = c.post("/subscriptions", headers=sa_h, json={"hospital_id": admin_hospital, "plan_id": plan_ids["Large Hospital"], "status": "active", "billing_cycle": "monthly"})
check("super admin creates active subscription", r.status_code == 201, r.text)
sub_id = r.json()["subscription_id"]
check("active subscription issued an invoice", len(c.get("/invoices", headers=ad_h).json()) >= 1)
r = c.put(f"/subscriptions/{sub_id}", headers=ad_h, json={"auto_renew": False})
check("admin updates subscription", r.status_code == 200 and r.json()["auto_renew"] is False, r.text)
check("admin cannot cancel subscription (403)", c.delete(f"/subscriptions/{sub_id}", headers=ad_h).status_code == 403)
check("super admin cancels subscription", c.delete(f"/subscriptions/{sub_id}", headers=sa_h).status_code == 200)

# Reports (compute over today's token activity from earlier phases)
r = c.get("/reports/dashboard", headers=ad_h)
check("executive dashboard KPIs", r.status_code == 200 and "kpis" in r.json() and r.json()["kpis"]["doctors"] >= 1, r.text)
r = c.get("/reports/daily", headers=ad_h)
check("daily report computes", r.status_code == 200 and "total_tokens" in r.json(), r.text)
r = c.get("/reports/monthly", headers=ad_h)
check("monthly report computes", r.status_code == 200 and "no_show_rate" in r.json(), r.text)
r = c.get("/reports/doctor", headers=ad_h, params={"doctor_id": doctor_id})
check("doctor report computes", r.status_code == 200 and "completed_tokens" in r.json(), r.text)
check("revenue report", c.get("/reports/revenue", headers=ad_h).status_code == 200)
check("peak-hours report", c.get("/reports/peak-hours", headers=ad_h).status_code == 200)
check("no-show report", "no_show_rate" in c.get("/reports/no-show", headers=ad_h).json())
check("wait-time trend", "trend" in c.get("/reports/wait-time", headers=ad_h).json())
check("patient-flow funnel", "funnel" in c.get("/reports/patient-flow", headers=ad_h).json())
check("token forecast", len(c.get("/reports/token-forecast", headers=ad_h, params={"next_days": 5}).json()["forecast"]) == 5)
r = c.get("/reports/super-admin", headers=sa_h)
check("super-admin platform report", r.status_code == 200 and "platform_totals" in r.json(), r.text)
check("admin blocked from super-admin report (403)", c.get("/reports/super-admin", headers=ad_h).status_code == 403)
r = c.get("/reports/export", headers=ad_h, params={"report_type": "daily"})
check("report export returns CSV", r.status_code == 200 and "text/csv" in r.headers.get("content-type", ""), r.text[:80])

# Audit trail — the middleware logged all the mutations above
r = c.get("/audit-logs", headers=ad_h)
check("audit logs captured (tenant-scoped)", r.status_code == 200 and len(r.json()) >= 1, r.text)
check("X-Request-ID header present", "x-request-id" in {k.lower() for k in c.get("/health").headers})
r = c.get("/audit-logs", headers=sa_h)
check("super admin sees platform-wide audit logs", r.status_code == 200 and len(r.json()) >= 1, r.text)
check("audit logs by user", c.get(f"/audit-logs/user/{ra['user']['user_id']}", headers=ad_h).status_code == 200)

# ============================ Clinic onboarding + approval ===================
reg = c.post("/auth/register-clinic", json={
    "clinic_name": "Sunrise Clinic", "clinic_type": "Clinic", "registration_number": "REG-99",
    "city": "Pune", "area": "Kothrud", "address": "12 MG Road", "owner_name": "Dr. Owner",
    "phone": "9700000001", "email": "owner@sunrise.com", "password": "Owner@123", "consultation_minutes": 10})
check("clinic register -> pending (201)", reg.status_code == 201 and reg.json()["status"] == "pending", reg.text)
new_hid = reg.json()["hospital_id"]
check("pending clinic admin blocked from login (403)", login("owner@sunrise.com", "Owner@123").status_code == 403)
pend = c.get("/hospitals/pending", headers=sa_h).json()
check("super admin sees pending clinic", any(h["hospital_id"] == new_hid for h in pend), str(pend))
check("hospital admin cannot see pending list (403)", c.get("/hospitals/pending", headers=ad_h).status_code == 403)
r = c.post(f"/hospitals/{new_hid}/approve", headers=sa_h)
check("super admin approves clinic", r.status_code == 200 and r.json()["status"] == "active", r.text)
r = login("owner@sunrise.com", "Owner@123")
check("approved clinic admin can log in", r.status_code == 200, r.text)
own_h = auth(r.json()["access_token"])

# Admin adds MANY doctors (the key correction)
d1 = c.post("/doctors/onboard", headers=own_h, json={
    "name": "Dr. Asha", "specialization": "Pediatrics", "consultation_fee": 300,
    "create_login": True, "email": "asha@sunrise.com", "password": "Asha@123", "phone": "9700000002"})
check("onboard doctor #1 with login (201)", d1.status_code == 201 and d1.json()["name"] == "Dr. Asha", d1.text)
d2 = c.post("/doctors/onboard", headers=own_h, json={"name": "Dr. Vikram", "specialization": "Cardiology", "consultation_fee": 500})
check("onboard doctor #2 without login (201)", d2.status_code == 201, d2.text)
docs = c.get("/doctors", headers=own_h).json()
check("clinic now has 2 doctors", len(docs) == 2, str([x["name"] for x in docs]))
check("doctor list carries names", all(x["name"] for x in docs), str(docs))
check("onboarded doctor can log into doctor console", login("asha@sunrise.com", "Asha@123").status_code == 200)
check("approval emailed the owner (mock notification)",
      any(n["type"] == "general" for n in c.get("/notification-history", headers=own_h).json()))

print("\n" + ("ALL PASSED" if not failures else f"{len(failures)} FAILURES: {failures}"))
sys.exit(1 if failures else 0)
