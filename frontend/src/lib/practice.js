/**
 * Practice resolver — the ONE place that reads the scheduling model
 * (src/data/practiceData.js). Patient pages, the booking flow and the clinic
 * admin all go through these helpers, so pointing this at a real API later is
 * a single-file change.
 */
import { PRACTICE, DAY_ORDER } from '../data/practiceData.js'

const JS_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** 'YYYY-MM-DD' → 'Mon' (or null if empty/invalid). */
export function weekdayOf(dateStr) {
  if (!dateStr) return null
  const d = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(d.getTime()) ? null : JS_DAY[d.getDay()]
}

/** '18:00' → '6:00 PM'. */
export function fmtTime(t) {
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  const hr = ((h + 11) % 12) + 1
  return `${hr}:${String(m).padStart(2, '0')} ${ap}`
}

/** Look up a doctor's practice profile by name (null if not modelled yet). */
export function getProfile(name) {
  return PRACTICE[name] || null
}

export function affiliationOf(profile, id) {
  return profile?.affiliations.find((a) => a.id === id) || null
}

const isClinicAff = (aff, clinicId) => aff?.type === 'clinic' && aff?.clinicId === clinicId

/** Sessions on a given weekday, each enriched with its resolved affiliation. */
export function sessionsOnDay(profile, day) {
  if (!profile || !day) return []
  return profile.sessions
    .filter((s) => s.day === day)
    .map((s) => ({ ...s, affiliation: affiliationOf(profile, s.affiliationId) }))
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function isOnLeave(profile, dateStr) {
  return Boolean(profile?.exceptions?.some((e) => e.date === dateStr))
}

/**
 * Estimated wait at a clinic affiliation, from its live queue snapshot.
 * wait = patientsAhead × avgConsultMin + activeDelay.
 * Returns null for private/slot affiliations (no token queue).
 */
export function estimateWait(profile, affiliationId) {
  const aff = affiliationOf(profile, affiliationId)
  const q = profile?.queue?.[affiliationId]
  if (!aff || !q) return null
  const delayMin = q.delayMin || 0
  return {
    waiting: q.waiting,
    waitMin: q.waiting * aff.avgConsultMin + delayMin,
    nextToken: q.lastToken + 1,
    delayMin,
    avgConsultMin: aff.avgConsultMin,
  }
}

/** Full weekly plan (every affiliation) — for the patient "where is the doctor" strip. */
export function weeklyPlan(profile) {
  return DAY_ORDER.map((day) => ({ day, items: sessionsOnDay(profile, day) }))
}

/**
 * Weekly plan from ONE clinic's point of view: each day split into the days
 * the doctor is *here* vs *off-site* (private / another clinic). The clinic
 * admin sees its own days in full and off-site days as a privacy-safe marker.
 */
export function clinicPlan(profile, clinicId) {
  return DAY_ORDER.map((day) => {
    const items = sessionsOnDay(profile, day)
    return {
      day,
      here: items.filter((i) => isClinicAff(i.affiliation, clinicId)),
      offsite: items.filter((i) => !isClinicAff(i.affiliation, clinicId)),
    }
  })
}

/** Doctors who have at least one session at the given clinic. */
export function clinicDoctors(clinicId) {
  return Object.values(PRACTICE).filter((p) =>
    p.affiliations.some((a) => isClinicAff(a, clinicId)),
  )
}

/** Distinct affiliations a doctor practices at (for the "Practices at" list). */
export function affiliationsOf(profile) {
  return profile?.affiliations ?? []
}

/**
 * Resolve a booking attempt: given a doctor + a date, what places (if any) is
 * the doctor available, or are they on leave / off that weekday?
 */
export function resolveBooking(profile, dateStr) {
  const day = weekdayOf(dateStr)
  if (!profile || !day) return { day, onLeave: false, sessions: [] }
  if (isOnLeave(profile, dateStr)) return { day, onLeave: true, sessions: [] }
  return { day, onLeave: false, sessions: sessionsOnDay(profile, day) }
}

/** Compact list of weekdays a doctor works (e.g. "Mon, Wed, Fri"), optionally for one clinic. */
export function workingDays(profile, clinicId) {
  if (!profile) return []
  return DAY_ORDER.filter((day) =>
    sessionsOnDay(profile, day).some((s) =>
      clinicId ? isClinicAff(s.affiliation, clinicId) : true,
    ),
  )
}
