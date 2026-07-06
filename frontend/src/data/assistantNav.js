/** Grouped left-nav for the Assistant (receptionist / nurse-compounder) console.
 *  Each group has an optional section label + items. `soon: true` marks pages
 *  whose UI is built but backend data is pending. */
export const ASSISTANT_NAV = [
  {
    section: null,
    items: [{ label: 'Dashboard', to: '/assistant-dashboard', icon: 'LayoutDashboard', end: true }],
  },
  {
    section: 'Appointments & Queue',
    items: [
      { label: "Today's Queue", to: '/assistant-dashboard/queue', icon: 'ListChecks' },
      { label: 'Upcoming Appointments', to: '/assistant-dashboard/appointments', icon: 'CalendarDays' },
      { label: 'Walk-in', to: '/assistant-dashboard/walk-in', icon: 'UserPlus' },
    ],
  },
  {
    section: 'Patient Management',
    items: [
      { label: 'Patient Search', to: '/assistant-dashboard/patient-search', icon: 'Search' },
      { label: 'Patient List', to: '/assistant-dashboard/patients', icon: 'Users' },
    ],
  },
  {
    section: 'Clinical',
    items: [
      { label: 'Vitals & Measurements', to: '/assistant-dashboard/vitals', icon: 'Activity' },
      { label: 'Lab Test Orders', to: '/assistant-dashboard/lab-tests', icon: 'FlaskConical', soon: true },
      { label: 'Medicine Dispensed', to: '/assistant-dashboard/medicines', icon: 'Pill', soon: true },
    ],
  },
  {
    section: 'Communication',
    items: [
      { label: 'Messages', to: '/assistant-dashboard/messages', icon: 'MessageSquare', soon: true },
      { label: 'Notifications', to: '/assistant-dashboard/notifications', icon: 'Bell' },
    ],
  },
]
