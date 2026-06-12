import { useState, useEffect } from 'react'
import {
  CheckCircle2, Users, Clock, UserPlus, XCircle, ArrowRight, PlayCircle,
  PauseCircle, SkipForward, Radio, AlertTriangle, RefreshCw,
  BellRing, BarChart3, MessageSquare, CalendarClock, UserCheck, ChevronDown,
} from 'lucide-react'
import { Card, StatusBadge } from '../../components/clinic/ui.jsx'
import {
  DOCTOR, KPIS, CLINIC_OVERVIEW, QUEUE, CURRENT_ELAPSED_SEC, SCHEDULE,
  RECENT_APPTS, NOTIFICATIONS, WAIT_SLA_MINS,
} from '../../data/doctorDashboardData.js'

/* ---------------- KPI strip ---------------- */
const KPI_TONE = {
  blue: 'bg-blue-100 text-brand-blue',
  green: 'bg-green-100 text-green-600',
  orange: 'bg-orange-100 text-orange-500',
  purple: 'bg-purple-100 text-purple-600',
  teal: 'bg-teal-100 text-teal-600',
}
function KpiCard({ value, label, sub, icon: Icon, tone }) {
  return (
    <div className="flex items-start justify-between rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-slate-500">{label}</p>
        <p className="mt-2.5 text-[34px] font-extrabold leading-none text-brand-navy">{value}</p>
        <p className="mt-2 text-[12px] text-slate-400">{sub}</p>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${KPI_TONE[tone]}`}>
        <Icon className="h-[22px] w-[22px]" />
      </span>
    </div>
  )
}

/* ---------------- Wait-time SLA cell ---------------- */
function WaitCell({ mins }) {
  if (mins == null) return <span className="text-slate-300">—</span>
  const over = mins > WAIT_SLA_MINS
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${over ? 'text-red-500' : 'text-slate-500'}`}>
      {over && <AlertTriangle className="h-4 w-4" />}~{mins} mins
    </span>
  )
}

/* ---------------- Quick actions ---------------- */
const ACTIONS = [
  { label: 'Add Walk-in Patient', icon: UserPlus, tone: 'blue' },
  { label: 'Update Queue', icon: RefreshCw, tone: 'orange' },
  { label: 'Doctor Delay Alert', icon: BellRing, tone: 'red', action: 'delay' },
  { label: 'Block Time Slot', icon: CalendarClock, tone: 'purple' },
  { label: 'View Reports', icon: BarChart3, tone: 'teal' },
  { label: 'Send Message', icon: MessageSquare, tone: 'green' },
]
const ACTION_TONE = {
  blue: 'text-brand-blue', orange: 'text-orange-500', red: 'text-red-500',
  purple: 'text-purple-600', teal: 'text-teal-600', green: 'text-green-600',
}

/* ---------------- Notifications ---------------- */
const NOTIF = {
  appt: { icon: UserPlus, tone: 'bg-blue-100 text-brand-blue' },
  arrived: { icon: UserCheck, tone: 'bg-green-100 text-green-600' },
  delay: { icon: BellRing, tone: 'bg-purple-100 text-purple-600' },
  walkin: { icon: Users, tone: 'bg-teal-100 text-teal-600' },
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function Dashboard() {
  const [queue, setQueue] = useState(QUEUE)
  const [elapsed, setElapsed] = useState(CURRENT_ELAPSED_SEC)
  const [delay, setDelay] = useState(null)

  const current = queue.find((p) => p.status === 'In Consultation') || null
  const waiting = queue.filter((p) => p.status === 'Waiting')
  const next = waiting[0] || null
  const overSla = waiting.filter((p) => p.waitMins > WAIT_SLA_MINS).length

  // Live consultation timer — runs only while someone is in consultation.
  useEffect(() => {
    if (!current) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [current?.token])

  /* ---- live queue controls ---- */
  const markComplete = () => {
    if (!current) return
    setQueue((q) => q.map((p) => (p.token === current.token ? { ...p, status: 'Completed' } : p)))
  }
  const hold = () => {
    if (!current) return
    setQueue((q) => q.map((p) => (p.token === current.token ? { ...p, status: 'On Hold' } : p)))
  }
  const callNext = () => {
    setQueue((q) => {
      let nq = current ? q.map((p) => (p.token === current.token ? { ...p, status: 'Completed' } : p)) : q
      const nx = nq.find((p) => p.status === 'Waiting')
      if (nx) nq = nq.map((p) => (p.token === nx.token ? { ...p, status: 'In Consultation', waitMins: null } : p))
      return nq
    })
    setElapsed(0)
  }
  const sendDelayAlert = () => setDelay({ count: waiting.length, eta: 15 })

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      {/* Delay-alert impact banner */}
      {delay && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
          <BellRing className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="flex-1 text-[13.5px] text-amber-800">
            <span className="font-bold">Delay alert sent</span> to {delay.count} waiting patient
            {delay.count === 1 ? '' : 's'} — revised ETA <span className="font-bold">+{delay.eta} mins</span>. They’ve been notified by SMS.
          </p>
          <button onClick={() => setDelay(null)} className="rounded-lg p-1 text-amber-500 hover:bg-amber-100" aria-label="Dismiss">
            <XCircle className="h-5 w-5" />
          </button>
        </div>
      )}

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px] gap-6">
        {/* ============ MAIN COLUMN ============ */}
        <div className="flex min-h-0 flex-col gap-4">
          {/* KPI strip */}
          <div className="grid grid-cols-5 gap-4">
            {KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
          </div>

          {/* Live queue + schedule */}
          <div className="grid min-h-0 flex-1 grid-cols-[1.4fr_1fr] gap-6">
            {/* Live OP Queue */}
            <Card className="flex min-h-0 flex-col p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-[17px] font-bold text-brand-navy">Live OP Queue</h3>
                  <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                    </span>
                    Live
                  </span>
                </div>
                {overSla > 0 && (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-red-500">
                    <AlertTriangle className="h-4 w-4" /> {overSla} over SLA
                  </span>
                )}
              </div>

              <div className="grid min-h-0 flex-1 grid-cols-[200px_1fr] gap-5">
                {/* Current / next + controls */}
                <div className="flex flex-col gap-3">
                  {current ? (
                    <div className="rounded-2xl border border-green-100 bg-green-50/60 p-3.5">
                      <p className="text-[12px] font-semibold text-slate-500">Current Token</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Radio className="h-6 w-6 text-green-500" />
                        <span className="text-[38px] font-extrabold leading-none text-green-600">{current.token}</span>
                      </div>
                      <p className="mt-2 truncate text-[14px] font-bold text-brand-navy">{current.name}</p>
                      <div className="mt-2.5 flex items-center justify-between">
                        <StatusBadge status="In Consultation" />
                        <span className="flex items-center gap-1 text-[13px] font-bold tabular-nums text-brand-navy">
                          <Clock className="h-4 w-4 text-slate-400" />{fmt(elapsed)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                      <p className="text-[13px] font-semibold text-slate-500">No active consultation</p>
                      <p className="mt-1 text-[12px] text-slate-400">Call the next patient to begin.</p>
                    </div>
                  )}

                  {/* Controls */}
                  <div className="flex flex-col gap-2">
                    <button onClick={callNext} disabled={!next}
                      className="flex items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:cursor-not-allowed disabled:opacity-40">
                      <PlayCircle className="h-4 w-4" /> Call Next
                    </button>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={markComplete} disabled={!current}
                        className="flex items-center justify-center gap-1 rounded-xl border border-green-200 py-2 text-[12.5px] font-semibold text-green-600 transition-colors hover:bg-green-50 disabled:opacity-40">
                        <CheckCircle2 className="h-4 w-4" /> Done
                      </button>
                      <button onClick={hold} disabled={!current}
                        className="flex items-center justify-center gap-1 rounded-xl border border-amber-200 py-2 text-[12.5px] font-semibold text-amber-600 transition-colors hover:bg-amber-50 disabled:opacity-40">
                        <PauseCircle className="h-4 w-4" /> Hold
                      </button>
                    </div>
                  </div>

                  {/* Next token */}
                  <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                    <p className="text-[12px] font-semibold text-slate-500">Next Token</p>
                    {next ? (
                      <>
                        <div className="mt-1 flex items-center gap-2">
                          <SkipForward className="h-5 w-5 text-slate-400" />
                          <span className="text-[26px] font-extrabold leading-none text-brand-navy">{next.token}</span>
                        </div>
                        <p className="mt-1.5 truncate text-[13px] text-slate-500">{next.name}</p>
                      </>
                    ) : (
                      <p className="mt-1.5 text-[13px] text-slate-400">Queue clear 🎉</p>
                    )}
                  </div>
                </div>

                {/* Queue table */}
                <div className="min-h-0 overflow-auto">
                  <table className="w-full text-left">
                    <thead className="sticky top-0 bg-white">
                      <tr className="text-[12px] font-semibold text-slate-400">
                        <th className="pb-3 pr-2">Token</th>
                        <th className="pb-3 pr-2">Patient</th>
                        <th className="pb-3 pr-2">Status</th>
                        <th className="pb-3">Wait (Est.)</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13.5px]">
                      {queue.map((r) => (
                        <tr key={r.token} className={`border-t border-slate-50 ${r.status === 'In Consultation' ? 'bg-green-50/40' : ''}`}>
                          <td className="py-3 pr-2 font-bold text-brand-navy">{r.token}</td>
                          <td className="py-3 pr-2 text-slate-600">{r.name}</td>
                          <td className="py-3 pr-2"><StatusBadge status={r.status} /></td>
                          <td className="py-3 text-[13px]"><WaitCell mins={r.waitMins} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>

            {/* Today's Schedule */}
            <Card className="flex min-h-0 flex-col p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-brand-navy">Today's Schedule</h3>
                <button className="text-[13px] font-semibold text-brand-blue hover:underline">View Full</button>
              </div>
              <ul className="min-h-0 flex-1 divide-y divide-slate-50 overflow-auto">
                {SCHEDULE.map((s, i) => (
                  <li key={i} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3.5">
                      <span className="text-[13px] font-semibold tabular-nums text-slate-500">{s.time}</span>
                      <span className={`text-[14px] ${s.isBreak ? 'italic text-slate-400' : 'font-medium text-brand-navy'}`}>{s.name}</span>
                    </div>
                    {s.status ? <StatusBadge status={s.status} /> : <span className="text-slate-300">—</span>}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Recent appointments + quick actions */}
          <div className="grid grid-cols-[1.4fr_1fr] gap-6">
            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-brand-navy">Recent Appointments</h3>
                <button className="text-[13px] font-semibold text-brand-blue hover:underline">View all</button>
              </div>
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[12px] font-semibold text-slate-400">
                    <th className="pb-3 pr-3">Time</th><th className="pb-3 pr-3">Patient</th>
                    <th className="pb-3 pr-3">Type</th><th className="pb-3 pr-3">Token</th>
                    <th className="pb-3 pr-3">Status</th><th className="pb-3">Payment</th>
                  </tr>
                </thead>
                <tbody className="text-[13.5px]">
                  {RECENT_APPTS.map((a) => (
                    <tr key={a.token} className="border-t border-slate-50">
                      <td className="py-2.5 pr-3 font-semibold tabular-nums text-slate-500">{a.time}</td>
                      <td className="py-2.5 pr-3 text-slate-600">{a.patient}</td>
                      <td className="py-2.5 pr-3">
                        <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${a.type === 'Walk-in' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-brand-blue'}`}>{a.type}</span>
                      </td>
                      <td className="py-2.5 pr-3 font-bold text-brand-navy">{a.token}</td>
                      <td className="py-2.5 pr-3"><StatusBadge status={a.status} /></td>
                      <td className="py-2.5 text-[13px] text-slate-500">{a.payment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            {/* Quick Actions */}
            <Card className="p-5">
              <h3 className="mb-3 text-[17px] font-bold text-brand-navy">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-3">
                {ACTIONS.map(({ label, icon: Icon, tone, action }) => (
                  <button
                    key={label}
                    onClick={action === 'delay' ? sendDelayAlert : undefined}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 px-2 py-4 text-center transition-colors hover:border-brand-blue hover:bg-brand-blueLight/40"
                  >
                    <Icon className={`h-6 w-6 ${ACTION_TONE[tone]}`} />
                    <span className="text-[12px] font-semibold leading-tight text-brand-navy">{label}</span>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>

        {/* ============ RIGHT RAIL ============ */}
        <div className="flex min-h-0 flex-col gap-6">
          {/* Clinic overview */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-brand-navy">Clinic Overview</h3>
              <button className="flex items-center gap-1 text-[13px] font-semibold text-slate-500">{DOCTOR.date} <ChevronDown className="h-4 w-4" /></button>
            </div>
            <ul className="space-y-3.5">
              {CLINIC_OVERVIEW.map(({ label, value, icon: Icon }) => (
                <li key={label} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-[18px] w-[18px]" /></span>
                  <span className="flex-1 text-[14px] text-slate-600">{label}</span>
                  <span className="text-[16px] font-extrabold text-brand-navy">{value}</span>
                </li>
              ))}
            </ul>
            <button className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-brand-blue hover:gap-1.5">
              View Analytics <ArrowRight className="h-4 w-4" />
            </button>
          </Card>

          {/* Recent notifications */}
          <Card className="flex min-h-0 flex-1 flex-col p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-brand-navy">Recent Notifications</h3>
              <button className="text-[13px] font-semibold text-brand-blue hover:underline">View All</button>
            </div>
            <ul className="min-h-0 flex-1 space-y-4 overflow-auto">
              {NOTIFICATIONS.map((n, i) => {
                const meta = NOTIF[n.kind]
                const Icon = meta.icon
                return (
                  <li key={i} className="flex gap-3">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}><Icon className="h-[18px] w-[18px]" /></span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-bold text-brand-navy">{n.title}</p>
                      <p className="truncate text-[12.5px] text-slate-500">{n.desc}</p>
                      <p className="text-[11px] text-slate-400">{n.time}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11.5px] text-slate-400">
        <span>Doctor Mitra for Clinics · Version 1.0.0</span>
        <span>© 2025 Doctor Mitra. All rights reserved.</span>
      </div>
    </div>
  )
}

export default Dashboard
