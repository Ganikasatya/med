/**
 * Static data + dummy credentials for the auth screens.
 *
 *  ⚠️  REMOVE these dummy credentials before connecting a real backend —
 *      they are visible in the browser and are for prototype/demo only.
 */
import {
  ShieldCheck,
  Ticket,
  Lock,
  CalendarDays,
  ListChecks,
  ClipboardList,
  Stethoscope,
  Baby,
  HeartPulse,
  HandHeart,
  Bone,
  Heart,
  Ear,
  Eye,
  Smile,
  PersonStanding,
  Brain,
  Apple,
} from 'lucide-react'

export const DUMMY = {
  patient: [{ email: 'patient@ruralop.com', password: 'Patient@123' }],
  doctor: [{ email: 'doctor@citycare.com', password: 'Doctor@123' }],
  clinic: [
    { email: 'admin@citycare.com', password: 'Admin@123' },
    { email: 'reception@citycare.com', password: 'Recep@123' },
  ],
  otp: '123456',
}

/** Per-role configuration that drives the shared AuthModal. */
export const AUTH_ROLES = {
  patient: {
    key: 'patient',
    redirect: '/patient-dashboard',
    brand: {
      title: 'Your health journey starts here',
      subtitle: 'Book doctors, get tokens, and avoid long waiting queues.',
      benefits: [
        { icon: ShieldCheck, title: 'Verified doctors', desc: 'Trusted & experienced doctors you can rely on.' },
        { icon: Ticket, title: 'Instant token booking', desc: 'Get tokens in seconds and skip the long lines.' },
        { icon: Lock, title: 'Secure health access', desc: 'Your data is safe, private and protected.' },
      ],
    },
    login: {
      title: 'Welcome back',
      subtitle: 'Login or create your account to book appointments and manage tokens.',
    },
    signup: {
      title: 'Create your account',
      subtitle: 'Join Doctor Mitra to book appointments and get tokens faster.',
    },
  },
  doctor: {
    key: 'doctor',
    redirect: '/doctor-dashboard',
    brand: {
      title: 'Care for more patients, effortlessly',
      subtitle: 'Manage appointments, tokens and patient history in one place.',
      benefits: [
        { icon: CalendarDays, title: 'Smart appointments', desc: 'Organise your day and reduce no-shows.' },
        { icon: ListChecks, title: 'Live token queue', desc: 'Call patients in order, skip the chaos.' },
        { icon: ClipboardList, title: 'Patient history', desc: 'Access visit history securely, anytime.' },
      ],
    },
    login: {
      title: 'Doctor Login',
      subtitle: 'Sign in to manage your appointments, tokens and patients.',
    },
    signup: {
      title: 'Create your doctor account',
      subtitle: 'Join Doctor Mitra to manage your practice digitally.',
    },
  },
}

export const CITIES = [
  'Vijayawada',
  'Hyderabad',
  'Guntur',
  'Visakhapatnam',
  'Bengaluru',
  'Chennai',
]

export const SPECIALIZATIONS = [
  'General Physician',
  'Pediatrics',
  'Gynecology',
  'Dermatology',
  'Orthopedics',
  'Cardiology',
  'ENT',
  'Ophthalmology',
  'Dental',
  'Physiotherapy',
  'Psychiatry',
  'Nutrition',
]

/* ---- Clinic registration options ---- */
export const CLINIC_TYPES = [
  'General Clinic',
  'Dental Clinic',
  'Eye Clinic',
  'Children Clinic',
  'Multi-speciality Clinic',
  'Diagnostic Clinic',
]

export const CONSULT_TIMES = [
  '5 minutes',
  '10 minutes',
  '15 minutes',
  '20 minutes',
  '30 minutes',
]

export const WORKING_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Clinic service / specialty options — each with its own icon + colour. */
export const SERVICE_OPTIONS = [
  { label: 'General Physician', icon: Stethoscope, color: 'green' },
  { label: 'Pediatrics', icon: Baby, color: 'sky' },
  { label: 'Gynecology', icon: HeartPulse, color: 'pink' },
  { label: 'Dermatology', icon: HandHeart, color: 'blue' },
  { label: 'Orthopedics', icon: Bone, color: 'green' },
  { label: 'Cardiology', icon: Heart, color: 'red' },
  { label: 'ENT', icon: Ear, color: 'blue' },
  { label: 'Ophthalmology', icon: Eye, color: 'blue' },
  { label: 'Dental', icon: Smile, color: 'sky' },
  { label: 'Physiotherapy', icon: PersonStanding, color: 'blue' },
  { label: 'Psychiatry', icon: Brain, color: 'violet' },
  { label: 'Nutrition', icon: Apple, color: 'red' },
]
