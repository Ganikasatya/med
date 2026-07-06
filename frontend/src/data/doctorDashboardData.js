/**
 * Static mock data for the Doctor Dashboard (TapCure).
 *
 *  ⚠️  Prototype data only — wire to the real backend later. The component
 *      keeps the live queue in local state so the action buttons (Call Next,
 *      Mark Complete, Hold) work without a server.
 */
import {
  CalendarDays,
  CheckCircle2,
  Hourglass,
  Users,
  Clock,
  UserPlus,
  CalendarCheck,
  XCircle,
  UserRound,
} from 'lucide-react'

/** Logged-in doctor + clinic context (drives the topbar). */
export const DOCTOR = {
  name: 'Dr. Ramesh Kumar',
  specialty: 'General Physician',
  initials: 'RK',
  clinic: 'City Care Clinic',
  date: 'Today',
  notifications: 5,
}

/**
 * Patients waiting longer than this (minutes) are flagged red across the
 * dashboard — the SLA bottleneck highlight.
 */
export const WAIT_SLA_MINS = 20

/** Top KPI strip. */
export const KPIS = [
  { value: 28, label: "Today's Appointments", sub: 'Total', icon: CalendarDays, tone: 'blue' },
  { value: 16, label: 'Completed', sub: '57% of total', icon: CheckCircle2, tone: 'green' },
  { value: 9, label: 'In Queue', sub: '32% of total', icon: Hourglass, tone: 'orange' },
  { value: 3, label: 'Remaining', sub: '11% of total', icon: Users, tone: 'purple' },
  { value: '8 mins', label: 'Avg. Consultation Time', sub: 'Today', icon: Clock, tone: 'teal' },
]

/** Right-rail clinic snapshot. */
export const CLINIC_OVERVIEW = [
  { label: 'Total Patients', value: 34, icon: Users },
  { label: 'Walk-in Patients', value: 6, icon: UserPlus },
  { label: 'Online Appointments', value: 28, icon: CalendarCheck },
  { label: 'No Shows', value: 1, icon: XCircle },
  { label: 'New Patients', value: 5, icon: UserRound },
]

/**
 * Live OP queue. `status` ∈ Waiting | In Consultation | Completed | On Hold.
 * `waitMins` is the estimated wait for waiting patients (null otherwise).
 * The dashboard mutates a copy of this in local state.
 */
export const QUEUE = [
  { token: 16, name: 'Ramesh B.', age: '34 / Male', status: 'In Consultation', waitMins: null },
  { token: 17, name: 'Suresh K.', age: '47 / Male', status: 'Waiting', waitMins: 5 },
  { token: 18, name: 'Anitha P.', age: '29 / Female', status: 'Waiting', waitMins: 12 },
  { token: 19, name: 'Mohan L.', age: '52 / Male', status: 'Waiting', waitMins: 18 },
  { token: 20, name: 'Kavitha R.', age: '38 / Female', status: 'Waiting', waitMins: 25 },
  { token: 21, name: 'Imran K.', age: '41 / Male', status: 'Waiting', waitMins: 31 },
]

/** Seconds the current consultation has been running (drives the live timer). */
export const CURRENT_ELAPSED_SEC = 6 * 60 + 12

/** Today's appointment slots. */
export const SCHEDULE = [
  { time: '09:00 AM', name: 'Sunita Devi', status: 'Completed' },
  { time: '09:20 AM', name: 'Ramesh B.', status: 'In Consultation' },
  { time: '09:40 AM', name: 'Suresh K.', status: 'Waiting' },
  { time: '10:00 AM', name: 'Anitha P.', status: 'Waiting' },
  { time: '10:20 AM', name: 'Mohan L.', status: 'Waiting' },
  { time: '10:40 AM', name: 'Kavitha R.', status: 'Waiting' },
  { time: '11:00 AM', name: 'Break Time', status: null, isBreak: true },
]

/** Recent appointments table. */
export const RECENT_APPTS = [
  { time: '09:00 AM', patient: 'Sunita Devi', type: 'Online', token: 14, status: 'Completed', payment: 'Paid at Clinic' },
  { time: '09:20 AM', patient: 'Ramesh B.', type: 'Online', token: 16, status: 'In Consultation', payment: 'Paid at Clinic' },
  { time: '09:40 AM', patient: 'Suresh Kumar', type: 'Online', token: 17, status: 'Waiting', payment: 'Paid at Clinic' },
  { time: '10:00 AM', patient: 'Anitha P.', type: 'Online', token: 18, status: 'Waiting', payment: 'Paid at Clinic' },
  { time: '10:20 AM', patient: 'Mohan L.', type: 'Walk-in', token: 19, status: 'Waiting', payment: 'Paid at Clinic' },
]

/** Recent notification feed (right rail). `kind` selects the icon + tint. */
export const NOTIFICATIONS = [
  { kind: 'appt', title: 'New appointment booked', desc: 'Rajesh Kumar at 11:20 AM', time: '2 mins ago' },
  { kind: 'arrived', title: 'Patient in queue arrived', desc: 'Anitha P. (Token 18) has arrived', time: '5 mins ago' },
  { kind: 'delay', title: 'Doctor delay alert sent', desc: 'Delay sent to 8 patients', time: '15 mins ago' },
  { kind: 'walkin', title: 'Walk-in patient added', desc: 'Mohan Singh added (Token 23)', time: '20 mins ago' },
]
