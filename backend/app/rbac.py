"""
RBAC catalog — the permission matrix the deck's 5 roles map onto.

`ALL_PERMISSIONS` is the full (module, action) catalog; the seeder creates one
`permissions` row per entry. `ROLE_PERMISSIONS` grants a subset to each role
(SUPER_ADMIN gets the wildcard and is short-circuited in the checker).

Keeping the matrix here (not in the DB migrations) means new modules in later
phases just extend these lists and re-seed.
"""

# Standard roles seeded on first boot.
ROLE_SUPER_ADMIN = "SUPER_ADMIN"
ROLE_HOSPITAL_ADMIN = "HOSPITAL_ADMIN"
ROLE_RECEPTIONIST = "RECEPTIONIST"
ROLE_DOCTOR = "DOCTOR"
ROLE_PATIENT = "PATIENT"

ROLE_DESCRIPTIONS = {
    ROLE_SUPER_ADMIN: "Platform owner — all hospitals, billing, global config",
    ROLE_HOSPITAL_ADMIN: "Manages one hospital: departments, doctors, staff, pricing, reports",
    ROLE_RECEPTIONIST: "Front desk: queue, walk-ins, tokens, patient registration",
    ROLE_DOCTOR: "Consults: live queue, token actions, delays, holidays, leave",
    ROLE_PATIENT: "Books appointments, views queue/ETA, pays, manages family",
}

# Full catalog of (module, action) permissions across the platform.
# Actions: create / read / update / delete, plus `manage` for the token engine's
# privileged queue operations (next, complete, recall, reorder, emergency).
ALL_PERMISSIONS: list[tuple[str, str]] = [
    ("user", "create"), ("user", "read"), ("user", "update"), ("user", "delete"),
    ("role", "read"),
    ("hospital", "create"), ("hospital", "read"), ("hospital", "update"), ("hospital", "delete"),
    ("department", "create"), ("department", "read"), ("department", "update"), ("department", "delete"),
    ("doctor", "create"), ("doctor", "read"), ("doctor", "update"), ("doctor", "delete"),
    ("reception", "create"), ("reception", "read"), ("reception", "update"), ("reception", "delete"),
    ("patient", "create"), ("patient", "read"), ("patient", "update"), ("patient", "delete"),
    ("appointment", "create"), ("appointment", "read"), ("appointment", "update"), ("appointment", "delete"),
    ("token", "create"), ("token", "read"), ("token", "update"), ("token", "delete"), ("token", "manage"),
    ("notification", "create"), ("notification", "read"),
    ("payment", "create"), ("payment", "read"), ("payment", "refund"),
    ("pricing", "read"), ("pricing", "update"),
    ("subscription", "create"), ("subscription", "read"), ("subscription", "update"), ("subscription", "delete"),
    ("report", "read"),
    ("audit", "read"),
    ("ivr", "read"), ("ivr", "update"),
]

# Per-role grants. SUPER_ADMIN uses "*" (all permissions) — handled in the checker.
ROLE_PERMISSIONS: dict[str, object] = {
    ROLE_SUPER_ADMIN: "*",
    ROLE_HOSPITAL_ADMIN: [
        ("hospital", "read"), ("hospital", "update"),
        ("department", "create"), ("department", "read"), ("department", "update"), ("department", "delete"),
        ("doctor", "create"), ("doctor", "read"), ("doctor", "update"), ("doctor", "delete"),
        ("reception", "create"), ("reception", "read"), ("reception", "update"), ("reception", "delete"),
        ("user", "create"), ("user", "read"), ("user", "update"), ("user", "delete"),
        # Front-desk / queue operations: the clinic console (admin dashboard) includes
        # OP-queue + walk-in management, so the admin can operate them directly.
        ("patient", "create"), ("patient", "read"), ("patient", "update"),
        ("appointment", "create"), ("appointment", "read"), ("appointment", "update"), ("appointment", "delete"),
        ("token", "create"), ("token", "read"), ("token", "update"), ("token", "manage"),
        ("notification", "create"), ("notification", "read"),
        ("payment", "read"), ("payment", "refund"),
        ("pricing", "read"), ("pricing", "update"),
        ("subscription", "read"), ("subscription", "update"),
        ("report", "read"),
        ("audit", "read"),
        ("ivr", "read"), ("ivr", "update"),
        ("role", "read"),
    ],
    ROLE_RECEPTIONIST: [
        ("hospital", "read"),  # show own clinic name/context in the console
        ("patient", "create"), ("patient", "read"), ("patient", "update"),
        ("appointment", "create"), ("appointment", "read"), ("appointment", "update"), ("appointment", "delete"),
        ("token", "create"), ("token", "read"), ("token", "update"), ("token", "manage"),
        ("reception", "read"),
        ("doctor", "read"), ("department", "read"),
        ("notification", "create"), ("notification", "read"),
        ("payment", "create"), ("payment", "read"),
        ("report", "read"),  # front-desk dashboard KPIs
    ],
    ROLE_DOCTOR: [
        ("token", "read"), ("token", "update"), ("token", "manage"),
        ("appointment", "read"), ("appointment", "update"),
        ("patient", "read"),
        ("doctor", "read"), ("doctor", "update"),
        ("notification", "read"),
        ("report", "read"),
    ],
    ROLE_PATIENT: [
        ("hospital", "read"), ("department", "read"), ("doctor", "read"),
        ("appointment", "create"), ("appointment", "read"), ("appointment", "delete"),
        ("token", "read"),
        ("patient", "read"), ("patient", "update"),
        ("payment", "create"), ("payment", "read"),
        ("notification", "read"),
    ],
}


def permissions_for(role_name: str) -> set[tuple[str, str]]:
    """Resolve a role to its concrete permission set ('*' → the whole catalog)."""
    grant = ROLE_PERMISSIONS.get(role_name, [])
    if grant == "*":
        return set(ALL_PERMISSIONS)
    return set(grant)  # type: ignore[arg-type]


# Front-desk roles that operate a hospital's own OP desk. A doctor's *personal*
# practice (managed_by_hospital=False) is private to the doctor — these roles
# must never see those patients/appointments/tokens.
CLINIC_STAFF_ROLES = (ROLE_HOSPITAL_ADMIN, ROLE_RECEPTIONIST)


def is_clinic_staff(role_name: str | None) -> bool:
    """True for hospital-side staff who must be isolated from personal practice."""
    return role_name in CLINIC_STAFF_ROLES
