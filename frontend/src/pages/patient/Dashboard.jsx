import { useEffect, useRef, useState, Fragment } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight, MapPin, Clock, Bell, BellRing, CalendarPlus, CalendarDays, Ticket,
  CheckCircle2, Mic, CalendarClock, Car, Users, AlertTriangle, Zap, ShieldCheck, Smile,
} from 'lucide-react'
import { Card } from '../../components/clinic/ui.jsx'
import ClinicMap from '../../components/common/ClinicMap.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { patientsApi, tokensApi } from '../../api'
import { dateChip, prettyTime, todayISO, clockIST } from '../../lib/format.js'
import { roadTravelMinutes } from '../../lib/geo.js'
import { useI18n } from '../../i18n/index.jsx'
import { speak } from '../../lib/voice.js'

const ACTIVE_STATUSES = ['scheduled', 'booked', 'confirmed', 'pending', 'checked_in', 'in_progress']

/** First run of digits in a string (e.g. "#13" -> 13), or null. */
const digits = (s) => {
  const m = String(s ?? '').match(/\d+/)
  return m ? parseInt(m[0], 10) : null
}

/** Build the little token-number track around "now serving" and "your token". */
function buildTrack(nowNum, youNum) {
  if (nowNum == null && youNum == null) return []
  if (nowNum != null && youNum != null && youNum >= nowNum) {
    if (youNum - nowNum <= 5) {
      const a = []
      for (let n = nowNum; n <= youNum; n++) a.push({ n, kind: n === nowNum ? 'now' : n === youNum ? 'you' : 'mid' })
      return a
    }
    return [
      { n: nowNum, kind: 'now' },
      { n: nowNum + 1, kind: 'mid' },
      { kind: 'gap' },
      { n: youNum - 1, kind: 'mid' },
      { n: youNum, kind: 'you' },
    ]
  }
  const base = youNum ?? nowNum
  const a = []
  for (let n = Math.max(1, base - 2); n <= base + 2; n++) a.push({ n, kind: n === nowNum ? 'now' : n === youNum ? 'you' : 'mid' })
  return a
}

/**
 * Smart OP Queue card — live view of the patient's token vs the one being
 * served. All values come from `tokensApi.estimate` (the `est` object); nothing
 * is mocked.
 */
function SmartOpQueue({ est, liveTravelMin, onNotify, notifyOn }) {
  const { t } = useI18n()
  const youNum = est.token_number || digits(est.display_code)
  const nowNum = digits(est.now_serving)
  const before = Math.max(0, (est.queue_position || 1) - 1)
  const track = buildTrack(nowNum, youNum)

  const crowd =
    est.total_waiting <= 5
      ? { label: t('pdash.lightCrowd'), cls: 'bg-emerald-50 text-emerald-600' }
      : est.total_waiting <= 15
      ? { label: t('pdash.moderateCrowd'), cls: 'bg-amber-50 text-amber-600' }
      : { label: t('pdash.heavyCrowd'), cls: 'bg-red-50 text-red-500' }
  const punctual =
    est.delay_min > 0
      ? { label: t('pdash.minLate', { n: est.delay_min }), icon: AlertTriangle, cls: 'bg-amber-50 text-amber-600' }
      : { label: t('pdash.onTime'), icon: CheckCircle2, cls: 'bg-emerald-50 text-emerald-600' }

  // Circle styling per node — matches the provided design (ring states + scale).
  const circleCls = (node) =>
    node.kind === 'now'
      ? 'scale-110 bg-teal-600 text-white ring-4 ring-teal-100'
      : node.kind === 'you'
      ? 'bg-orange-100 text-orange-600 ring-2 ring-orange-300'
      : nowNum != null && node.n < nowNum
      ? 'bg-teal-100 text-teal-600'
      : 'bg-slate-100 text-slate-400'

  return (
    <>
      {/* Now serving / Your token */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-slate-50 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('pdash.nowServing')}</p>
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums text-teal-600 animate-token-pulse">{nowNum != null ? `#${nowNum}` : '—'}</p>
        </div>
        <div className="rounded-2xl bg-orange-50 p-3.5 ring-1 ring-orange-100">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-orange-400">{t('pdash.yourToken')}</p>
          <p className="mt-0.5 text-3xl font-extrabold tabular-nums text-orange-500">{youNum != null ? `#${youNum}` : '—'}</p>
        </div>
      </div>

      {/* Token track — matches the provided design (h-8 circles + colored connectors) */}
      {track.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          {track.map((node, i) => {
            const prevDone = i > 0 && track[i - 1].n != null && nowNum != null && track[i - 1].n < nowNum
            return (
              <Fragment key={i}>
                {i > 0 && (
                  <span className={`mb-4 h-0.5 flex-1 rounded-full transition-colors duration-300 ${prevDone ? 'bg-teal-300' : 'bg-slate-200'}`} />
                )}
                <div className="flex flex-col items-center gap-1">
                  {node.kind === 'gap' ? (
                    <span className="flex h-8 items-center px-1 text-[16px] font-bold text-slate-300">…</span>
                  ) : (
                    <span className={`flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold tabular-nums transition-all duration-300 ${circleCls(node)}`}>{node.n}</span>
                  )}
                  <span className={`text-[9px] font-bold ${node.kind === 'now' ? 'text-teal-600' : node.kind === 'you' ? 'text-orange-500' : 'text-transparent'}`}>
                    {node.kind === 'now' ? t('pdash.now') : node.kind === 'you' ? t('pdash.you') : '·'}
                  </span>
                </div>
              </Fragment>
            )
          })}
        </div>
      )}

      {/* Status chips */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${punctual.cls}`}>
          <punctual.icon className="h-3.5 w-3.5" /> {punctual.label}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${crowd.cls}`}>
          <Users className="h-3.5 w-3.5" /> {crowd.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-semibold text-teal-700">
          {before === 0 ? t('pdash.youreNext') : t('pdash.beforeYou', { n: before })}
        </span>
      </div>

      {/* Wait · travel · leave — teal panel from the design */}
      <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-teal-50/70 p-3.5">
        <div className="flex items-start gap-2">
          <Clock className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
          <div>
            <p className="text-[11px] text-slate-500">{t('pdash.estWait')}</p>
            <p className="font-bold text-slate-800">{est.wait_min != null ? t('pdash.min', { n: est.wait_min }) : '—'}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Car className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
          <div>
            <p className="flex items-center gap-1 text-[11px] text-slate-500">
              {t('pdash.travelTime')}
              {liveTravelMin != null && (
                <span title="Live traffic" className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-green-500" />
              )}
            </p>
            <p className="font-bold text-slate-800">
              {(liveTravelMin ?? est.travel_min) != null ? `~${t('pdash.min', { n: liveTravelMin ?? est.travel_min })}` : '—'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
          <div>
            <p className="text-[11px] text-slate-500">{t('pdash.leaveHomeBy')}</p>
            <p className="font-bold text-slate-800">{est.should_leave_now ? t('pdash.leaveNow') : est.leave_by ? clockIST(est.leave_by) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <Link
          to="appointments"
          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-semibold text-white transition hover:bg-teal-700"
        >
          {t('pdash.viewOpQueue')} <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onNotify}
          aria-pressed={notifyOn}
          className={`inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-semibold transition ${
            notifyOn ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-700'
          }`}
        >
          {notifyOn ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
          {notifyOn ? t('pdash.remindersOn') : t('pdash.notifyMe')}
        </button>
      </div>
    </>
  )
}

/**
 * Blank state shown inside the Smart OP Queue card when there's no live token —
 * so the card is always present, just with empty data (as it was originally).
 */
function QueueEmpty({ nextAppt }) {
  const { t } = useI18n()
  const chip = nextAppt ? dateChip(nextAppt.appointment_date) : null
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
      <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <Ticket className="h-7 w-7" />
      </span>
      <p className="text-[15px] font-bold text-brand-navy">{t('pdash.noTokenYet')}</p>
      <p className="mt-1.5 max-w-xs text-[12.5px] leading-relaxed text-slate-500">
        {nextAppt
          ? t('pdash.queueOpensOn', { date: `${chip.day} ${chip.month}` })
          : t('pdash.queueNoAppt')}
      </p>
      {!nextAppt && (
        <Link
          to="appointments/book"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-blue px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-blueDark"
        >
          <CalendarPlus className="h-4 w-4" /> {t('pdash.bookOneNow')}
        </Link>
      )}
    </div>
  )
}

function Dashboard() {
  const { t, lang, speech } = useI18n()
  const { patient, resolveDoctor, resolveHospital, resolveAffiliation } = usePatientCtx()
  const [appts, setAppts] = useState([])
  const [est, setEst] = useState(null)     // my token status for today (identity + ETA + leave-by)
  const [notify, setNotify] = useState(false)
  const [liveTravel, setLiveTravel] = useState(null)  // live-traffic refresh of travel time
  const voicePrompted = useRef(false)

  useEffect(() => {
    if (lang !== 'te' || voicePrompted.current) return undefined
    const id = setTimeout(() => {
      voicePrompted.current = true
      speak('Voice tho appointment book cheyyadaniki, dashboard lo Book by Voice button click cheyyandi.', speech)
    }, 700)
    return () => {
      clearTimeout(id)
    }
  }, [lang, speech])
  // "Notify Me" → ask the browser for notification permission. The backend
  // already schedules a 15-min "time to leave" reminder; this opts in locally.
  const notifyMe = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        setNotify((await Notification.requestPermission()) === 'granted')
      } catch {
        setNotify(true)
      }
    } else {
      setNotify(true)
    }
  }

  useEffect(() => {
    if (!patient) return
    let active = true
    ;(async () => {
      const list = await patientsApi.appointments(patient.patient_id).catch(() => [])
      if (!active) return
      list.sort((a, b) => (a.appointment_date < b.appointment_date ? 1 : -1))
      setAppts(list)
    })()
    return () => {
      active = false
    }
  }, [patient])

  const today = todayISO()
  const upcoming = appts.filter((a) => ACTIVE_STATUSES.includes(a.status) && a.appointment_date >= today)
  const nextAppt = upcoming[upcoming.length - 1] // list is desc; last active is soonest
  const todayAppt = upcoming.find((a) => a.appointment_date === today) || null

  // Where the next visit is, and where the patient set out from (captured at
  // booking) — so the dashboard map can draw their route there.
  const nextAff = nextAppt ? resolveAffiliation(nextAppt.affiliation_id) : null
  const nextHosp = nextAppt
    ? resolveHospital(nextAppt.hospital_id) || resolveHospital(resolveDoctor(nextAppt.doctor_id)?.hospital_id)
    : null
  const nextClinic = nextAff || nextHosp // for the name shown under the visit
  const nextDest = nextAff?.latitude != null && nextAff?.longitude != null
    ? nextAff
    : nextHosp?.latitude != null && nextHosp?.longitude != null
      ? nextHosp
      : null
  const nextOrigin = nextAppt?.origin_lat != null && nextAppt?.origin_lng != null
    ? { lat: nextAppt.origin_lat, lng: nextAppt.origin_lng }
    : null

  // Poll my own token status (auto-allocated at booking) for today's visit. One
  // ownership-safe call returns identity + live ETA + leave-by — no queue PII.
  useEffect(() => {
    if (!todayAppt?.appointment_id) {
      setEst(null)
      return
    }
    let active = true
    let timer
    const poll = async () => {
      try {
        const res = await tokensApi.estimate({ appointment_id: todayAppt.appointment_id })
        if (active) setEst(res)
      } catch {
        /* no token yet / not mine — leave empty */
      } finally {
        if (active) timer = setTimeout(poll, 30000)
      }
    }
    poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [todayAppt?.appointment_id])

  // Today's route endpoints (for the live-traffic travel refresh).
  const todayAff = todayAppt ? resolveAffiliation(todayAppt.affiliation_id) : null
  const todayHosp = todayAppt
    ? resolveHospital(todayAppt.hospital_id) || resolveHospital(resolveDoctor(todayAppt.doctor_id)?.hospital_id)
    : null
  const todayDest = todayAff?.latitude != null && todayAff?.longitude != null
    ? todayAff
    : todayHosp?.latitude != null && todayHosp?.longitude != null ? todayHosp : null
  const todayOrigin = todayAppt?.origin_lat != null && todayAppt?.origin_lng != null
    ? { lat: todayAppt.origin_lat, lng: todayAppt.origin_lng } : null
  // Only refresh while the token is live and it's not yet time to leave.
  const tokenLive = !!(est && est.leave_by && !est.should_leave_now)
  const haveRouteCoords = !!(todayOrigin && todayDest?.latitude != null && todayDest?.longitude != null)

  // Live-traffic travel refresh — quota-safe: slow (3 min), paused when the tab
  // is hidden, and only while the token is active. Each tick is one Google
  // Distance Matrix call; it stops the moment the patient should leave / is done.
  useEffect(() => {
    if (!tokenLive || !haveRouteCoords) { setLiveTravel(null); return }
    let cancelled = false
    let timer
    const refresh = async () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        try {
          const m = await roadTravelMinutes(todayOrigin, todayDest)
          if (!cancelled && m != null) setLiveTravel(m)
        } catch { /* keep last good value */ }
      }
      if (!cancelled) timer = setTimeout(refresh, 180000)  // 3 min
    }
    refresh()
    return () => { cancelled = true; clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenLive, haveRouteCoords, todayOrigin?.lat, todayOrigin?.lng, todayDest?.latitude, todayDest?.longitude])

  return (
    <div className="flex flex-col gap-3">
      {/* Book Appointment — voice + manual options in one card */}
      <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 to-white p-4 shadow-sm">
        <div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold text-brand-navy">{t('pdash.bookTitle')}</h2>
            <p className="mt-0.5 text-[13px] text-slate-500">{t('pdash.bookSubtitle')}</p>

            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {/* Voice booking (recommended) */}
              <Link
                to="appointments/voice"
                className="group flex items-center gap-3 rounded-xl border-2 border-teal-300 bg-teal-50/50 p-3 transition-colors hover:bg-teal-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-white shadow-sm">
                  <Mic className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[15px] font-bold text-brand-navy">
                    {t('vbook.promoCta')}
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">{t('pdash.recommended')}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-slate-500">{t('vbook.promoSub')}</p>
                </div>
                <span className="sparkle-btn shrink-0">
                  <svg className="sparkle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path className="path" d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
                    <path className="path" d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z" />
                    <path className="path" d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z" />
                  </svg>
                  <span className="text_button">{t('pdash.bookNow')}</span>
                </span>
              </Link>

              {/* Book manually */}
              <Link
                to="appointments/book"
                className="group flex items-center gap-3 rounded-xl border-2 border-teal-300 bg-teal-50/50 p-3 transition-colors hover:bg-teal-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <CalendarDays className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-bold text-brand-navy">{t('pdash.bookManually')}</p>
                  <p className="mt-0.5 text-[12.5px] text-slate-500">{t('pdash.bookManuallySub')}</p>
                </div>
                <span className="sparkle-btn shrink-0">
                  <svg className="sparkle" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path className="path" d="M14.187 8.096L15 5.25L15.813 8.096C16.0231 8.83114 16.4171 9.50062 16.9577 10.0413C17.4984 10.5819 18.1679 10.9759 18.903 11.186L21.75 12L18.904 12.813C18.1689 13.0231 17.4994 13.4171 16.9587 13.9577C16.4181 14.4984 16.0241 15.1679 15.814 15.903L15 18.75L14.187 15.904C13.9769 15.1689 13.5829 14.4994 13.0423 13.9587C12.5016 13.4181 11.8321 13.0241 11.097 12.814L8.25 12L11.096 11.187C11.8311 10.9769 12.5006 10.5829 13.0413 10.0423C13.5819 9.50162 13.9759 8.83214 14.186 8.097L14.187 8.096Z" />
                    <path className="path" d="M6 14.25L5.741 15.285C5.59267 15.8785 5.28579 16.4206 4.85319 16.8532C4.42059 17.2858 3.87853 17.5927 3.285 17.741L2.25 18L3.285 18.259C3.87853 18.4073 4.42059 18.7142 4.85319 19.1468C5.28579 19.5794 5.59267 20.1215 5.741 20.715L6 21.75L6.259 20.715C6.40725 20.1216 6.71398 19.5796 7.14639 19.147C7.5788 18.7144 8.12065 18.4075 8.714 18.259L9.75 18L8.714 17.741C8.12065 17.5925 7.5788 17.2856 7.14639 16.853C6.71398 16.4204 6.40725 15.8784 6.259 15.285L6 14.25Z" />
                    <path className="path" d="M6.5 4L6.303 4.5915C6.24777 4.75718 6.15472 4.90774 6.03123 5.03123C5.90774 5.15472 5.75718 5.24777 5.5915 5.303L5 5.5L5.5915 5.697C5.75718 5.75223 5.90774 5.84528 6.03123 5.96877C6.15472 6.09226 6.24777 6.24282 6.303 6.4085L6.5 7L6.697 6.4085C6.75223 6.24282 6.84528 6.09226 6.96877 5.96877C7.09226 5.84528 7.24282 5.75223 7.4085 5.697L8 5.5L7.4085 5.303C7.24282 5.24777 7.09226 5.15472 6.96877 5.03123C6.84528 4.90774 6.75223 4.75718 6.697 4.5915L6.5 4Z" />
                  </svg>
                  <span className="text_button">{t('pdash.bookNow')}</span>
                </span>
              </Link>
            </div>

            {/* Trust flags */}
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] font-medium text-slate-500">
              <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-teal-600" /> {t('pdash.flagFastest')}</span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5 text-teal-600" /> {t('pdash.flagSecure')}</span>
              <span className="text-slate-300">•</span>
              <span className="flex items-center gap-1"><Smile className="h-3.5 w-3.5 text-teal-600" /> {t('pdash.flagSimple')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Smart OP Queue + Next Visit — always visible; the queue shows its blank
          state when there's no live token, so the dashboard is never bare. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.5fr_1fr]">
        {est ? (
          <div className="relative h-full">
            {/* soft teal glow */}
            <div className="pointer-events-none absolute -inset-3 -z-10 rounded-[2rem] bg-teal-300/25 blur-2xl" />
            {/* rotating green line around the border */}
            <div className="queue-glow h-full">
            <Card className="relative h-full rounded-3xl p-4 shadow-[0_24px_60px_-24px_rgba(13,148,136,0.45)] ring-1 ring-teal-50">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold tracking-wide text-slate-800">{t('pdash.smartQueue')}</span>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {t('pdash.liveUpdating')}
                </span>
              </div>
              <SmartOpQueue est={est} liveTravelMin={liveTravel} onNotify={notifyMe} notifyOn={notify} />
            </Card>
            </div>
          </div>
        ) : (
          <Card className="rounded-3xl p-4">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold tracking-wide text-slate-800">{t('pdash.smartQueue')}</span>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                {t('pdash.queueIdle')}
              </span>
            </div>
            <QueueEmpty nextAppt={nextAppt} />
          </Card>
        )}

          {/* Next Visit reminder (with route map) — shows for any upcoming visit */}
          <Card className="flex flex-col p-4">
            <h3 className="text-[16px] font-bold text-brand-navy">{t('pdash.nextVisit')}</h3>
            {nextAppt ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <div className="rounded-xl bg-brand-blueLight px-3 py-2 text-center">
                    <p className="text-[20px] font-extrabold leading-none text-brand-blue">{dateChip(nextAppt.appointment_date).day}</p>
                    <p className="text-[10px] text-slate-500">{dateChip(nextAppt.appointment_date).month}</p>
                  </div>
                  <div className="leading-tight">
                    <p className="text-[14px] font-bold text-brand-navy">{resolveDoctor(nextAppt.doctor_id)?.name || `Doctor #${nextAppt.doctor_id}`}</p>
                    <p className="text-[12px] text-slate-500">{resolveDoctor(nextAppt.doctor_id)?.specialization || ''}</p>
                    {nextAppt.slot_time && (
                      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                        <Clock className="h-3.5 w-3.5" />{prettyTime(nextAppt.slot_time)}
                      </p>
                    )}
                  </div>
                </div>
                <p className="mt-3 flex items-center gap-1 text-[12.5px] text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  {nextClinic?.name || '—'}
                </p>

                {nextDest && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.55, ease: [0.22, 0.68, 0.28, 1] }}
                    className="relative mt-3"
                  >
                    <ClinicMap
                      clinic={nextDest}
                      origin={nextOrigin}
                      clinicLabel={nextClinic?.name || 'Clinic'}
                      originLabel={t('pdash.you') || 'You'}
                      height={160}
                      className="!rounded-2xl border-0 shadow-sm ring-1 ring-slate-100"
                    />
                    {/* soft edge vignette so the map blends into the card (both themes) */}
                    <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-black/5 shadow-[inset_0_2px_14px_rgba(0,0,0,0.10)]" />
                  </motion.div>
                )}

                <Link to="appointments" className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-blue py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-blueDark">
                  <CalendarClock className="h-4 w-4" /> {t('pdash.manageAppointment')}
                </Link>
              </>
            ) : (
              <div className="my-auto grid place-items-center py-6 text-center">
                <CalendarDays className="mb-2 h-7 w-7 text-slate-300" />
                <p className="text-[13.5px] font-semibold text-brand-navy">{t('pdash.noUpcomingVisits')}</p>
                <Link to="appointments/book" className="mt-3 rounded-xl bg-brand-blue px-4 py-2 text-[13px] font-semibold text-white hover:bg-brand-blueDark">{t('pdash.bookOneNow')}</Link>
              </div>
            )}
          </Card>
        </div>
    </div>
  )
}

export default Dashboard
