import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Card, StatusBadge, PageHeading, Avatar } from '../../components/clinic/ui.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { appointmentsApi } from '../../api'
import { prettyDate, prettyTime, statusLabel } from '../../lib/format.js'

const FILTERS = ['All', 'Scheduled', 'Completed', 'Cancelled', 'No Show']
const PRACTICE_FILTERS = ['All practices', 'Clinic', 'Personal']

// A booking is "personal" when its practice is not hospital-managed (the doctor's
// own clinic / home practice). The clinic console never sees these.
const isPersonal = (a) => a.managed_by_hospital === false
const typeLabel = (t) =>
  t === 'walkin' ? 'Walk-in' : t === 'emergency' ? 'Emergency' : 'Regular'

function AllAppointments() {
  const { doctorId, resolvePatient, loading: ctxLoading } = useDoctorCtx()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [practice, setPractice] = useState('All practices')
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!doctorId) return
    let active = true
    setLoading(true)
    appointmentsApi
      .list({ doctor_id: doctorId, size: 200 })
      .then((list) => active && setAppts(list || []))
      .catch(() => active && setAppts([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [doctorId])

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return appts.filter((a) => {
      const p = resolvePatient(a.patient_id)
      const matchFilter = filter === 'All' || statusLabel(a.status) === filter
      const matchPractice =
        practice === 'All practices' ||
        (practice === 'Personal' ? isPersonal(a) : !isPersonal(a))
      const matchSearch = !term || (p?.name || '').toLowerCase().includes(term)
      return matchFilter && matchPractice && matchSearch
    })
  }, [appts, filter, practice, q, resolvePatient])

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="All Appointments" subtitle="Search and review every appointment across dates.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient…"
            className="w-44 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
        </div>
      </PageHeading>

      <Card>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {FILTERS.map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${filter === f ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
            {PRACTICE_FILTERS.map((f) => (
              <button key={f} onClick={() => setPractice(f)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${practice === f ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">Patient</th>
              <th className="pb-3 pr-4">Practice</th><th className="pb-3 pr-4">Type</th><th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((a) => {
              const p = resolvePatient(a.patient_id)
              const name = p?.name || `Patient #${a.patient_id}`
              return (
                <tr key={a.appointment_id} className="border-t border-slate-50">
                  <td className="py-3 pr-4 font-semibold text-slate-500">{prettyDate(a.appointment_date)}</td>
                  <td className="py-3 pr-4 tabular-nums text-slate-500">{a.slot_time ? prettyTime(a.slot_time) : '—'}</td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={name} className="h-8 w-8 text-xs" />
                      <span className="font-medium text-brand-navy">{name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${isPersonal(a) ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-brand-blue'}`}>
                      {isPersonal(a) ? 'Personal' : 'Clinic'}
                    </span>
                    {a.practice_name && (
                      <span className="ml-1.5 text-[12px] text-slate-400">{a.practice_name}</span>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${a.appointment_type === 'walkin' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'}`}>
                      {typeLabel(a.appointment_type)}
                    </span>
                  </td>
                  <td className="py-3"><StatusBadge status={statusLabel(a.status)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {loading || ctxLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No appointments found.</p>
        ) : null}
      </Card>
    </div>
  )
}

export default AllAppointments
