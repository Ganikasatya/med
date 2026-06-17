/**
 * Sidebar navigation for the doctor console, grouped into sections.
 * `icon` is a lucide icon name resolved in DoctorSidebar.
 * `to` is relative to /doctor-dashboard; `end` marks the index route.
 */
export const DOCTOR_NAV = [
  {
    section: null,
    items: [{ label: 'Dashboard', to: '', icon: 'Home', end: true }],
  },
  {
    section: 'Appointments',
    items: [
      { label: "Today's Appointments", to: 'today', icon: 'CalendarDays' },
      { label: 'All Appointments', to: 'appointments', icon: 'ClipboardList' },
      { label: 'Cancellations / No Shows', to: 'cancellations', icon: 'CircleSlash' },
    ],
  },
  {
    section: 'Queue Management',
    items: [
      { label: 'Live OP Queue', to: 'queue', icon: 'Users' },
      { label: 'Token History', to: 'token-history', icon: 'History' },
      { label: 'Doctor Delay Alert', to: 'delay-alert', icon: 'BellRing' },
    ],
  },
  {
    section: 'Doctor & Schedule',
    items: [
      { label: 'My Availability', to: 'availability', icon: 'Clock' },
      { label: 'Holidays', to: 'holidays', icon: 'CalendarOff' },
      { label: 'Consultation Fees', to: 'fees', icon: 'IndianRupee' },
    ],
  },
  {
    section: 'Patients',
    items: [{ label: 'Patient List', to: 'patients', icon: 'UsersRound' }],
  },
  {
    section: 'Reports & Analytics',
    items: [
      { label: 'Reports', to: 'reports', icon: 'BarChart3' },
      { label: 'Analytics', to: 'analytics', icon: 'PieChart' },
    ],
  },
  {
    section: 'Communication',
    items: [
      { label: 'Notifications', to: 'notifications', icon: 'Bell' },
      { label: 'Messages', to: 'messages', icon: 'MessageSquare' },
    ],
  },
  {
    section: 'Settings',
    items: [
      { label: 'Clinic Profile', to: 'profile', icon: 'Building2' },
      { label: 'Staff Users', to: 'staff', icon: 'UserCog' },
      { label: 'Settings', to: 'settings', icon: 'Settings' },
    ],
  },
]

/** Flat list of non-index routes → used to register "coming soon" stubs. */
export const DOCTOR_STUB_ROUTES = DOCTOR_NAV.flatMap((g) => g.items)
  .filter((i) => i.to !== '')
  .map((i) => ({ to: i.to, label: i.label }))
