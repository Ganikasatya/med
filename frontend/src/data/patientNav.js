/**
 * Sidebar navigation for the patient console.
 * `icon` is a lucide icon name resolved in PatientSidebar.
 * `to` is relative to /patient-dashboard; `end` marks the index route.
 *
 * Mirrors the doctor console's nav shape so both consoles stay consistent.
 */
export const PATIENT_NAV = [
  { label: 'Dashboard', tKey: 'pnav.dashboard', to: '', icon: 'Home', end: true },
  { label: 'My Appointments', tKey: 'pnav.appointments', to: 'appointments', icon: 'CalendarDays' },
  { label: 'Doctors', tKey: 'pnav.doctors', to: 'doctors', icon: 'UserRound' },
  { label: 'Clinics', tKey: 'pnav.clinics', to: 'clinics', icon: 'Building2' },
  { label: 'Prescriptions', tKey: 'pnav.prescriptions', to: 'prescriptions', icon: 'FileText' },
  { label: 'Health Records', tKey: 'pnav.healthRecords', to: 'health-records', icon: 'FolderHeart' },
  { label: 'Payments', tKey: 'pnav.payments', to: 'payments', icon: 'CreditCard' },
  { label: 'Notifications', tKey: 'pnav.notifications', to: 'notifications', icon: 'Bell' },
  { label: 'Profile Settings', tKey: 'pnav.profile', to: 'profile', icon: 'Settings' },
  { label: 'Help & Support', tKey: 'pnav.help', to: 'help', icon: 'LifeBuoy' },
]
