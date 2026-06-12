/**
 * Static mock data for the Patient Dashboard (Doctor Mitra / BookMyDoctor).
 *
 *  ⚠️  Prototype data only — wire to the real backend later.
 *
 *  This data intentionally MIRRORS the doctor console so the two relate:
 *  the patient (Ravi Kumar, Token 18) is booked with "Dr. Ramesh Kumar"
 *  — the same doctor whose console manages the live OP queue. When that
 *  doctor advances the queue, this is the patient-facing view of it.
 */
import {
  CalendarDays, Ticket, CheckCircle2, FolderHeart,
  CalendarPlus, Upload, CreditCard, Search,
} from 'lucide-react'

/** Logged-in patient context (drives the topbar + greeting). */
export const PATIENT = {
  name: 'Ravi Kumar',
  initials: 'RK',
  greeting: 'Good Morning',
  language: 'English',
  notifications: 3,
  token: 18,
  clinic: 'Sri Sai Ram Clinic',
  doctor: 'Dr. Ramesh Kumar',
  specialty: 'General Physician',
}

/** Top KPI strip — each links to a deeper view. */
export const KPIS = [
  { value: '02', label: 'Upcoming Appointment', action: 'View details', to: 'appointments', icon: CalendarDays, tone: 'blue' },
  { value: '18', label: "Today's Token", action: 'Live Queue', to: 'tokens', icon: Ticket, tone: 'green' },
  { value: '12', label: 'Completed Visits', action: 'View history', to: 'appointments', icon: CheckCircle2, tone: 'purple' },
  { value: '08', label: 'Health Records', action: 'View all', to: 'health-records', icon: FolderHeart, tone: 'orange' },
]

/** Today's token / live-queue snapshot shown on the dashboard. */
export const TODAY_TOKEN = {
  clinic: 'Sri Sai Ram Clinic',
  doctor: 'Dr. Ramesh Kumar',
  specialty: 'General Physician',
  tokenNumber: 18,
  estimatedTime: '11:20 AM',
  queuePosition: 6,
  totalTokens: 40,
  completed: 12,
  inQueue: 28,
  progressPct: 30,
}

/** Smart travel / reach-on-time card. */
export const SMART_TRAVEL = {
  trafficText: 'Traffic is moderate from your location',
  travelMins: 25,
  recommendedStart: '09:45 AM',
}

/**
 * Live queue table (right rail "My Tokens / Live Queue" panel).
 * `status` ∈ Completed | In Consultation | Your Turn | Waiting.
 */
export const LIVE_QUEUE = {
  clinic: 'Sri Sai Ram Clinic',
  totalTokens: 40,
  yourToken: 18,
  queuePosition: 6,
  estimatedTime: '11:20 AM',
  progressPct: 30,
  completed: 12,
  inQueue: 28,
  rows: [
    { token: 12, status: 'Completed', time: '09:15 AM' },
    { token: 13, status: 'Completed', time: '09:25 AM' },
    { token: 14, status: 'Completed', time: '09:35 AM' },
    { token: 15, status: 'Completed', time: '09:45 AM' },
    { token: 16, status: 'Completed', time: '09:55 AM' },
    { token: 17, status: 'In Consultation', time: '10:05 AM' },
    { token: 18, status: 'Your Turn', time: '~11:20 AM' },
    { token: 19, status: 'Waiting', time: '~11:30 AM' },
    { token: 20, status: 'Waiting', time: '~11:40 AM' },
    { token: 21, status: 'Waiting', time: '~11:50 AM' },
  ],
}

/** Upcoming appointments list. */
export const UPCOMING_APPTS = [
  {
    doctor: 'Dr. Ramesh Kumar', specialty: 'General Physician',
    date: '24', month: 'May 2025', time: '10:30 AM',
    clinic: 'Sri Sai Ram Clinic', location: 'Karimnagar, Telangana',
    token: 18, status: 'Confirmed',
  },
  {
    doctor: 'Dr. Anjali Sharma', specialty: 'Dermatologist',
    date: '27', month: 'May 2025', time: '04:00 PM',
    clinic: 'Skin Care Clinic', location: 'Warangal, Telangana',
    token: 7, status: 'Confirmed',
  },
]

/** Quick-action tiles (each navigates within the patient console). */
export const QUICK_ACTIONS = [
  { label: 'Book Appointment', icon: CalendarPlus, to: 'appointments' },
  { label: 'My Tokens', icon: Ticket, to: 'tokens' },
  { label: 'Upload Prescription', icon: Upload, to: 'prescriptions' },
  { label: 'Health Records', icon: FolderHeart, to: 'health-records' },
  { label: 'Payment History', icon: CreditCard, to: 'payments' },
  { label: 'Find Doctors', icon: Search, to: 'doctors' },
]

/** Recent notification feed. `kind` selects the icon + tint. */
export const NOTIFICATIONS = [
  { kind: 'token', title: 'Your token 18 is confirmed for today at Sri Sai Ram Clinic.', time: '10 mins ago' },
  { kind: 'delay', title: 'Dr. Ramesh Kumar is running 15 mins late today.', time: '30 mins ago' },
  { kind: 'reminder', title: 'Appointment reminder for tomorrow at 10:30 AM', time: '1 day ago' },
]

/**
 * Prescriptions / reports / lab results (Health Records & Prescriptions panel).
 * `kind` ∈ rx | lab — selects the icon.
 */
export const PRESCRIPTIONS = [
  { kind: 'rx', title: 'Dr. Ramesh Kumar', sub: 'Sri Sai Ram Clinic', date: '24 May 2025', type: 'Prescriptions' },
  { kind: 'rx', title: 'Dr. Ramesh Kumar', sub: 'Sri Sai Ram Clinic', date: '10 May 2025', type: 'Prescriptions' },
  { kind: 'lab', title: 'Apollo Diagnostics', sub: 'Blood Test Report', date: '08 May 2025', type: 'Lab Results' },
  { kind: 'rx', title: 'Dr. Anjali Sharma', sub: 'Skin Care Clinic', date: '02 May 2025', type: 'Prescriptions' },
]

export const PRESCRIPTION_TABS = ['All', 'Prescriptions', 'Reports', 'Lab Results']

/** Bottom trust strip. */
export const TRUST = [
  { icon: 'ShieldCheck', title: 'Secure & Private', desc: 'Your data is encrypted and 100% secure.' },
  { icon: 'Clock', title: 'Save Time', desc: 'Smart queues and real-time updates save your time.' },
  { icon: 'Bell', title: 'Stay Informed', desc: 'Get real-time alerts and appointment reminders.' },
  { icon: 'Heart', title: 'Better Healthcare', desc: 'Access your health records anytime, anywhere.' },
]

/* ============================================================
 * Sample data for the secondary patient tabs (dummy, for demo).
 * ============================================================ */

/** Doctors directory (Find Doctors). */
export const DOCTORS_LIST = [
  { name: 'Dr. Ramesh Kumar', specialty: 'General Physician', clinic: 'Sri Sai Ram Clinic', location: 'Karimnagar', rating: 4.8, reviews: 320, fee: 400, experience: '12 yrs', status: 'Available' },
  { name: 'Dr. Anjali Sharma', specialty: 'Dermatologist', clinic: 'Skin Care Clinic', location: 'Warangal', rating: 4.7, reviews: 210, fee: 600, experience: '9 yrs', status: 'Available' },
  { name: 'Dr. Meena Iyer', specialty: 'Pediatrician', clinic: 'Little Stars Clinic', location: 'Hyderabad', rating: 4.9, reviews: 415, fee: 500, experience: '15 yrs', status: 'Busy' },
  { name: 'Dr. Anil Verma', specialty: 'Cardiologist', clinic: 'HeartCare Hospital', location: 'Hyderabad', rating: 4.6, reviews: 188, fee: 800, experience: '18 yrs', status: 'On Leave' },
  { name: 'Dr. Priya Das', specialty: 'Gynecologist', clinic: 'Motherhood Clinic', location: 'Warangal', rating: 4.8, reviews: 276, fee: 700, experience: '11 yrs', status: 'Available' },
  { name: 'Dr. Imran Shaikh', specialty: 'Orthopedic', clinic: 'BoneJoint Care', location: 'Karimnagar', rating: 4.5, reviews: 142, fee: 650, experience: '8 yrs', status: 'Available' },
]

/** Clinics directory. */
export const CLINICS_LIST = [
  { name: 'Sri Sai Ram Clinic', location: 'Karimnagar, Telangana', doctors: 6, timings: '9:00 AM – 9:00 PM', status: 'Open' },
  { name: 'Skin Care Clinic', location: 'Warangal, Telangana', doctors: 3, timings: '10:00 AM – 7:00 PM', status: 'Open' },
  { name: 'Little Stars Clinic', location: 'Hyderabad, Telangana', doctors: 4, timings: '9:30 AM – 8:00 PM', status: 'Open' },
  { name: 'HeartCare Hospital', location: 'Hyderabad, Telangana', doctors: 12, timings: '24 Hours', status: 'Open' },
  { name: 'Motherhood Clinic', location: 'Warangal, Telangana', doctors: 5, timings: '8:00 AM – 6:00 PM', status: 'Closed' },
]

/** Health records — latest vitals + uploaded documents. */
export const VITALS = [
  { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', tone: 'green', updated: '24 May 2025' },
  { label: 'Blood Sugar', value: '98', unit: 'mg/dL', tone: 'green', updated: '24 May 2025' },
  { label: 'Heart Rate', value: '72', unit: 'bpm', tone: 'blue', updated: '24 May 2025' },
  { label: 'Weight', value: '74', unit: 'kg', tone: 'purple', updated: '20 May 2025' },
]

export const HEALTH_DOCS = [
  { title: 'Blood Test Report', source: 'Apollo Diagnostics', date: '08 May 2025', type: 'Lab Report' },
  { title: 'Chest X-Ray', source: 'Sri Sai Ram Clinic', date: '24 Apr 2025', type: 'Scan' },
  { title: 'Diabetes Panel', source: 'Apollo Diagnostics', date: '02 Apr 2025', type: 'Lab Report' },
  { title: 'ECG Report', source: 'HeartCare Hospital', date: '15 Mar 2025', type: 'Scan' },
]

export const ALLERGIES = ['Penicillin', 'Dust', 'Pollen']
export const CONDITIONS = ['Type 2 Diabetes (controlled)', 'Mild Hypertension']

/** Payment history. */
export const PAYMENTS_SUMMARY = { totalSpent: 2840, thisMonth: 1010, transactions: 9 }
export const PAYMENTS = [
  { date: '24 May 2025', desc: 'Platform Fee – Sri Sai Ram Clinic', token: 18, amount: 10, method: 'UPI', status: 'Paid Online' },
  { date: '24 May 2025', desc: 'Consultation – Dr. Ramesh Kumar', token: 18, amount: 400, method: 'At Clinic', status: 'Paid at Clinic' },
  { date: '10 May 2025', desc: 'Consultation – Dr. Ramesh Kumar', token: 11, amount: 400, method: 'Card', status: 'Paid Online' },
  { date: '08 May 2025', desc: 'Lab Test – Apollo Diagnostics', token: null, amount: 850, method: 'UPI', status: 'Paid Online' },
  { date: '02 May 2025', desc: 'Consultation – Dr. Anjali Sharma', token: 7, amount: 600, method: 'At Clinic', status: 'Paid at Clinic' },
  { date: '18 Apr 2025', desc: 'Platform Fee – Skin Care Clinic', token: 7, amount: 10, method: 'UPI', status: 'Paid Online' },
]

/** Full notifications feed. `kind` ∈ token | delay | reminder | appt | payment | report. */
export const ALL_NOTIFICATIONS = [
  { kind: 'token', title: 'Your token 18 is confirmed for today at Sri Sai Ram Clinic.', time: '10 mins ago', unread: true },
  { kind: 'delay', title: 'Dr. Ramesh Kumar is running 15 mins late today.', time: '30 mins ago', unread: true },
  { kind: 'reminder', title: 'Appointment reminder for tomorrow at 10:30 AM.', time: '1 day ago', unread: true },
  { kind: 'payment', title: 'Payment of ₹400 received for your consultation.', time: '1 day ago', unread: false },
  { kind: 'report', title: 'Your Blood Test Report is now available to view.', time: '2 days ago', unread: false },
  { kind: 'appt', title: 'Appointment with Dr. Anjali Sharma confirmed for 27 May.', time: '3 days ago', unread: false },
]

/** Patient profile. */
export const PROFILE = {
  name: 'Ravi Kumar',
  phone: '+91 98765 43210',
  email: 'ravi.kumar@example.com',
  dob: '12 Aug 1990',
  gender: 'Male',
  bloodGroup: 'O+',
  address: 'H.No 4-21, Vidya Nagar, Karimnagar, Telangana – 505001',
  language: 'English',
  emergencyName: 'Sita Kumar (Spouse)',
  emergencyPhone: '+91 98765 11111',
}

/** Help & Support FAQs. */
export const FAQS = [
  { q: 'How do I book an appointment?', a: 'Go to Doctors or Book Appointment, pick a doctor and a slot, pay the ₹10 platform fee, and you’ll get a digital token instantly.' },
  { q: 'What is the platform fee?', a: 'A flat ₹10 convenience fee per booking. The doctor’s consultation fee is paid separately at the clinic.' },
  { q: 'How does the live queue work?', a: 'Your token shows your position in real time. You’ll get alerts as the queue moves so you can reach on time.' },
  { q: 'Can I cancel or reschedule?', a: 'Yes — open My Appointments, choose the appointment, and select reschedule or cancel before your slot.' },
  { q: 'Are my health records private?', a: 'Yes. Records are encrypted and only you can access them. We never share data without your consent.' },
]
