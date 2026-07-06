import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AnimatePresence, motion, animate, useReducedMotion } from 'framer-motion'
import confetti from 'canvas-confetti'
import { DotLottieReact } from '@lottiefiles/dotlottie-react'
import {
  CalendarDays, Clock, MapPin, Stethoscope, UserRound, Phone, Mail,
  IndianRupee, ArrowLeft, CheckCircle2, AlertTriangle, LocateFixed,
  Navigation, Users, Route, User, Ticket, Hourglass,
} from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { TextInput, SelectInput, Checkbox, Banner } from '../../components/common/FormControls.jsx'
import AddressAutocomplete from '../../components/common/AddressAutocomplete.jsx'
import ClinicMap from '../../components/common/ClinicMap.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { appointmentsApi, doctorsApi, tokensApi, paymentsApi, patientsApi } from '../../api'
import { prettyTime, todayISO } from '../../lib/format.js'

// Inject the Razorpay Checkout script once; resolves true when it's ready.
function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve(true)
    s.onerror = () => resolve(false)
    document.body.appendChild(s)
  })
}
import { travelMinutesBetween, travelMinutesFromKm, roadTravelMinutes, getCurrentPosition, geocodeAddress } from '../../lib/geo.js'
import { useI18n } from '../../i18n/index.jsx'

const VISIT_TYPES = [
  { value: 'regular', labelKey: 'ppage.visitGeneral' },
  { value: 'walkin', labelKey: 'ppage.visitWalkin' },
  { value: 'emergency', labelKey: 'ppage.visitEmergency' },
]

function textareaClass(error) {
  return `min-h-[104px] w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition-colors placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 ${
    error ? 'border-red-300' : 'border-slate-200'
  }`
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function readableDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/* Animated count-up for the success stats. */
function CountUp({ value, duration = 1 }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const controls = animate(0, value || 0, { duration, ease: 'easeOut', onUpdate: (v) => setN(Math.round(v)) })
    return () => controls.stop()
  }, [value, duration])
  return <>{n}</>
}

/* A celebratory confetti burst — one pop from the centre + two side cannons. */
function fireConfetti() {
  const colors = ['#22c55e', '#10b981', '#2563eb', '#f59e0b', '#ffffff']
  confetti({ particleCount: 90, spread: 72, startVelocity: 45, origin: { x: 0.5, y: 0.42 }, colors, zIndex: 70 })
  setTimeout(() => confetti({ particleCount: 55, angle: 60, spread: 70, origin: { x: 0, y: 0.7 }, colors, zIndex: 70 }), 160)
  setTimeout(() => confetti({ particleCount: 55, angle: 120, spread: 70, origin: { x: 1, y: 0.7 }, colors, zIndex: 70 }), 160)
}

const _container = { hidden: {}, show: { transition: { staggerChildren: 0.1, delayChildren: 0.08 } } }
const _item = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } } }

/* Loader: "loading" by Mj chen, locally vendored from LottieFiles.
   https://lottiefiles.com/free-animation/loading-fHKMl9U5Jk */
/* Two-act booking reveal: the requested Lottie loader, then confirmation. */
function BookedCard({ booked, doctorName, dateLabel, onView, onAnother }) {
  const tk = booked.token
  const leaveBy = tk?.leave_by ? new Date(tk.leave_by).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : null
  const peopleAhead = tk ? Math.max(0, (tk.queue_position || 1) - 1) : 0
  const reduceMotion = useReducedMotion()
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const revealTimer = window.setTimeout(() => {
      setRevealed(true)
      if (!reduceMotion) {
        fireConfetti()
        navigator.vibrate?.([35, 35, 85])
      }
    }, reduceMotion ? 700 : 2200)
    return () => window.clearTimeout(revealTimer)
  }, [reduceMotion])

  return (
    <div className="mx-auto flex max-w-[540px] flex-col gap-5 py-6">
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 22 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 210, damping: 22 }}>
        <Card className={`min-h-[350px] overflow-hidden p-0 ${revealed ? 'border-0 shadow-[0_24px_70px_-22px_rgba(15,118,110,0.55)]' : '!border-transparent !bg-transparent !shadow-none'}`}>
          <AnimatePresence mode="wait" initial={false}>
            {!revealed ? (
              <motion.div
                key="lottie-loader"
                className="relative flex min-h-[350px] flex-col items-center justify-center px-6 py-8 text-center text-brand-navy"
                exit={{ opacity: 0, scale: 1.3, filter: 'blur(12px)' }}
                transition={{ duration: 0.24, ease: 'easeIn' }}
              >
                <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="relative mb-3 text-[10px] font-bold uppercase tracking-[0.32em] text-brand-blue">
                  Securing your appointment
                </motion.p>

                <motion.div
                  className="relative h-[190px] w-[190px] drop-shadow-[0_0_30px_rgba(34,211,238,0.35)]"
                  initial={{ opacity: 0, scale: 0.72 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: 'spring', stiffness: 230, damping: 18 }}
                >
                  <DotLottieReact
                    src="/booking-loader.lottie"
                    autoplay
                    loop
                    speed={0.9}
                    className="h-full w-full"
                  />
                </motion.div>

                <div className="relative mt-3 flex items-center gap-2 text-[13px] font-semibold text-slate-500">
                  <span>Allocating your token</span>
                  <span className="flex gap-1">
                    {[0, 1, 2].map((dot) => (
                      <motion.i key={dot} className="h-1 w-1 rounded-full bg-brand-blue" animate={{ y: [0, -4, 0] }} transition={{ duration: 0.38, repeat: Infinity, delay: dot * 0.1 }} />
                    ))}
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div key="booking-confirmed" initial={{ opacity: 0, scale: 0.84 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 18 }}>
          {/* Header */}
          <div className="relative flex flex-col items-center overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 px-6 pb-7 pt-9 text-center text-white">
            <div className="pointer-events-none absolute -top-20 left-1/2 h-60 w-60 -translate-x-1/2 rounded-full bg-white/20 blur-3xl" />

            {/* Checkmark badge with radiating rings */}
            <div className="relative flex h-24 w-24 items-center justify-center">
              {[0, 0.45].map((d, i) => (
                <motion.span
                  key={i}
                  className="absolute h-20 w-20 rounded-full bg-white/40"
                  initial={{ scale: 0.6, opacity: 0.55 }}
                  animate={{ scale: 2.1, opacity: 0 }}
                  transition={{ delay: 0.2 + d, duration: 1.1, ease: 'easeOut' }}
                />
              ))}
              <motion.div
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/40"
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.05 }}
              >
                <svg viewBox="0 0 52 52" className="h-12 w-12">
                  <motion.path
                    d="M14 27 l8 8 l16 -18" fill="none" stroke="white" strokeWidth="5"
                    strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
                    transition={{ delay: 0.35, duration: 0.45, ease: 'easeInOut' }}
                  />
                </svg>
              </motion.div>
            </div>

            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-4 text-[9px] font-bold uppercase tracking-[0.3em] text-white/70">
              Booking confirmed
            </motion.p>
            <motion.h2 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.46 }} className="mt-1 text-[24px] font-black tracking-tight">
              Your token is booked!
            </motion.h2>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="text-[13px] text-white/85">
              {doctorName ? `with Dr. ${doctorName}` : ''} · {dateLabel}
            </motion.p>

            {tk && (
              <motion.div
                initial={{ scale: 2.6, opacity: 0, rotate: -10 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ delay: 0.72, type: 'spring', stiffness: 200, damping: 13 }}
                className="relative mt-4 inline-flex items-center gap-2.5 overflow-hidden rounded-2xl bg-white/20 px-6 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.16)] ring-1 ring-white/30 backdrop-blur-sm"
              >
                <motion.span className="absolute inset-y-0 w-12 -skew-x-12 bg-white/25 blur-sm" initial={{ left: '-35%' }} animate={{ left: '125%' }} transition={{ delay: 1, duration: 0.65, ease: 'easeInOut' }} />
                <Ticket className="relative h-7 w-7" />
                <div className="text-left leading-tight">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">Your Token</p>
                  <p className="font-mono text-[26px] font-black leading-none">{tk.display_code || `#${tk.token_number}`}</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Body — staggered in after the header */}
          <motion.div variants={_container} initial="hidden" animate="show">
            <div className="grid grid-cols-2 gap-3 p-5">
              <motion.div variants={_item} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-center">
                <p className="text-[11px] font-medium text-slate-400">People ahead</p>
                <p className="text-[22px] font-extrabold text-brand-navy"><CountUp value={peopleAhead} /></p>
              </motion.div>
              <motion.div variants={_item} className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-center">
                <p className="text-[11px] font-medium text-slate-400">Est. wait</p>
                <p className="text-[22px] font-extrabold text-brand-navy">{tk?.wait_min != null ? <>~<CountUp value={tk.wait_min} /> min</> : '—'}</p>
              </motion.div>
            </div>
            <div className="px-5 pb-5">
              <motion.div variants={_item} className={`flex items-center gap-2 rounded-xl border p-3 text-[13px] font-semibold ${leaveBy ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                <Hourglass className="h-4 w-4" />
                {leaveBy ? `Leave by ~${leaveBy} to reach on time` : 'We’ll remind you when it’s time to leave.'}
              </motion.div>
              <motion.div variants={_item} className="mt-4 flex gap-3">
                <button onClick={onView} className="flex-1 rounded-xl bg-brand-blue py-2.5 text-sm font-bold text-white transition-colors hover:bg-brand-blueDark">View my appointments</button>
                <button onClick={onAnother} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-brand-navy hover:bg-slate-50">Book another</button>
              </motion.div>
            </div>
          </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  )
}

function BookAppointment() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { patient, doctorsById, affiliationsByDoctor, resolveHospital, loading: ctxLoading } = usePatientCtx()

  const bookableDoctors = useMemo(
    () => Object.values(doctorsById).filter((d) => d.status === 'active' || d.is_available_today),
    [doctorsById],
  )

  const [form, setForm] = useState({
    doctorId: params.get('doctor') || '',
    affiliationId: params.get('affiliation') || '',
    date: '',
    visitType: 'regular',
    reason: '',
    consent: false,
    bookingFor: 'self',   // 'self' or a family member_id (string)
  })
  const [family, setFamily] = useState([])
  const [doctorAffiliations, setDoctorAffiliations] = useState([])
  // Day-level availability (is the doctor consulting that day) + alternatives.
  const [dayState, setDayState] = useState({ loading: false, available: null, reason: null })
  const [slotSuggestions, setSlotSuggestions] = useState({ sameDate: [], nearbyDates: [] })
  // Token queue preview for the chosen doctor + date (token model, not slots).
  const [queue, setQueue] = useState(null)
  // Set after a successful booking → shows the allocated token + leave-by.
  const [booked, setBooked] = useState(null)
  // Online booking-fee config (flat fee; consultation is paid at the clinic).
  const [payCfg, setPayCfg] = useState({ enabled: false, booking_fee: 0 })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Travel origin → powers the "leave by" reminder. `for` chooses whose journey
  // we estimate; `lat/lng` come from GPS, `km` is the manual distance fallback.
  const [trip, setTrip] = useState({
    for: 'self', lat: null, lng: null, label: '', km: '', address: '', geoLoading: false, geoError: null,
  })

  // Default to the first bookable doctor once the directory loads.
  useEffect(() => {
    if (!form.doctorId && bookableDoctors.length) {
      setForm((f) => ({ ...f, doctorId: String(bookableDoctors[0].doctor_id) }))
    }
  }, [bookableDoctors, form.doctorId])

  // Learn whether an online booking fee applies (and how much).
  useEffect(() => {
    paymentsApi.config().then(setPayCfg).catch(() => {})
  }, [])

  // Load the patient's dependents so they can book "for" one of them.
  useEffect(() => {
    if (!patient?.patient_id) return
    patientsApi.family(patient.patient_id)
      .then((rows) => setFamily((rows || []).filter((m) => m.is_active)))
      .catch(() => setFamily([]))
  }, [patient?.patient_id])

  const doctor = doctorsById[form.doctorId]
  const contextAffiliations = form.doctorId ? affiliationsByDoctor[form.doctorId] || [] : []
  const affiliations = doctorAffiliations.length ? doctorAffiliations : contextAffiliations
  const affiliation = affiliations.find((a) => String(a.affiliation_id) === String(form.affiliationId)) || affiliations[0] || null
  const clinic = affiliation?.hospital_id ? resolveHospital(affiliation.hospital_id) : doctor ? resolveHospital(doctor.hospital_id) : null
  const destination = affiliation?.latitude != null && affiliation?.longitude != null
    ? { ...affiliation, latitude: affiliation.latitude, longitude: affiliation.longitude }
    : clinic
  const feeAmount = Number(affiliation?.consultation_fee ?? doctor?.consultation_fee ?? 0)

  useEffect(() => {
    if (form.doctorId && !form.affiliationId && affiliations.length) {
      setForm((f) => ({ ...f, affiliationId: String(affiliations[0].affiliation_id) }))
    }
  }, [form.doctorId, form.affiliationId, affiliations])

  useEffect(() => {
    if (!form.doctorId) {
      setDoctorAffiliations([])
      return
    }
    let active = true
    doctorsApi.affiliations({ doctor_id: form.doctorId })
      .then((rows) => {
        if (!active) return
        const activeRows = (rows || []).filter((a) => a.is_active !== false)
        setDoctorAffiliations(activeRows)
        if (activeRows.length && !activeRows.some((a) => String(a.affiliation_id) === String(form.affiliationId))) {
          setForm((f) => ({ ...f, affiliationId: String(activeRows[0].affiliation_id) }))
        }
      })
      .catch(() => {
        if (active) setDoctorAffiliations([])
      })
    return () => { active = false }
  }, [form.doctorId, form.affiliationId])

  // When doctor + date change: check the doctor consults that day, and (if so)
  // load the live token queue so the patient sees how busy it is before booking.
  useEffect(() => {
    if (!form.doctorId || !form.affiliationId || !form.date) {
      setDayState({ loading: false, available: null, reason: null })
      setSlotSuggestions({ sameDate: [], nearbyDates: [] })
      setQueue(null)
      return
    }
    let active = true
    setDayState({ loading: true, available: null, reason: null })
    setSlotSuggestions({ sameDate: [], nearbyDates: [] })
    setQueue(null)
    ;(async () => {
      try {
        const res = await appointmentsApi.availableSlots(form.doctorId, form.date, form.affiliationId)
        if (!active) return
        setDayState({ loading: false, available: !!res?.available, reason: res?.available ? null : res?.reason || t('ppage.noSlots') })
        if (res?.available) {
          // Token model: don't pick a slot — just show the queue length.
          tokensApi.queue(form.doctorId, form.date, form.affiliationId)
            .then((q) => { if (active) setQueue(q) })
            .catch(() => { if (active) setQueue(null) })
        }
        if (!res?.available) {
          const otherLocations = await Promise.all(
            affiliations
              .filter((a) => String(a.affiliation_id) !== String(form.affiliationId))
              .map(async (a) => {
                try {
                  const alt = await appointmentsApi.availableSlots(form.doctorId, form.date, a.affiliation_id)
                  return alt?.available && alt?.slots?.length ? { affiliation: a, slots: alt.slots } : null
                } catch {
                  return null
                }
              }),
          )
          const nextDates = await Promise.all(
            Array.from({ length: 7 }, (_, i) => addDaysISO(form.date, i + 1)).map(async (date) => {
              try {
                const alt = await appointmentsApi.availableSlots(form.doctorId, date, form.affiliationId)
                return alt?.available && alt?.slots?.length ? { date, slots: alt.slots } : null
              } catch {
                return null
              }
            }),
          )
          if (active) {
            setSlotSuggestions({
              sameDate: otherLocations.filter(Boolean),
              nearbyDates: nextDates.filter(Boolean).slice(0, 3),
            })
          }
        }
      } catch (err) {
        if (!active) return
        setQueue(null)
        setDayState({ loading: false, available: false, reason: err.message || t('ppage.couldNotLoadSlots') })
      }
    })()
    return () => {
      active = false
    }
  }, [affiliations, form.doctorId, form.affiliationId, form.date, t])

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  // Travel minutes: GPS/address coords → instant haversine, then refined to real
  // road time via Google Distance Matrix; manual distance → straight estimate.
  const [travelMin, setTravelMin] = useState(null)
  useEffect(() => {
    let cancelled = false
    if (trip.lat == null || trip.lng == null) {
      const km = Number(trip.km)
      setTravelMin(Number.isFinite(km) && km > 0 ? travelMinutesFromKm(km) : null)
      return undefined
    }
    const origin = { lat: trip.lat, lng: trip.lng }
    setTravelMin(travelMinutesBetween(origin, destination))  // instant estimate
    roadTravelMinutes(origin, destination).then((m) => {       // refine via Google
      if (!cancelled && m != null) setTravelMin(m)
    })
    return () => { cancelled = true }
  }, [trip.lat, trip.lng, trip.km, destination])

  const useMyLocation = async () => {
    setTrip((tr) => ({ ...tr, geoLoading: true, geoError: null }))
    try {
      const { lat, lng } = await getCurrentPosition()
      setTrip((tr) => ({
        ...tr, lat, lng, km: '', geoLoading: false, geoError: null,
        label: tr.for === 'self' ? t('ppage.myCurrentLocation') : t('ppage.patientCurrentLocation'),
      }))
    } catch (err) {
      setTrip((tr) => ({ ...tr, geoLoading: false, geoError: err.message }))
    }
  }

  // Resolve a typed address (the patient's home when booking for someone else)
  // into coordinates so the leave-by time is based on *their* journey.
  const locateFromAddress = async () => {
    if (!trip.address.trim()) {
      setTrip((tr) => ({ ...tr, geoError: t('ppage.enterAddressFirst') }))
      return
    }
    setTrip((tr) => ({ ...tr, geoLoading: true, geoError: null }))
    try {
      const g = await geocodeAddress({ address: trip.address })
      if (!g) {
        setTrip((tr) => ({ ...tr, geoLoading: false, geoError: t('ppage.couldNotFindAddress') }))
        return
      }
      setTrip((tr) => ({ ...tr, lat: g.lat, lng: g.lng, km: '', geoLoading: false, geoError: null, label: tr.address.trim() }))
    } catch (err) {
      setTrip((tr) => ({ ...tr, geoLoading: false, geoError: err.message || t('ppage.addressLookupFailed') }))
    }
  }

  // User picked a suggestion from the autocomplete → store its coordinates so
  // the leave-by time uses their real journey (no separate "Find" step needed).
  const selectAddress = (place) => {
    setTrip((tr) => ({ ...tr, lat: place.lat, lng: place.lng, km: '', label: place.label, address: place.label, geoLoading: false, geoError: null }))
  }
  // While typing, keep the text but drop any stale coordinates until they pick.
  const typeAddress = (text) => {
    setTrip((tr) => ({ ...tr, address: text, lat: null, lng: null }))
  }

  const setKm = (event) => {
    const km = event.target.value
    // Switching to a manual distance clears any captured GPS point.
    setTrip((tr) => ({ ...tr, km, lat: null, lng: null, label: km ? t('ppage.kmAway', { km }) : '' }))
  }

  const setTripFor = (who) => () =>
    setTrip((tr) => ({ ...tr, for: who, lat: null, lng: null, km: '', address: '', label: '', geoError: null }))

  const submit = async (event) => {
    event.preventDefault()
    setBanner(null)

    const nextErrors = {}
    if (!form.doctorId) nextErrors.doctorId = t('ppage.valSelectDoctor')
    if (!form.affiliationId) nextErrors.affiliationId = 'Select clinic or practice location'
    if (!form.date) nextErrors.date = t('ppage.valSelectDate')
    if (!form.reason.trim()) nextErrors.reason = t('ppage.valReason')
    if (!form.consent) nextErrors.consent = t('ppage.valConsent')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      // Token model: no slot_time — the patient just joins the queue.
      const booking = {
        doctor_id: Number(form.doctorId),
        affiliation_id: Number(form.affiliationId),
        patient_id: patient.patient_id,
        family_member_id: form.bookingFor === 'self' ? null : Number(form.bookingFor),
        appointment_date: form.date,
        appointment_type: form.visitType,
        notes: form.reason,
        source: 'app',
        origin_lat: trip.lat,
        origin_lng: trip.lng,
        origin_label: trip.label,
        travel_minutes: travelMin,
      }
      // Ask the server whether a booking fee is due (and create a Razorpay order).
      const order = await paymentsApi.createOrder(booking)
      let appt
      if (order.payment_required) {
        const ready = await loadRazorpay()
        if (!ready) throw new Error('Could not load the payment gateway. Please try again.')
        appt = await new Promise((resolve, reject) => {
          const rzp = new window.Razorpay({
            key: order.key_id,
            order_id: order.order_id,
            amount: order.amount,
            currency: order.currency,
            name: clinic?.name || 'Doctor Mitra',
            description: `Consultation with ${doctor?.name || 'doctor'}`,
            prefill: { name: patient?.name || '', contact: patient?.phone || '', email: patient?.email || '' },
            theme: { color: '#2563eb' },
            handler: (resp) => {
              // Payment succeeded → server verifies the signature, then books.
              paymentsApi.confirm({
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                booking,
              }).then(resolve).catch(reject)
            },
            modal: { ondismiss: () => reject(new Error('Payment cancelled — your token was not booked.')) },
          })
          rzp.open()
        })
      } else {
        // Free consult or payments disabled → book directly (no payment step).
        appt = await appointmentsApi.book(booking)
      }
      // Fetch the freshly-allocated token + leave-by to show on the confirmation.
      let token = null
      try { token = await tokensApi.estimate({ appointment_id: appt.appointment_id }) } catch { /* token shows on dashboard */ }
      setBooked({ appt, token })
    } catch (err) {
      setBanner(err.message || t('ppage.couldNotBook'))
    } finally {
      setSubmitting(false)
    }
  }

  if (ctxLoading) return <p className="text-sm text-slate-400">{t('pcommon.loading')}</p>

  // ---- Confirmation: show the allocated token + leave-by after booking ----
  if (booked) {
    return (
      <BookedCard
        booked={booked}
        doctorName={doctor?.name}
        dateLabel={readableDate(form.date)}
        onView={() => navigate('/patient-dashboard/appointments')}
        onAnother={() => { setBooked(null); setForm((f) => ({ ...f, date: '', reason: '', consent: false })) }}
      />
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PageHeading title={t('ppage.bookTitle')} subtitle={t('ppage.bookSubtitle')}>
        <button
          type="button"
          onClick={() => navigate('/patient-dashboard')}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:border-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> {t('ppage.backToDashboard')}
        </button>
      </PageHeading>

      {banner && <Banner type="error">{banner}</Banner>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <h3 className="mb-4 text-[17px] font-bold text-brand-navy">{t('ppage.apptDetails')}</h3>
          {/* Booking for — "Myself" beside a separate family-member dropdown */}
          <div className="mb-4">
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-600">{t('ppage.bookingFor')}</label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, bookingFor: 'self' }))}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold transition-colors ${
                  form.bookingFor === 'self'
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'border border-slate-200 text-slate-600 hover:border-brand-blue/40 hover:text-brand-blue'
                }`}
              >
                <UserRound className="h-4 w-4" /> {patient?.name ? `${t('ppage.myself')} (${patient.name})` : t('ppage.myself')}
              </button>
              <select
                value={form.bookingFor === 'self' ? '' : form.bookingFor}
                onChange={(e) => {
                  const v = e.target.value
                  if (v === '__add__') { navigate('/patient-dashboard/profile?addFamily=1'); return }
                  if (!v) return
                  setForm((f) => ({ ...f, bookingFor: v }))
                }}
                className={`min-w-[11rem] rounded-xl border bg-white px-3.5 py-2.5 text-[13px] font-semibold outline-none transition-colors focus:border-brand-blue ${
                  form.bookingFor !== 'self' ? 'border-brand-blue text-brand-navy' : 'border-slate-200 text-slate-600'
                }`}
              >
                <option value="">{t('ppage.familyTitle')}</option>
                {family.map((m) => (
                  <option key={m.member_id} value={String(m.member_id)}>{m.name}{m.relation ? ` — ${m.relation}` : ''}</option>
                ))}
                <option value="__add__">＋ {t('ppage.addFamily')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput label={t('ppage.mobileNumber')} icon={Phone} prefix="+91" value={patient?.phone || ''} disabled />
            <TextInput label={t('ppage.email')} icon={Mail} value={patient?.email || ''} disabled />
            <SelectInput label={t('ppage.visitType')} required icon={Stethoscope} value={form.visitType} onChange={set('visitType')}>
              {VISIT_TYPES.map((vt) => <option key={vt.value} value={vt.value}>{t(vt.labelKey)}</option>)}
            </SelectInput>
            <SelectInput label={t('ppage.doctor')} required icon={Stethoscope} value={form.doctorId} onChange={set('doctorId')} error={errors.doctorId}>
              <option value="">{t('ppage.selectDoctor')}</option>
              {bookableDoctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>{d.name} — {d.specialization}</option>
              ))}
            </SelectInput>
            <SelectInput
              label="Select clinic / practice location"
              required
              icon={MapPin}
              value={form.affiliationId}
              onChange={set('affiliationId')}
              error={errors.affiliationId}
              disabled={!affiliations.length}
            >
              <option value="">{affiliations.length ? 'Select location' : 'No practice found'}</option>
              {affiliations.map((a) => (
                <option key={a.affiliation_id} value={a.affiliation_id}>
                  {a.name || clinic?.name || 'Practice location'}
                </option>
              ))}
            </SelectInput>
            <TextInput label={t('ppage.apptDate')} required icon={CalendarDays} type="date" min={todayISO()} value={form.date} onChange={set('date')} error={errors.date} />
          </div>

          {/* Token queue preview — no slot to pick; just show how busy it is. */}
          {form.date && dayState.available && (
            <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl border border-brand-blue/15 bg-brand-blueLight/40 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm"><Ticket className="h-5 w-5" /></span>
              <div className="flex-1">
                <p className="text-[14px] font-bold text-brand-navy">
                  {doctor?.name || 'This doctor'} has {queue?.total_waiting ?? '…'} {(queue?.total_waiting === 1) ? 'patient' : 'patients'} in the queue
                </p>
                <p className="text-[12.5px] text-slate-500">
                  {queue == null ? 'Checking the queue…'
                    : `You'll get the next token · estimated wait ~${(queue.total_waiting || 0) * 10} min`}
                </p>
              </div>
              <span className="rounded-lg bg-white px-3 py-1.5 text-[12px] font-bold text-brand-blue">No appointment time needed</span>
            </div>
          )}
          {form.date && dayState.loading && (
            <p className="mt-4 text-[12.5px] text-slate-400">Checking availability…</p>
          )}

          {form.date && dayState.reason && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] font-medium text-amber-700">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {affiliation?.name
                  ? `${doctor?.name || 'This doctor'} is not available at ${affiliation.name} on ${readableDate(form.date)}.`
                  : dayState.reason}
              </div>
              {slotSuggestions.sameDate.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-amber-800">Available at another practice on the same day:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slotSuggestions.sameDate.map((item) => (
                      <button
                        key={item.affiliation.affiliation_id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, affiliationId: String(item.affiliation.affiliation_id), time: '' }))}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-bold text-amber-800 hover:bg-amber-100"
                      >
                        Book at {item.affiliation.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {slotSuggestions.nearbyDates.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-amber-800">Available at {affiliation?.name || 'this location'} on:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slotSuggestions.nearbyDates.map((item) => (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, date: item.date, time: '' }))}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-bold text-amber-800 hover:bg-amber-100"
                      >
                        {readableDate(item.date)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!slotSuggestions.sameDate.length && !slotSuggestions.nearbyDates.length && (
                <p className="mt-2 text-[12px]">{dayState.reason}</p>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                {t('ppage.reasonForVisit')} <span className="text-red-500">*</span>
              </label>
              <textarea className={textareaClass(errors.reason)} value={form.reason} onChange={set('reason')} placeholder={t('ppage.reasonPlaceholder')} />
              {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
            </div>

            {/* Getting there → drives the "time to leave" reminder. */}
            <div className="rounded-xl border border-brand-blue/15 bg-brand-blueLight/40 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-blue shadow-sm">
                  <Route className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[14px] font-bold text-brand-navy">{t('ppage.gettingThere')}</p>
                  <p className="text-[12px] text-slate-500">{t('ppage.gettingThereSub')}</p>
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">{t('ppage.whoTravelling')}</p>
                <div className="flex gap-2">
                  {[
                    { key: 'self', label: t('ppage.me'), icon: User },
                    { key: 'other', label: t('ppage.someoneElse'), icon: Users },
                  ].map((opt) => {
                    const active = trip.for === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={setTripFor(opt.key)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors ${
                          active
                            ? 'border-brand-blue bg-brand-blue text-white'
                            : 'border-slate-200 bg-white text-brand-navy hover:border-slate-300'
                        }`}
                      >
                        <opt.icon className="h-4 w-4" /> {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">
                  {trip.for === 'self' ? t('ppage.yourAddress') : t('ppage.patientAddress')}
                </p>
                <div className="flex gap-2">
                  <div className="min-w-0 flex-1">
                    <AddressAutocomplete
                      value={trip.address}
                      onChange={typeAddress}
                      onSelect={selectAddress}
                      placeholder={t('ppage.addressPlaceholder')}
                      biasLat={destination?.latitude}
                      biasLng={destination?.longitude}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={locateFromAddress}
                    disabled={trip.geoLoading}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-blue px-3.5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-blueDark disabled:opacity-60"
                  >
                    <MapPin className="h-4 w-4" /> {t('ppage.find')}
                  </button>
                </div>
                <p className="mt-1 text-[11.5px] text-slate-400">{t('ppage.addressHint')}</p>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">
                    {trip.for === 'self' ? t('ppage.startFromMyLoc') : t('ppage.usePatientPhone')}
                  </p>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={trip.geoLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-blue/30 bg-white px-3 py-2.5 text-[13px] font-bold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-60"
                  >
                    <LocateFixed className="h-4 w-4" />
                    {trip.geoLoading ? t('ppage.locating') : trip.lat != null ? t('ppage.locationCaptured') : t('ppage.useCurrentLocation')}
                  </button>
                  {trip.geoError && <p className="mt-1 text-xs text-amber-600">{trip.geoError}</p>}
                </div>

                <div>
                  <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">
                    {trip.for === 'self' ? t('ppage.orDistanceToClinic') : t('ppage.distanceToClinic')}
                  </p>
                  <div className="relative">
                    <Navigation className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={trip.km}
                      onChange={setKm}
                      placeholder={t('ppage.distancePlaceholder')}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-12 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-400">km</span>
                  </div>
                </div>
              </div>

              {travelMin != null ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green-700">
                  <Navigation className="h-4 w-4" />
                  {t('ppage.aboutMinAway', { n: travelMin, label: trip.label ? ` · ${trip.label}` : '' })}
                </div>
              ) : (
                <p className="mt-3 text-[12px] text-slate-500">
                  {t('ppage.optionalReminder')}
                </p>
              )}

              {destination?.latitude != null && destination?.longitude != null && (
                <ClinicMap
                  clinic={destination}
                  origin={trip.lat != null && trip.lng != null ? { lat: trip.lat, lng: trip.lng } : null}
                  clinicLabel={affiliation?.name || clinic?.name || 'Clinic'}
                  originLabel={trip.label || 'You'}
                  height={220}
                  className="mt-3"
                />
              )}
            </div>

            <Checkbox checked={form.consent} onChange={set('consent')} className="rounded-xl bg-slate-50 p-3">
              {t('ppage.bookConsent')}
            </Checkbox>
            {errors.consent && <p className="-mt-3 text-xs text-red-500">{errors.consent}</p>}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/patient-dashboard')}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-slate-50"
            >
              {t('pcommon.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)] transition-colors hover:bg-brand-blueDark disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" /> {submitting ? t('ppage.booking') : (payCfg.enabled && payCfg.booking_fee > 0) ? `Pay ₹${payCfg.booking_fee} & Book Token` : 'Book Token'}
            </button>
          </div>
        </Card>

        <Card className="h-fit p-5">
          <h3 className="text-[17px] font-bold text-brand-navy">{t('ppage.bookingSummary')}</h3>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="rounded-xl bg-brand-blueLight/60 p-3">
              <p className="font-bold text-brand-navy">{doctor?.name || t('ppage.selectDoctor')}</p>
              <p className="text-slate-500">{doctor?.specialization || t('ppage.specialty')}</p>
            </div>
            <p className="flex items-start gap-2 text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
              {affiliation?.name || clinic?.name || t('ppage.clinicLabel')}
            </p>
            <p className="flex items-start gap-2 text-slate-600">
              <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
              {form.date ? readableDate(form.date) : t('ppage.selectDate')}
            </p>
            {form.date && dayState.available && (
              <p className="flex items-start gap-2 text-slate-600">
                <Ticket className="mt-0.5 h-4 w-4 text-slate-400" />
                {queue == null ? 'Checking queue…' : `${queue.total_waiting || 0} in queue · you get the next token`}
              </p>
            )}
            <p className="flex items-start gap-2 text-slate-600">
              <IndianRupee className="mt-0.5 h-4 w-4 text-slate-400" />
              Consultation ₹{feeAmount} <span className="text-slate-400">· pay at clinic</span>
            </p>
            {payCfg.enabled && payCfg.booking_fee > 0 && (
              <p className="flex items-start gap-2 font-semibold text-brand-navy">
                <IndianRupee className="mt-0.5 h-4 w-4 text-brand-blue" />
                Booking fee ₹{payCfg.booking_fee} <span className="font-normal text-slate-400">· pay now to reserve token</span>
              </p>
            )}
            {travelMin != null && (
              <p className="flex items-start gap-2 text-slate-600">
                <Navigation className="mt-0.5 h-4 w-4 text-slate-400" />
                {t('ppage.minAwaySummary', { n: travelMin, label: trip.label ? ` (${trip.label})` : '' })}
              </p>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-3 text-[12.5px] font-medium text-green-700">
            {t('ppage.afterConfirm')}
          </div>
        </Card>
      </div>
    </form>
  )
}

export default BookAppointment
