import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Users, Ticket, Hourglass, CheckCircle2, Stethoscope, RefreshCw, ChevronRight,
  Radio, UserPlus, CalendarDays, ListChecks, Search, Clock,
} from 'lucide-react'
import { Card, PageHeading, ToolButton, StatCard, Avatar } from '../../components/clinic/ui.jsx'
import AnimatedNumber from '../../components/common/AnimatedNumber.jsx'
import { reportsApi, doctorsApi, tokensApi } from '../../api'

const container = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } } }

const QUICK_ACTIONS = [
  { label: 'New Walk-in', to: '/assistant-dashboard/walk-in', icon: UserPlus, tone: 'bg-blue-50 text-brand-blue' },
  { label: 'Live Queue', to: '/assistant-dashboard/queue', icon: ListChecks, tone: 'bg-green-50 text-green-600' },
  { label: 'Appointments', to: '/assistant-dashboard/appointments', icon: CalendarDays, tone: 'bg-purple-50 text-purple-600' },
  { label: 'Find Patient', to: '/assistant-dashboard/patient-search', icon: Search, tone: 'bg-orange-50 text-orange-500' },
]

export default function AssistantDashboard() {
  const [kpis, setKpis] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const [dash, docs] = await Promise.all([reportsApi.dashboard(), doctorsApi.list()])
      setKpis(dash.kpis)
      const snaps = await Promise.all(
        docs.map(async (d) => {
          try {
            const ld = await tokensApi.liveDisplay(d.doctor_id)
            return { ...d, now: ld.now_serving, waiting: ld.total_waiting, delay: ld.delay_min || 0 }
          } catch {
            return { ...d, now: null, waiting: 0, delay: 0 }
          }
        })
      )
      setRows(snaps)
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
    const id = setInterval(load, 30000) // keep queue + delay status live
    return () => clearInterval(id)
  }, [])

  const STATS = [
    { value: kpis?.total_patients, label: 'Total Patients', icon: Users, tone: 'blue' },
    { value: kpis?.tokens_today, label: 'In Queue Today', icon: Ticket, tone: 'purple' },
    { value: kpis?.waiting_now, label: 'Waiting', icon: Hourglass, tone: 'orange' },
    { value: kpis?.completed_today, label: 'Consulted', icon: CheckCircle2, tone: 'green' },
    { value: kpis?.doctors_active, label: 'Doctors on Duty', icon: Stethoscope, tone: 'teal' },
  ]

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Dashboard" subtitle="Track appointments, manage patients and support live consultations.">
        <ToolButton icon={RefreshCw} onClick={load}>Refresh</ToolButton>
      </PageHeading>

      {err && <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>}

      {/* KPI stats */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATS.map((s) => (
          <motion.div key={s.label} variants={item} whileHover={{ y: -4 }}>
            <StatCard value={<AnimatedNumber value={s.value ?? 0} />} label={s.label} icon={s.icon} tone={s.tone} />
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        {/* Live queue by doctor */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h3 className="text-[15px] font-bold text-brand-navy">Live Queue — by Doctor</h3>
              <Link to="/assistant-dashboard/queue" className="text-[12px] font-semibold text-brand-blue hover:underline">View all</Link>
            </div>
            {loading ? (
              <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">No doctors found.</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {rows.map((d, i) => (
                  <motion.li
                    key={d.doctor_id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.12 + i * 0.05 }}
                    className={`flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/70 ${d.delay > 0 ? 'bg-amber-50/60' : ''}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={d.name || 'Doctor'} className="h-10 w-10 text-[12px]" />
                      <div className="min-w-0 leading-tight">
                        <p className="truncate text-[14px] font-bold text-brand-navy">{d.name}</p>
                        <p className="truncate text-[12px] text-slate-400">{d.specialization}</p>
                        {d.delay > 0 && (
                          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            <Clock className="h-3 w-3" /> Running late +{d.delay} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">Serving</p>
                        {d.now ? (
                          <span className="inline-flex items-center gap-1 text-[13px] font-bold text-green-600">
                            <Radio className="h-3.5 w-3.5" /> {d.now}
                          </span>
                        ) : (
                          <span className="text-[13px] text-slate-300">—</span>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-semibold uppercase text-slate-400">Waiting</p>
                        <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[12px] font-bold text-orange-600">{d.waiting}</span>
                      </div>
                      <Link
                        to={`/assistant-dashboard/queue?doctor=${d.doctor_id}`}
                        className="flex items-center gap-0.5 rounded-lg bg-brand-blueLight px-2.5 py-1.5 text-[12px] font-semibold text-brand-blue hover:bg-blue-100"
                      >
                        Manage <ChevronRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </Card>
        </motion.div>

        {/* Right column */}
        <div className="flex flex-col gap-5">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card>
              <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map((a) => (
                  <motion.div key={a.label} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    <Link to={a.to} className="flex flex-col items-center gap-2 rounded-2xl border border-slate-100 p-4 text-center hover:border-brand-blue/30 hover:shadow-card">
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${a.tone}`}>
                        <a.icon className="h-5 w-5" />
                      </span>
                      <span className="text-[12.5px] font-semibold text-brand-navy">{a.label}</span>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Doctors on Duty</h3>
              {loading ? (
                <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
              ) : (
                <div className="space-y-2.5">
                  {rows.slice(0, 5).map((d) => (
                    <div key={d.doctor_id} className="flex items-center gap-3">
                      <Avatar name={d.name || 'Doctor'} className="h-8 w-8 text-[10px]" />
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-[13px] font-semibold text-brand-navy">{d.name}</p>
                        <p className="truncate text-[11px] text-slate-400">{d.specialization}</p>
                      </div>
                      <span className={`h-2 w-2 rounded-full ${d.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`} />
                    </div>
                  ))}
                  {rows.length === 0 && <p className="py-2 text-center text-sm text-slate-400">No doctors yet.</p>}
                </div>
              )}
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
