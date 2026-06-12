/**
 * Static / dummy data for the Doctor Mitra landing page.
 * No API calls — everything here is placeholder content for the UI.
 */
import {
  Stethoscope,
  Clock,
  MapPin,
  ShieldCheck,
  IndianRupee,
  Headphones,
  Search,
  CalendarDays,
  Ticket,
  Building2,
  Activity,
  Flame,
  PersonStanding,
  HeartPulse,
  Scale,
  Baby,
} from 'lucide-react'

export const BRAND = {
  name: 'Doctor Mitra',
  city: 'Vijayawada',
}

export const NAV_LINKS = ['Find Doctors', 'Find Clinics', 'Health Articles']

export const LANGUAGES = ['English', 'हिंदी', 'తెలుగు']

export const POPULAR_SEARCHES = [
  'Dentist',
  'Gynecologist',
  'Pediatrician',
  'Orthopedic',
  'Cardiologist',
]

// Only the most important / commonly used calculators (kept uncluttered).
export const HEALTH_CALCULATORS = [
  { label: 'BMI Calculator', short: 'BMI', icon: Scale },
  { label: 'Calorie Calculator', icon: Flame },
  { label: 'Body Fat Calculator', icon: PersonStanding },
  { label: 'BMR Calculator', icon: Activity },
  { label: 'Ideal Weight Calculator', icon: HeartPulse },
  { label: 'Pregnancy Calculator', icon: Baby },
]

export const FEATURES = [
  {
    title: 'Trusted Doctors',
    desc: 'Verified & experienced doctors you can trust.',
    icon: ShieldCheck,
  },
  {
    title: 'Save Time',
    desc: 'Get token and visit the clinic on time.',
    icon: Clock,
  },
  {
    title: 'Nearby Clinics',
    desc: 'Find clinics & hospitals near you.',
    icon: MapPin,
  },
  {
    title: 'Secure & Easy',
    desc: 'Your data is safe and 100% secure.',
    icon: ShieldCheck,
  },
  {
    title: 'Affordable Care',
    desc: 'Quality healthcare that fits your budget.',
    icon: IndianRupee,
  },
  {
    title: '24/7 Support',
    desc: "We're here to help you anytime.",
    icon: Headphones,
  },
]

export const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Search',
    desc: 'Search doctors or clinics by name, specialty or symptoms.',
    icon: Search,
  },
  {
    step: 2,
    title: 'Book',
    desc: 'Choose your preferred date & time and book appointment.',
    icon: CalendarDays,
  },
  {
    step: 3,
    title: 'Get Token',
    desc: 'Receive your token instantly on SMS & app.',
    icon: Ticket,
  },
  {
    step: 4,
    title: 'Visit on Time',
    desc: 'Reach the clinic at the right time and skip the queue.',
    icon: Building2,
  },
]

export const TESTIMONIALS = [
  {
    quote:
      'Doctor Mitra helped me save so much time. I got my token before reaching the clinic and the experience was smooth.',
    name: 'Ramesh B.',
    city: 'Vijayawada',
    rating: 5,
  },
]

export const FEATURE_ICON = Stethoscope

/**
 * Dummy credentials (UI reference only — NO auth logic wired up yet).
 *  Home user   : user@doctormitra.com   / User@123
 *  Clinic user : clinic@doctormitra.com / Clinic@123
 *  Admin       : admin@doctormitra.com  / Admin@123
 *  Static OTP  : 123456
 */
export const DUMMY_CREDENTIALS = {
  home: { email: 'user@doctormitra.com', password: 'User@123' },
  clinic: { email: 'clinic@doctormitra.com', password: 'Clinic@123' },
  admin: { email: 'admin@doctormitra.com', password: 'Admin@123' },
  otp: '123456',
}
