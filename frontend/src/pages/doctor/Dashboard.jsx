import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays, CheckCircle2, Hourglass, Users, Clock, UserPlus, XCircle,
  ArrowRight, PlayCircle, SkipForward, Radio, RefreshCw, UserCheck,
  BellRing, BarChart3, MessageSquare, CalendarClock, Bell, CalendarCheck, ChevronDown,
} from 'lucide-react'
import { Card, StatusBadge, Avatar } from '../../components/clinic/ui.jsx'
import AnimatedNumber from '../../components/common/AnimatedNumber.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { appointmentsApi, tokensApi, doctorsApi, notificationsApi } from '../../api'
import { prettyTime, statusLabel, relativeTime, todayISO } from '../../lib/format.js'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } } }
const rise = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 } }

const KPI_TONE = {
  blue: 'bg-blue-100 text-brand-blue', green: 'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-500', purple: 'bg-purple-100 text-purple-600',
  teal: 'bg-teal-100 text-teal-600',
}

function KpiCard({ value, isNum = true, label, sub, icon: Icon, tone, footer }) {
  return (
    <motion.div variants={item} whileHover={{ y: -4 }} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="flex items-start justify-between">
        <p className="text-[13px] font-semibold text-slate-500">{label}</p>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${KPI_TONE[tone]}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-2.5 text-[32px] font-extrabold leading-none text-brand-navy">
        {isNum ? <AnimatedNumber value={value} /> : value}
      </p>
      {sub && <p className="mt-2 text-[12px] text-slate-400">{sub}</p>}
      {footer}
    </motion.div>
  )
}

const ACTION_TONE = {
  blue: 'text-brand-blue', orange: 'text-orange-500', red: 'text-red-500',
  purple: 'text-purple-600', teal: 'text-teal-600', green: 'text-green-600',
}

function notifMeta(type = '') {
  const t = type.toLowerCase()
  if (t.includes('walk')) return { icon: Users, tone: 'bg-teal-100 text-teal-600' }
  if (t.includes('delay')) return { icon: BellRing, tone: 'bg-purple-100 text-purple-600' }
  if (t.includes('arriv') || t.includes('check')) return { icon: UserCheck, tone: 'bg-green-100 text-green-600' }
  if (t.includes('appoint') || t.includes('book')) return { icon: UserPlus, tone: 'bg-blue-100 text-brand-blue' }
  return { icon: Bell, tone: 'bg-slate-100 text-slate-500' }
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const pct = (n, total) => (total > 0 ? `${Math.round((n / total) * 100)}% of total` : '—')

function Dashboard() {
  const navigate = useNavigate()
  const { doctorId, doctor, resolvePatient } = useDoctorCtx()
  const [appts, setAppts] = useState([])
  const [queue, setQueue] = useState({ current: null, waiting: [], total_waiting: 0 })
  const [stats, setStats] = useState(null)
  const [notifs, setNotifs] = useState([])
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const startRef = useRef(null)

  const loadQueue = useCallback(async () => {
    if (!doctorId) return
    const [q, s] = await Promise.all([
      tokensApi.queue(doctorId, todayISO()).catch(() => null),
      tokensApi.stats(doctorId).catch(() => null),
    ])
    if (q) setQueue(q)
    setStats(s)
    startRef.current = q?.current?.actual_start ? new Date(q.current.actual_start).getTime() : null
  }, [doctorId])

  const loadAll = useCallback(async () => {
    if (!doctorId) return
    const [t, n] = await Promise.all([
      appointmentsApi.today(doctorId).catch(() => []),
      notificationsApi.history({ size: 8 }).catch(() => []),
    ])
    setAppts(t || [])
    setNotifs(n || [])
    loadQueue()
  }, [doctorId, loadQueue])

  useEffect(() => {
    loadAll()
    const poll = setInterval(loadQueue, 10000)
    return () => clearInterval(poll)
  }, [loadAll, loadQueue])

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(startRef.current ? Math.max(0, Math.round((Date.now() - startRef.current) / 1000)) : 0)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const act = async (fn) => {
    setBusy(true)
    try {
      await fn()
      await loadQueue()
    } catch (e) {
      alert(e.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  const current = queue.current
  const waiting = queue.waiting || []
  const next = waiting[0] || null
  const nameOf = (t) => t?.patient_name || resolvePatient(t?.patient_id)?.name || (t ? `Token ${t.token_number}` : '')

  const total = appts.length
  const completedToday = stats?.served ?? appts.filter((a) => a.status === 'completed').length
  const inQueue = stats?.waiting ?? queue.total_waiting
  const remaining = appts.filter((a) => a.status === 'scheduled').length
  const walkins = appts.filter((a) => a.appointment_type === 'walkin').length
  const online = appts.filter((a) => a.appointment_type === 'regular').length
  const noShows = appts.filter((a) => a.status === 'no_show').length

  const CLINIC_OVERVIEW = [
    { label: 'Total Today', value: total, icon: Users },
    { label: 'Walk-in Patients', value: walkins, icon: UserPlus },
    { label: 'Online Appointments', value: online, icon: CalendarCheck },
    { label: 'No Shows', value: noShows, icon: XCircle },
    { label: 'Completed', value: completedToday, icon: CheckCircle2 },
  ]

  const ACTIONS = [
    { label: 'Update Queue', icon: RefreshCw, tone: 'orange', go: 'queue' },
    { label: 'Doctor Delay Alert', icon: BellRing, tone: 'red', delay: true },
    { label: 'My Availability', icon: CalendarClock, tone: 'purple', go: 'availability' },
    { label: 'View Reports', icon: BarChart3, tone: 'teal', go: 'reports' },
    { label: 'Messages', icon: MessageSquare, tone: 'green', go: 'messages' },
  ]

  return (
    <div className="flex flex-col gap-5">
      {/* Greeting row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">Dashboard</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage appointments, queue and clinic operations in real time.</p>
        </div>
        <button onClick={loadAll} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:border-slate-300">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_330px]">
        {/* MAIN COLUMN */}
        <div className="flex flex-col gap-5">
          {/* KPIs */}
          <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            <KpiCard value={total} label="Today's Appointments" sub="Total" icon={CalendarDays} tone="blue"
              footer={<button onClick={() => navigate('/doctor-dashboard/appointments')} className="mt-1.5 text-[12px] font-semibold text-brand-blue hover:underline">View details</button>} />
            <KpiCard value={completedToday} label="Completed" sub={pct(completedToday, total)} icon={CheckCircle2} tone="green" />
            <KpiCard value={inQueue} label="In Queue" sub={pct(inQueue, total)} icon={Hourglass} tone="orange" />
            <KpiCard value={remaining} label="Remaining" sub={pct(remaining, total)} icon={Users} tone="purple" />
            <KpiCard isNum={false} value={stats?.avg_wait_mins != null ? `${stats.avg_wait_mins} mins` : '—'} label="Avg Consultation" sub="Today" icon={Clock} tone="teal" />
          </motion.div>

          {/* Live queue + today's schedule */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
            {/* Live OP Queue — hero */}
            <motion.div {...rise} transition={{ delay: 0.1 }}>
              <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-card">
                {/* Gradient hero */}
                <div className="relative overflow-hidden bg-gradient-to-br from-brand-blue via-blue-600 to-indigo-600 p-5">
                  <motion.div
                    aria-hidden
                    animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.4, 0.25] }}
                    transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
                    className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-white/20 blur-2xl"
                  />
                  <motion.div
                    aria-hidden
                    animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.3, 0.15] }}
                    transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                    className="pointer-events-none absolute -bottom-14 left-16 h-36 w-36 rounded-full bg-indigo-300/30 blur-2xl"
                  />
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-[17px] font-bold text-white">Live OP Queue</h3>
                      <span className="flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                        <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-300 opacity-80" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-300" /></span>Live
                      </span>
                    </div>
                    <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">{waiting.length} waiting</span>
                  </div>

                  <div className="relative mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <AnimatePresence mode="wait">
                      {current ? (
                        <motion.div key={current.token_id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} className="flex items-center gap-4">
                          <div className="relative flex flex-col items-center justify-center rounded-2xl bg-white/15 px-6 py-3 backdrop-blur">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-white/70">Now Serving</span>
                            <span className="text-[46px] font-extrabold leading-none text-white">{current.token_number}</span>
                          </div>
                          <div className="text-white">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={nameOf(current)} tone="bg-white/20" className="h-11 w-11 text-base" />
                              <div className="leading-tight">
                                <p className="text-[17px] font-bold">{nameOf(current)}</p>
                                <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-white/80">
                                  <span className="rounded-md bg-white/15 px-1.5 py-0.5 font-semibold capitalize backdrop-blur">{statusLabel(current.status)}</span>
                                  <span className="flex items-center gap-1 tabular-nums"><Clock className="h-3.5 w-3.5" />{fmt(elapsed)}</span>
                                </p>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-3 text-white">
                          <Radio className="h-9 w-9 text-white/50" />
                          <div>
                            <p className="text-[16px] font-bold">No active consultation</p>
                            <p className="text-[12px] text-white/70">{next ? 'Call the next patient to begin.' : 'Queue is clear.'}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-wrap gap-2">
                      {current && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => act(() => tokensApi.skip(current.token_id, 'Skipped'))} disabled={busy}
                          className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-[13px] font-semibold text-white backdrop-blur hover:bg-white/25 disabled:opacity-50">
                          <SkipForward className="h-4 w-4" /> Skip
                        </motion.button>
                      )}
                      {current && (
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => act(() => tokensApi.complete(current.token_id))} disabled={busy}
                          className="flex items-center gap-1.5 rounded-xl bg-white/15 px-3.5 py-2.5 text-[13px] font-semibold text-white backdrop-blur hover:bg-white/25 disabled:opacity-50">
                          <CheckCircle2 className="h-4 w-4" /> Done
                        </motion.button>
                      )}
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => act(() => tokensApi.next(doctorId))} disabled={busy || !next}
                        className="flex items-center gap-1.5 rounded-xl bg-white px-5 py-2.5 text-[13px] font-bold text-brand-blue shadow-sm hover:bg-blue-50 disabled:opacity-50">
                        <PlayCircle className="h-4 w-4" /> Call Next
                      </motion.button>
                    </div>
                  </div>

                  {/* Next-up chip */}
                  {next && (
                    <div className="relative mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-white backdrop-blur">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/60">Next</span>
                      <span className="text-[15px] font-extrabold">#{next.token_number}</span>
                      <span className="truncate text-[13px] text-white/85">{nameOf(next)}</span>
                    </div>
                  )}
                </div>

                {/* Queue table */}
                <div className="overflow-x-auto px-5 py-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[12px] font-semibold text-slate-400">
                        <th className="pb-3 pr-2">Token</th><th className="pb-3 pr-2">Patient</th><th className="pb-3 pr-2">Status</th><th className="pb-3">Est.</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13.5px]">
                      <AnimatePresence initial={false}>
                        {[current, ...waiting].filter(Boolean).map((r, i) => (
                          <motion.tr key={r.token_id} initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ delay: Math.min(0.08 + i * 0.04, 0.5) }} className={`border-t border-slate-50 ${r.status === 'current' ? 'bg-brand-blueLight/50' : 'hover:bg-slate-50/70'}`}>
                            <td className="py-2.5 pr-2"><span className={`inline-flex h-7 min-w-7 items-center justify-center rounded-lg px-1.5 text-[12px] font-extrabold ${r.status === 'current' ? 'bg-brand-blue text-white' : 'bg-slate-100 text-brand-navy'}`}>{r.token_number}</span></td>
                            <td className="py-2.5 pr-2 font-medium text-slate-600">{nameOf(r)}</td>
                            <td className="py-2.5 pr-2"><StatusBadge status={statusLabel(r.status)} /></td>
                            <td className="py-2.5 text-[13px] text-slate-500">{r.estimated_time ? prettyTime(r.estimated_time) : '—'}</td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                  {!current && waiting.length === 0 && <p className="py-6 text-center text-sm text-slate-400">Queue is empty.</p>}
                  <button onClick={() => navigate('/doctor-dashboard/queue')} className="mt-3 flex items-center gap-1 text-[12px] font-semibold text-brand-blue hover:underline">View Full Queue <ArrowRight className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </motion.div>

            {/* Today's Schedule */}
            <motion.div {...rise} transition={{ delay: 0.15 }}>
              <Card className="flex h-full flex-col !p-0">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <h3 className="text-[16px] font-bold text-brand-navy">Today's Schedule</h3>
                  <button onClick={() => navigate('/doctor-dashboard/today')} className="text-[12px] font-semibold text-brand-blue hover:underline">View Full</button>
                </div>
                <ul className="max-h-[360px] flex-1 divide-y divide-slate-50 overflow-auto px-5">
                  {appts.length === 0 && <li className="py-6 text-center text-sm text-slate-400">Nothing scheduled today.</li>}
                  {appts.map((a, i) => (
                    <motion.li key={a.appointment_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 + i * 0.03 }} className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-3">
                        <span className="text-[13px] font-semibold tabular-nums text-slate-500">{a.slot_time ? prettyTime(a.slot_time) : '—'}</span>
                        <span className="text-[14px] font-medium text-brand-navy">{a.patient_name || resolvePatient(a.patient_id)?.name || `Patient #${a.patient_id}`}</span>
                      </div>
                      <StatusBadge status={statusLabel(a.status)} />
                    </motion.li>
                  ))}
                </ul>
              </Card>
            </motion.div>
          </div>

          {/* Recent appointments + quick actions */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr]">
            <motion.div {...rise} transition={{ delay: 0.2 }}>
              <Card className="!p-0">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                  <h3 className="text-[16px] font-bold text-brand-navy">Recent Appointments</h3>
                  <button onClick={() => navigate('/doctor-dashboard/appointments')} className="text-[12px] font-semibold text-brand-blue hover:underline">View all</button>
                </div>
                <div className="overflow-x-auto px-5 py-2">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[12px] font-semibold text-slate-400">
                        <th className="py-2 pr-3">Time</th><th className="py-2 pr-3">Patient</th><th className="py-2 pr-3">Type</th><th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13.5px]">
                      {appts.slice(0, 6).map((a) => (
                        <tr key={a.appointment_id} className="border-t border-slate-50">
                          <td className="py-2.5 pr-3 font-semibold tabular-nums text-slate-500">{a.slot_time ? prettyTime(a.slot_time) : '—'}</td>
                          <td className="py-2.5 pr-3 text-slate-600">{a.patient_name || resolvePatient(a.patient_id)?.name || `Patient #${a.patient_id}`}</td>
                          <td className="py-2.5 pr-3">
                            <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${a.appointment_type === 'walkin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-brand-blue'}`}>{a.appointment_type === 'walkin' ? 'Walk-in' : 'Online'}</span>
                          </td>
                          <td className="py-2.5"><StatusBadge status={statusLabel(a.status)} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {appts.length === 0 && <p className="py-6 text-center text-sm text-slate-400">No appointments today.</p>}
                </div>
              </Card>
            </motion.div>

            <motion.div {...rise} transition={{ delay: 0.25 }}>
              <Card>
                <h3 className="mb-3 text-[16px] font-bold text-brand-navy">Quick Actions</h3>
                <div className="grid grid-cols-3 gap-3">
                  {ACTIONS.map(({ label, icon: Icon, tone, go, delay }) => (
                    <motion.button
                      key={label} whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.96 }}
                      onClick={() => delay ? act(() => doctorsApi.logDelay({ doctor_id: doctorId, delay_minutes: 15, reason: 'Running late' })) : navigate(`/doctor-dashboard/${go}`)}
                      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 px-2 py-4 text-center hover:border-brand-blue/40 hover:bg-brand-blueLight/30"
                    >
                      <Icon className={`h-6 w-6 ${ACTION_TONE[tone]}`} />
                      <span className="text-[12px] font-semibold leading-tight text-brand-navy">{label}</span>
                    </motion.button>
                  ))}
                </div>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* RIGHT RAIL */}
        <div className="flex flex-col gap-5">
          <motion.div {...rise} transition={{ delay: 0.1 }}>
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[16px] font-bold text-brand-navy">Clinic Overview</h3>
                <span className="flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">Today <ChevronDown className="h-3 w-3" /></span>
              </div>
              <ul className="space-y-3">
                {CLINIC_OVERVIEW.map(({ label, value, icon: Icon }) => (
                  <li key={label} className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-[18px] w-[18px]" /></span>
                    <span className="flex-1 text-[14px] text-slate-600">{label}</span>
                    <span className="text-[16px] font-extrabold text-brand-navy"><AnimatedNumber value={value} /></span>
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/doctor-dashboard/analytics')} className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-brand-blue hover:gap-1.5">
                View Analytics <ArrowRight className="h-4 w-4" />
              </button>
            </Card>
          </motion.div>

          <motion.div {...rise} transition={{ delay: 0.18 }}>
            <Card className="!p-0">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
                <h3 className="text-[16px] font-bold text-brand-navy">Recent Notifications</h3>
                <button onClick={() => navigate('/doctor-dashboard/notifications')} className="text-[12px] font-semibold text-brand-blue hover:underline">View All</button>
              </div>
              <ul className="space-y-4 p-5">
                {notifs.length === 0 && <li className="text-[13px] text-slate-400">No recent notifications.</li>}
                {notifs.map((n, i) => {
                  const meta = notifMeta(n.type)
                  const Icon = meta.icon
                  return (
                    <motion.li key={n.notification_id} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }} className="flex gap-3">
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}><Icon className="h-[18px] w-[18px]" /></span>
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-bold text-brand-navy">{n.title}</p>
                        <p className="truncate text-[12.5px] text-slate-500">{n.message}</p>
                        <p className="text-[11px] text-slate-400">{relativeTime(n.created_at)}</p>
                      </div>
                    </motion.li>
                  )
                })}
              </ul>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Footer banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-green-100 bg-green-50/50 px-5 py-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-600"><CheckCircle2 className="h-5 w-5" /></span>
        <p className="text-[13px] text-slate-600">
          <span className="font-semibold text-brand-navy">Keep your queue updated</span> for a better patient experience and smoother clinic operations. Real-time updates improve trust and reduce waiting time.
        </p>
      </div>
    </div>
  )
}

export default Dashboard
