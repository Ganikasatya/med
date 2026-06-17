/**
 * Content for the "Patient Journey" landing sub-page (/journey).
 * Static prototype copy + step config; the visuals are built in the page.
 */

/** The 6-step journey. `color` alternates the numbered badge tone. */
export const JOURNEY = [
  { n: 1, color: 'blue', title: 'Search doctor', caption: 'Find the right doctor near you' },
  { n: 2, color: 'green', title: 'Book appointment', caption: 'Choose date & time that works for you' },
  { n: 3, color: 'blue', title: 'Pay ₹10 platform fee', caption: 'Small fee for a smarter experience' },
  { n: 4, color: 'green', title: 'Get digital token', caption: 'Instant digital token on WhatsApp / SMS' },
  { n: 5, color: 'blue', title: 'Track live queue & smart travel timing', caption: 'See live updates and get smart travel suggestions' },
  { n: 6, color: 'green', title: 'Pay doctor fee & consult', caption: 'Doctor fee is paid at the hospital / clinic' },
]

/** WhatsApp / SMS reminder bullets. */
export const REMINDERS = [
  { key: 'confirmation', text: 'Booking confirmation' },
  { key: 'token', text: 'Token & updates' },
  { key: 'queue', text: 'Queue alerts' },
  { key: 'appointment', text: 'Appointment reminders' },
]

/** Multilingual support chips. */
export const LANGUAGES_INFO = [
  { key: 'english', lang: 'English', sub: 'Simple. Easy.', tone: 'green' },
  { key: 'hindi', lang: 'हिंदी', sub: 'आसान और सुविधाजनक', tone: 'blue' },
  { key: 'telugu', lang: 'తెలుగు', sub: 'సులభం. సౌకర్యవంతం.', tone: 'orange' },
]

/** Bottom trust strip. `icon` is resolved in the page. */
export const TRUST = [
  { key: 'patients', icon: 'ShieldCheck', text: 'Trusted by lakhs of patients.' },
  { key: 'saveTime', icon: 'Heart', text: 'Save time.' },
  { key: 'avoidWaits', icon: 'Users', text: 'Avoid long waits.' },
  { key: 'focus', icon: 'Smile', text: 'Focus on what matters — your health.' },
]
