import { useEffect, useState, Fragment } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ArrowRight, MapPin, Clock, Bell, Heart, ShieldCheck,
  Stethoscope, CalendarPlus, Sparkles, CalendarDays, Ticket, CheckCircle2, FolderHeart,
  Upload, Search, CalendarClock, Car, Users, AlertTriangle,
} from 'lucide-react'
import { Card, StatusBadge, Avatar } from '../../components/clinic/ui.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { patientsApi, tokensApi } from '../../api'
import { dateChip, prettyTime, statusLabel, todayISO, clockIST } from '../../lib/format.js'
import { useI18n } from '../../i18n/index.jsx'

const KPI_TONE = {
  blue: 'bg-blue-100 text-brand-blue',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-500',
}

const ACTIVE_STATUSES = ['scheduled', 'booked', 'confirmed', 'pending', 'checked_in', 'in_progress']

function KpiCard({ value, label, action, to, icon: Icon, tone }) {
  return (
    <Card className="flex items-start justify-between p-4">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-slate-500">{label}</p>
        <p className="mt-2 text-[30px] font-extrabold leading-none text-brand-navy">{value}</p>
        {to && action && (
          <Link to={to} className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-blue hover:gap-1.5">
            {action} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${KPI_TONE[tone]}`}>
        <Icon className="h-[22px] w-[22px]" />
      </span>
    </Card>
  )
}

const TRUST = [
  { icon: ShieldCheck, titleKey: 'pdash.trustSecureT', descKey: 'pdash.trustSecureD' },
  { icon: Clock, titleKey: 'pdash.trustTimeT', descKey: 'pdash.trustTimeD' },
  { icon: Bell, titleKey: 'pdash.trustInfoT', descKey: 'pdash.trustInfoD' },
  { icon: Heart, titleKey: 'pdash.trustCareT', descKey: 'pdash.trustCareD' },
]

const QUICK_ACTIONS = [
  { labelKey: 'pdash.qaBook', icon: CalendarPlus, to: 'appointments/book' },
  { labelKey: 'pdash.qaRecords', icon: FolderHeart, to: 'health-records' },
  { labelKey: 'pdash.qaPrescriptions', icon: Upload, to: 'prescriptions' },
  { labelKey: 'pdash.qaDoctors', icon: Search, to: 'doctors' },
]

const ACTION_STYLES = [
  { tile: 'bg-blue-50 text-brand-blue ring-blue-100', glow: 'bg-blue-200' },
  { tile: 'bg-green-50 text-green-600 ring-green-100', glow: 'bg-green-200' },
  { tile: 'bg-orange-50 text-orange-500 ring-orange-100', glow: 'bg-orange-200' },
  { tile: 'bg-teal-50 text-teal-600 ring-teal-100', glow: 'bg-teal-200' },
]

function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'pdash.greetingMorning'
  if (h < 17) return 'pdash.greetingAfternoon'
  return 'pdash.greetingEvening'
}

// Looping animations for the live queue. The current token gives a teal "sonar"
// pulse; the patient's own token zooms in/out with an orange glow so the eye is
// pulled straight to it.
const PULSE_TEAL = {
  animate: { boxShadow: ['0 0 0 0 rgba(13,148,136,0.5)', '0 0 0 9px rgba(13,148,136,0)'] },
  transition: { duration: 1.6, repeat: Infinity, ease: 'easeOut' },
}
const ZOOM_ORANGE = {
  animate: {
    scale: [1, 1.18, 1],
    boxShadow: ['0 0 0 0 rgba(249,115,22,0.55)', '0 0 0 11px rgba(249,115,22,0)', '0 0 0 0 rgba(249,115,22,0)'],
  },
  transition: { duration: 1.8, repeat: Infinity, ease: 'easeInOut' },
}
const GLOW_TOKEN_TILE = {
  animate: {
    scale: [1, 1.035, 1],
    boxShadow: ['0 0 0 0 rgba(249,115,22,0)', '0 0 22px 1px rgba(249,115,22,0.3)', '0 0 0 0 rgba(249,115,22,0)'],
  },
  transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
}

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
function SmartOpQueue({ est, onNotify, notifyOn }) {
  const { t } = useI18n()
  const youNum = est.token_number || digits(est.display_code)
  const nowNum = digits(est.now_serving)
  const before = Math.max(0, (est.queue_position || 1) - 1)
  const track = buildTrack(nowNum, youNum)

  const crowd =
    est.total_waiting <= 5
      ? { label: t('pdash.lightCrowd'), cls: 'border-emerald-100 bg-emerald-50 text-emerald-600' }
      : est.total_waiting <= 15
      ? { label: t('pdash.moderateCrowd'), cls: 'border-orange-100 bg-orange-50 text-orange-500' }
      : { label: t('pdash.heavyCrowd'), cls: 'border-red-100 bg-red-50 text-red-500' }
  const punctual =
    est.delay_min > 0
      ? { label: t('pdash.minLate', { n: est.delay_min }), icon: AlertTriangle, cls: 'border-orange-100 bg-orange-50 text-orange-500' }
      : { label: t('pdash.onTime'), icon: CheckCircle2, cls: 'border-emerald-100 bg-emerald-50 text-emerald-600' }

  // Circle styling per node — past tokens teal, upcoming grey, now solid teal, you orange.
  const circleCls = (node) =>
    node.kind === 'now'
      ? 'h-10 w-10 bg-teal-600 text-white text-[14px] shadow-[0_6px_16px_rgba(13,148,136,0.45)]'
      : node.kind === 'you'
      ? 'h-9 w-9 border-2 border-orange-300 bg-orange-50 text-orange-500 text-[13px]'
      : nowNum != null && node.n < nowNum
      ? 'h-9 w-9 bg-teal-100 text-teal-600 text-[13px]'
      : 'h-9 w-9 bg-slate-100 text-slate-400 text-[13px]'

  return (
    <>
      {/* Now serving / Your token */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{t('pdash.nowServing')}</p>
          <p className="mt-1.5 text-[32px] font-extrabold leading-none text-teal-600">{est.now_serving || '—'}</p>
        </div>
        <motion.div {...GLOW_TOKEN_TILE} className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-orange-400">{t('pdash.yourToken')}</p>
          <p className="mt-1.5 text-[32px] font-extrabold leading-none text-orange-500">{est.display_code || `#${est.token_number}`}</p>
        </motion.div>
      </div>

      {/* Token track */}
      {track.length > 0 && (
        <div className="mt-5 flex items-start px-1">
          {track.map((node, i) => (
            <Fragment key={i}>
              {i > 0 && <div className="mt-[18px] h-0.5 flex-1 bg-slate-200" />}
              <div className="flex flex-col items-center gap-1.5">
                {node.kind === 'gap' ? (
                  <span className="flex h-9 items-center px-1 text-[16px] font-bold text-slate-300">…</span>
                ) : node.kind === 'now' ? (
                  <motion.span {...PULSE_TEAL} className={`flex items-center justify-center rounded-full font-bold ${circleCls(node)}`}>{node.n}</motion.span>
                ) : node.kind === 'you' ? (
                  <motion.span {...ZOOM_ORANGE} className={`flex items-center justify-center rounded-full font-bold ${circleCls(node)}`}>{node.n}</motion.span>
                ) : (
                  <span className={`flex items-center justify-center rounded-full font-bold ${circleCls(node)}`}>{node.n}</span>
                )}
                <span
                  className={`h-4 text-[10.5px] font-semibold ${
                    node.kind === 'now' || node.kind === 'you' ? 'text-slate-400' : 'text-transparent'
                  }`}
                >
                  {node.kind === 'now' ? t('pdash.now') : node.kind === 'you' ? t('pdash.you') : '·'}
                </span>
              </div>
            </Fragment>
          ))}
        </div>
      )}

      {/* Status chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${punctual.cls}`}>
          <punctual.icon className="h-3.5 w-3.5" /> {punctual.label}
        </span>
        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11.5px] font-semibold ${crowd.cls}`}>
          <Users className="h-3.5 w-3.5" /> {crowd.label}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11.5px] font-semibold text-slate-500">
          {before === 0 ? t('pdash.youreNext') : t('pdash.beforeYou', { n: before })}
        </span>
      </div>

      {/* Wait + leave by */}
      <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-slate-50 px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <Clock className="h-5 w-5 shrink-0 text-teal-600" />
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-slate-400">{t('pdash.estWait')}</p>
            <p className="text-[17px] font-extrabold text-brand-navy">{est.wait_min != null ? t('pdash.min', { n: est.wait_min }) : '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <Car className="h-5 w-5 shrink-0 text-teal-600" />
          <div className="leading-tight">
            <p className="text-[11px] font-semibold text-slate-400">{t('pdash.leaveHomeBy')}</p>
            <p className="text-[17px] font-extrabold text-brand-navy">{est.should_leave_now ? t('pdash.leaveNow') : est.leave_by ? clockIST(est.leave_by) : '—'}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex gap-3">
        <Link to="appointments" className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-teal-600 py-3 text-[13.5px] font-bold text-white transition-colors hover:bg-teal-700">
          {t('pdash.viewOpQueue')} <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          onClick={onNotify}
          className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-3 text-[13.5px] font-bold transition-colors ${
            notifyOn ? 'border-teal-200 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Bell className="h-4 w-4" /> {notifyOn ? t('pdash.remindersOn') : t('pdash.notifyMe')}
        </button>
      </div>
    </>
  )
}

/**
 * Shown inside the Smart OP Queue card when the patient has no live token for
 * today — so we never present mock queue data as if it were real. Tells them
 * either when their queue will go live (future appointment) or to book one.
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
  const { t } = useI18n()
  const { patient, resolveDoctor, resolveHospital, resolveAffiliation } = usePatientCtx()
  const [appts, setAppts] = useState([])
  const [docCount, setDocCount] = useState(0)
  const [est, setEst] = useState(null)     // my token status for today (identity + ETA + leave-by)
  const [loading, setLoading] = useState(true)
  const [notify, setNotify] = useState(false)

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
      setLoading(true)
      try {
        const [list, docs] = await Promise.all([
          patientsApi.appointments(patient.patient_id).catch(() => []),
          patientsApi.documents(patient.patient_id).catch(() => []),
        ])
        if (!active) return
        list.sort((a, b) => (a.appointment_date < b.appointment_date ? 1 : -1))
        setAppts(list)
        setDocCount(docs?.length || 0)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [patient])

  const today = todayISO()
  const upcoming = appts.filter((a) => ACTIVE_STATUSES.includes(a.status) && a.appointment_date >= today)
  const completed = appts.filter((a) => a.status === 'completed').length
  const nextAppt = upcoming[upcoming.length - 1] // list is desc; last active is soonest
  const todayAppt = upcoming.find((a) => a.appointment_date === today) || null
  const name = patient?.name || 'there'

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

  const KPIS = [
    { value: String(upcoming.length).padStart(2, '0'), label: t('pdash.kpiUpcoming'), action: t('pdash.viewDetails'), to: 'appointments', icon: CalendarDays, tone: 'blue' },
    { value: est?.token_number ? String(est.token_number).padStart(2, '0') : '—', label: t('pdash.kpiToken'), icon: Ticket, tone: 'green' },
    { value: String(completed).padStart(2, '0'), label: t('pdash.kpiCompleted'), action: t('pdash.viewHistory'), to: 'appointments', icon: CheckCircle2, tone: 'purple' },
    { value: String(docCount).padStart(2, '0'), label: t('pdash.kpiRecords'), action: t('pdash.viewAllLower'), to: 'health-records', icon: FolderHeart, tone: 'orange' },
  ]

  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div>
        <h1 className="text-[22px] font-extrabold text-brand-navy">
          {t(greetingKey())}, {name} <span className="align-middle">👋</span>
        </h1>
        <p className="text-[13.5px] text-slate-500">{t('pdash.greetingLine')}</p>
      </div>

      <Link
        to="appointments/book"
        className="group relative isolate overflow-hidden rounded-2xl border border-brand-blue/20 bg-gradient-to-r from-brand-blue to-brand-blueDark px-5 py-4 text-white shadow-[0_18px_45px_rgba(37,99,235,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_22px_55px_rgba(37,99,235,0.38)]"
      >
        <span className="absolute -left-10 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-white/15 blur-2xl" />
        <span className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/25">
              <CalendarPlus className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-[17px] font-extrabold">{t('pdash.bookTitle')}</span>
              <span className="block text-[12.5px] font-medium text-white/80">{t('pdash.bookPromo')}</span>
            </span>
          </span>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-white px-4 py-2 text-[13px] font-bold text-brand-blue transition-transform group-hover:translate-x-1 sm:self-auto">
            <Sparkles className="h-4 w-4" /> {t('pdash.bookNow')} <ArrowRight className="h-4 w-4" />
          </span>
        </span>
      </Link>

      <div className="flex flex-col gap-5">
        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>

        {/* Today's Token + Next Visit */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Smart OP Queue */}
          <Card className="rounded-3xl p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-[18px] font-extrabold text-brand-navy">{t('pdash.smartQueue')}</h3>
              {est ? (
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-emerald-500">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  {t('pdash.liveUpdating')}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-slate-400">
                  <span className="h-2 w-2 rounded-full bg-slate-300" />
                  {t('pdash.queueIdle')}
                </span>
              )}
            </div>

            {est ? (
              <SmartOpQueue est={est} onNotify={notifyMe} notifyOn={notify} />
            ) : (
              <QueueEmpty nextAppt={nextAppt} />
            )}
          </Card>

          {/* Next Visit reminder */}
          <Card className="flex flex-col p-5">
            <h3 className="text-[17px] font-bold text-brand-navy">{t('pdash.nextVisit')}</h3>
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
                  {resolveAffiliation(nextAppt.affiliation_id)?.name || resolveHospital(nextAppt.hospital_id)?.name || resolveHospital(resolveDoctor(nextAppt.doctor_id)?.hospital_id)?.name || '—'}
                </p>
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

        {/* Upcoming appointments */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[17px] font-bold text-brand-navy">{t('pdash.upcomingAppts')}</h3>
            <Link to="appointments" className="text-[13px] font-semibold text-brand-blue hover:underline">{t('pcommon.viewAll')}</Link>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">{t('pcommon.loading')}</p>
          ) : upcoming.length === 0 ? (
            <p className="py-4 text-[13.5px] text-slate-400">{t('pdash.noUpcomingAppts')}</p>
          ) : (
            <ul className="divide-y divide-slate-50">
              {upcoming.slice(0, 5).map((a) => {
                const doc = resolveDoctor(a.doctor_id)
                const clinic = resolveAffiliation(a.affiliation_id) || resolveHospital(a.hospital_id) || resolveHospital(doc?.hospital_id)
                const chip = dateChip(a.appointment_date)
                return (
                  <li key={a.appointment_id} className="flex flex-wrap items-center gap-4 py-3">
                    <Avatar name={doc?.name || 'Doctor'} className="h-11 w-11" />
                    <div className="min-w-[150px] leading-tight">
                      <p className="text-[14px] font-bold text-brand-navy">{doc?.name || `Doctor #${a.doctor_id}`}</p>
                      <p className="text-[12px] text-slate-500">{doc?.specialization || a.appointment_type}</p>
                    </div>
                    <div className="flex items-center gap-2 text-center">
                      <div className="rounded-lg bg-brand-blueLight px-2.5 py-1">
                        <p className="text-[16px] font-extrabold leading-none text-brand-blue">{chip.day}</p>
                        <p className="text-[10px] text-slate-500">{chip.month}</p>
                      </div>
                      {a.slot_time && <span className="text-[13px] font-semibold text-slate-600">{prettyTime(a.slot_time)}</span>}
                    </div>
                    <div className="min-w-[150px] leading-tight">
                      <p className="text-[13px] font-semibold text-brand-navy">{clinic?.name || '—'}</p>
                      <p className="text-[12px] text-slate-400">{clinic ? [clinic.city, clinic.state].filter(Boolean).join(', ') : ''}</p>
                    </div>
                    <div className="ml-auto text-right">
                      <StatusBadge status={statusLabel(a.status)} />
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="p-5">
          <h3 className="mb-3 text-[17px] font-bold text-brand-navy">{t('pdash.quickActions')}</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {QUICK_ACTIONS.map(({ labelKey, icon: Icon, to }, index) => {
              const label = t(labelKey)
              const style = ACTION_STYLES[index % ACTION_STYLES.length]
              return (
                <Link
                  key={label}
                  to={to}
                  className="group flex min-h-[124px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 bg-white px-2 py-4 text-center transition-all hover:-translate-y-0.5 hover:border-brand-blue/30 hover:shadow-card"
                >
                  <span className={`relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl ring-1 ${style.tile}`}>
                    <span className={`absolute -right-2 -top-2 h-7 w-7 rounded-full opacity-70 ${style.glow}`} />
                    <Icon className="relative h-7 w-7 transition-transform group-hover:scale-110" />
                  </span>
                  <span className="min-h-[30px] text-[12px] font-semibold leading-tight text-brand-navy">{label}</span>
                </Link>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Trust strip */}
      <div className="mt-2 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.titleKey} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-greenLight text-brand-green">
                <Icon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-[13.5px] font-bold text-brand-navy">{t(item.titleKey)}</p>
                <p className="text-[12px] text-slate-500">{t(item.descKey)}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11.5px] text-slate-400">
        <span className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> {t('pdash.footerConsole')}</span>
        <span>{t('pdash.footerRights')}</span>
      </div>
    </div>
  )
}

export default Dashboard
