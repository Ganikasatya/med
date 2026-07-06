"""
ORM model registry. Importing this package registers every table on
`Base.metadata` (used by create_all and Alembic autogenerate).

Models are grouped by the deck's modules. As later phases land, their model
modules are imported here so the schema stays complete in one place.
"""
from .appointment import (
    Appointment,
    ApptCancellationLog,
    ApptRescheduleHistory,
    ApptStatusHistory,
)
from .audit import AuditLog
from .report import (
    DailyReport,
    DepartmentReport,
    DoctorReport,
    MonthlyReport,
)
from .subscription import Invoice, Plan, Subscription
from .doctor import (
    Doctor,
    DoctorAffiliation,
    DoctorBreak,
    DoctorDelayLog,
    DoctorDocument,
    DoctorHoliday,
    DoctorLeaveRequest,
    DoctorSchedule,
    DoctorStatus,
)
from .hospital import Department, Hospital, HospitalSettings
from .notification import (
    EmailLog,
    Notification,
    PushNotification,
    SmsLog,
    WhatsappLog,
)
from .patient import (
    Allergy,
    FamilyMember,
    MedicalHistory,
    Patient,
    PatientDocument,
    PatientVital,
)
from .payment import AppointmentPayment
from .prescription import Prescription, PrescriptionItem
from .reception import Receptionist, ReceptionistShift
from .token import (
    EmergencyQueue,
    Token,
    TokenMovementLog,
    TokenRecallHistory,
    TokenStatusHistory,
)
from .security import (
    ActivityLog,
    LoginHistory,
    Permission,
    RefreshToken,
    Role,
    RolePermission,
    User,
)

__all__ = [
    # Module 1 — Security
    "Role", "Permission", "RolePermission", "User",
    "RefreshToken", "LoginHistory", "ActivityLog",
    # Module 2 — Hospital & Department
    "Hospital", "HospitalSettings", "Department",
    # Module 3 — Doctor
    "Doctor", "DoctorAffiliation", "DoctorSchedule", "DoctorBreak", "DoctorHoliday",
    "DoctorDelayLog", "DoctorLeaveRequest", "DoctorStatus", "DoctorDocument",
    # Module 4 — Reception
    "Receptionist", "ReceptionistShift",
    # Module 5 — Patient
    "Patient", "FamilyMember", "MedicalHistory", "Allergy", "PatientDocument", "PatientVital",
    # Payments
    "AppointmentPayment",
    # Prescriptions
    "Prescription", "PrescriptionItem",
    # Module 6 — Appointment
    "Appointment", "ApptStatusHistory", "ApptRescheduleHistory", "ApptCancellationLog",
    # Module 7 — Token Engine
    "Token", "TokenStatusHistory", "TokenMovementLog", "TokenRecallHistory", "EmergencyQueue",
    # Module 8 — Notification
    "Notification", "SmsLog", "WhatsappLog", "EmailLog", "PushNotification",
    # Module 10 — Subscription
    "Plan", "Subscription", "Invoice",
    # Module 11 — Reports
    "DailyReport", "MonthlyReport", "DoctorReport", "DepartmentReport",
    # Module 12 — Audit
    "AuditLog",
]
