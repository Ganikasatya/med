import { useState } from 'react'
import { Search, CalendarDays, Plus } from 'lucide-react'
import { Card, StatusBadge, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { ALL_APPTS } from '../../data/doctorPagesData.js'

const FILTERS = ['All', 'Completed', 'In Consultation', 'Waiting', 'Cancelled', 'No Show']

function AllAppointments() {
  const [filter, setFilter] = useState('All')
  const [q, setQ] = useState('')
  const rows = ALL_APPTS.filter(
    (a) => (filter === 'All' || a.status === filter) && a.patient.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="All Appointments" subtitle="Search and review every appointment across dates.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient…"
            className="w-44 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
        </div>
        <ToolButton icon={Plus} tone="primary">New</ToolButton>
      </PageHeading>

      <Card>
        <div className="mb-3 flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
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
              <th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Time</th><th className="pb-3 pr-4">Patient</th>
              <th className="pb-3 pr-4">Doctor</th><th className="pb-3 pr-4">Type</th><th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((a, i) => (
              <tr key={i} className="border-t border-slate-50">
                <td className="py-3 pr-4 font-semibold text-slate-500">{a.date}</td>
                <td className="py-3 pr-4 tabular-nums text-slate-500">{a.time}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={a.patient} className="h-8 w-8 text-xs" />
                    <span className="font-medium text-brand-navy">{a.patient}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-500">{a.doctor}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${a.type === 'Walk-in' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-brand-blue'}`}>{a.type}</span>
                </td>
                <td className="py-3"><StatusBadge status={a.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No appointments found.</p>}
      </Card>
    </div>
  )
}

export default AllAppointments
