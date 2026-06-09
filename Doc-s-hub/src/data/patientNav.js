/**
 * Sidebar navigation for the patient console.
 * `icon` is a lucide icon name resolved in PatientSidebar.
 * `to` is relative to /patient-dashboard; `end` marks the index route.
 *
 * Mirrors the doctor console's nav shape so both consoles stay consistent.
 */
export const PATIENT_NAV = [
  { label: 'Dashboard', to: '', icon: 'Home', end: true },
  { label: 'My Appointments', to: 'appointments', icon: 'CalendarDays' },
  { label: 'My Tokens / Queue', to: 'tokens', icon: 'Users' },
  { label: 'Doctors', to: 'doctors', icon: 'UserRound' },
  { label: 'Clinics', to: 'clinics', icon: 'Building2' },
  { label: 'Prescriptions', to: 'prescriptions', icon: 'FileText' },
  { label: 'Health Records', to: 'health-records', icon: 'FolderHeart' },
  { label: 'Payments', to: 'payments', icon: 'CreditCard' },
  { label: 'Notifications', to: 'notifications', icon: 'Bell' },
  { label: 'Profile Settings', to: 'profile', icon: 'Settings' },
  { label: 'Help & Support', to: 'help', icon: 'LifeBuoy' },
]
