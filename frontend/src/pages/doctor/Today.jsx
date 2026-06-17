import { useEffect, useState } from 'react'
import { CalendarDays, CheckCircle2, Clock, Hourglass, IndianRupee } from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading } from '../../components/clinic/ui.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { appointmentsApi } from '../../api'
import { prettyTime, statusLabel, prettyDate, todayISO, ageSex } from '../../lib/format.js'

const FILTERS = ['All', 'Scheduled', 'Waiting', 'In Progress', 'Completed']
const WAITING = ['checked_in']
const IN_PROGRESS = ['in_progress']

function Today() {
  const { doctorId, resolvePatient, loading: ctxLoading } = useDoctorCtx()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (!doctorId) return
    let active = true
    setLoading(true)
    appointmentsApi
      .today(doctorId)
      .then((list) => active && setAppts(list || []))
      .catch(() => active && setAppts([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [doctorId])

  const matches = (a, f) => {
    if (f === 'All') return true
    if (f === 'Waiting') return WAITING.includes(a.status)
    if (f === 'In Progress') return IN_PROGRESS.includes(a.status)
    return statusLabel(a.status) === f
  }
  const rows = appts.filter((a) => matches(a, filter))

  const stats = [
    { value: appts.length, label: 'Total Today', icon: CalendarDays, tone: 'blue' },
    { value: appts.filter((a) => a.status === 'completed').length, label: 'Completed', icon: CheckCircle2, tone: 'green' },
    { value: appts.filter((a) => WAITING.includes(a.status)).length, label: 'Waiting', icon: Hourglass, tone: 'orange' },
    { value: appts.filter((a) => a.status === 'scheduled').length, label: 'Upcoming', icon: Clock, tone: 'purple' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Today's Appointments" subtitle="Everything scheduled for you today, in order.">
        <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-navy">
          <CalendarDays className="h-4 w-4" /> {prettyDate(todayISO())}
        </span>
      </PageHeading>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <Card>
        <div className="mb-3 flex gap-1 rounded-xl bg-slate-100 p-1">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${filter === f ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {f}
            </button>
          ))}
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">Patient</th><th className="pb-3 pr-4">Age</th>
              <th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Fee</th><th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((a) => {
              const p = resolvePatient(a.patient_id)
              return (
                <tr key={a.appointment_id} className="border-t border-slate-50">
                  <td className="py-3 pr-4 font-semibold tabular-nums text-slate-500">{a.slot_time ? prettyTime(a.slot_time) : '—'}</td>
                  <td className="py-3 pr-4 font-medium text-brand-navy">{p?.name || `Patient #${a.patient_id}`}</td>
                  <td className="py-3 pr-4 text-slate-500">{ageSex(p)}</td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${a.appointment_type === 'walkin' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-brand-blue'}`}>
                      {a.appointment_type === 'walkin' ? 'Walk-in' : a.appointment_type === 'emergency' ? 'Emergency' : 'Online'}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-brand-navy"><span className="inline-flex items-center"><IndianRupee className="h-3.5 w-3.5" />{Number(a.consultation_fee)}</span></td>
                  <td className="py-3"><StatusBadge status={statusLabel(a.status)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {loading || ctxLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No appointments match this filter.</p>
        ) : null}
      </Card>
    </div>
  )
}

export default Today
