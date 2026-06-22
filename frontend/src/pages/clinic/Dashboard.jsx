import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CalendarDays, Radio, ArrowRight, Plus, UserPlus, Stethoscope, Clock, BarChart3, ChevronRight,
  Users, CheckCircle2,
} from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { VISITS_WEEK } from '../../data/clinicPagesData.js'
import { doctorsApi, tokensApi, appointmentsApi, reportsApi } from '../../api'
import { prettyTime, statusLabel, todayISO } from '../../lib/format.js'

const QUICK = [
  { label: 'Book Appointment', to: '/clinic-dashboard/appointments', icon: Plus, tone: 'blue' },
  { label: 'Add Walk-in', to: '/clinic-dashboard/walk-ins', icon: UserPlus, tone: 'green' },
  { label: 'Manage Doctors', to: '/clinic-dashboard/doctors', icon: Stethoscope, tone: 'purple' },
  { label: 'Set Availability', to: '/clinic-dashboard/availability', icon: Clock, tone: 'orange' },
  { label: 'View Reports', to: '/clinic-dashboard/reports', icon: BarChart3, tone: 'teal' },
]
const QTONE = {
  blue: 'bg-blue-100 text-brand-blue', green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600', orange: 'bg-orange-100 text-orange-500', teal: 'bg-teal-100 text-teal-600',
}

function MiniBars({ data }) {
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="flex h-full items-end gap-2 pt-2">
      {data.map((d) => (
        <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          <div className="w-full rounded-t-md bg-gradient-to-t from-brand-blue/50 to-brand-blue" style={{ height: `${(d.value / max) * 100}%` }} />
          <span className="text-[10px] text-slate-400">{d.day}</span>
        </div>
      ))}
    </div>
  )
}

function Dashboard() {
  const [kpis, setKpis] = useState(null)
  const [queue, setQueue] = useState({ current: null, waiting: [] })
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const today = todayISO()
    try {
      const [dash, docs, apptList] = await Promise.all([
        reportsApi.dashboard().catch(() => null),
        doctorsApi.list().catch(() => []),
        appointmentsApi.list({ date: today }).catch(() => []),
      ])
      setKpis(dash?.kpis || null)
      setAppts(apptList || [])

      // Aggregate the live queue across every doctor in the clinic.
      const queues = await Promise.all(
        (docs || []).map((d) =>
          tokensApi.queue(d.doctor_id, today).then((q) => ({ q, doc: d })).catch(() => null),
        ),
      )
      let current = null
      const waiting = []
      queues.filter(Boolean).forEach(({ q, doc }) => {
        if (!current && q.current) current = { ...q.current, doctorName: doc.name }
        ;(q.waiting || []).forEach((t) => waiting.push({ ...t, doctorName: doc.name }))
      })
      waiting.sort((a, b) => (a.estimated_time || '').localeCompare(b.estimated_time || ''))
      setQueue({ current, waiting })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000) // keep the queue snapshot live
    return () => clearInterval(id)
  }, [])

  const STATS = [
    { value: loading ? '—' : String(queue.waiting.length), label: 'Waiting Now', icon: Users, tone: 'blue' },
    { value: kpis ? String(kpis.completed_today ?? 0) : '—', label: 'Completed Today', icon: CheckCircle2, tone: 'green' },
    { value: String(appts.length), label: "Today's Appointments", icon: CalendarDays, tone: 'purple' },
    { value: kpis ? `${kpis.doctors_active ?? 0}/${kpis.doctors ?? 0}` : '—', label: 'Doctors Active', icon: Stethoscope, tone: 'orange' },
    { value: kpis ? String(kpis.total_patients ?? 0) : '—', label: 'Total Patients', icon: UserPlus, tone: 'teal' },
  ]

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Dashboard" subtitle="Welcome back — here's what's happening at your clinic today.">
        <ToolButton icon={CalendarDays}>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATS.map((s) => <StatCard key={s.label} value={s.value} label={s.label} icon={s.icon} tone={s.tone} />)}
      </div>

      <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr_1.3fr]">
        {/* Queue snapshot */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Live Queue</h3>
            <Link to="/clinic-dashboard/op-queue" className="flex items-center gap-1 text-[12px] font-semibold text-brand-blue">Open <ChevronRight className="h-3.5 w-3.5" /></Link>
          </div>
          {queue.current ? (
            <div className="mt-3 flex items-center gap-2">
              <Radio className="h-6 w-6 text-green-500" />
              <span className="text-[28px] font-extrabold leading-none text-green-600">{queue.current.display_code}</span>
              <span className="ml-2 text-[13px] text-slate-500">{queue.current.patient_name || queue.current.doctorName}</span>
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-slate-400">No token in progress.</p>
          )}
          <p className="mt-3 text-[12px] font-semibold text-slate-400">Up next</p>
          {queue.waiting.length === 0 ? (
            <p className="mt-1 text-[13px] text-slate-400">{loading ? 'Loading…' : 'Queue is empty.'}</p>
          ) : (
            <ul className="mt-1 space-y-1.5">
              {queue.waiting.slice(0, 4).map((r) => (
                <li key={r.token_id} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="font-semibold text-brand-navy">{r.display_code}</span>
                  <span className="flex-1 truncate text-slate-500">{r.patient_name || '—'}</span>
                  <span className="text-[11px] text-slate-400">#{r.queue_position}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Quick actions */}
        <Card className="flex flex-col">
          <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Quick Actions</h3>
          <div className="flex flex-1 flex-col gap-2">
            {QUICK.map(({ label, to, icon: Icon, tone }) => (
              <Link key={label} to={to} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 transition-colors hover:border-brand-blue hover:bg-brand-blueLight/40">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${QTONE[tone]}`}><Icon className="h-4 w-4" /></span>
                <span className="flex-1 text-[13px] font-semibold text-brand-navy">{label}</span>
                <ArrowRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </Card>

        {/* Week chart */}
        <Card className="flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Visits This Week</h3>
            <span className="text-[12px] font-semibold text-slate-400">Last 7 days</span>
          </div>
          <div className="min-h-0 flex-1"><MiniBars data={VISITS_WEEK} /></div>
        </Card>
      </div>

      {/* Recent appointments */}
      <Card>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-brand-navy">Today's Appointments</h3>
          <Link to="/clinic-dashboard/appointments" className="text-[12px] font-semibold text-brand-blue hover:underline">View all</Link>
        </div>
        {appts.length === 0 ? (
          <p className="py-3 text-[13px] text-slate-400">{loading ? 'Loading…' : 'No appointments today.'}</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-400">
                <th className="pb-2 pr-4">Appt ID</th><th className="pb-2 pr-4">Patient</th><th className="pb-2 pr-4">Time</th><th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {appts.slice(0, 5).map((a) => (
                <tr key={a.appointment_id} className="border-t border-slate-50">
                  <td className="whitespace-nowrap py-2 pr-4 font-semibold text-brand-navy">#{a.appointment_id}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-600">{a.patient_name || '—'}</td>
                  <td className="whitespace-nowrap py-2 pr-4 text-slate-500">{a.slot_time ? prettyTime(a.slot_time) : '—'}</td>
                  <td className="py-2"><StatusBadge status={statusLabel(a.status)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </Card>
    </div>
  )
}

export default Dashboard
