import { useState } from 'react'
import { CalendarDays, Plus, Search, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { Card, StatusBadge, StatCard, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { APPT_STATS, APPOINTMENTS } from '../../data/clinicPagesData.js'

const STAT_ICONS = [CalendarDays, CheckCircle2, Clock, XCircle]
const FILTERS = ['All', 'Confirmed', 'Pending', 'Completed', 'Cancelled']

function Appointments() {
  const [filter, setFilter] = useState('All')
  const [q, setQ] = useState('')
  const rows = APPOINTMENTS.filter(
    (a) => (filter === 'All' || a.status === filter) && a.patient.toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Appointments" subtitle="Manage and track all clinic appointments.">
        <ToolButton icon={CalendarDays}>23 May 2025</ToolButton>
        <ToolButton icon={Plus} tone="primary">Book Appointment</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {APPT_STATS.map((s, i) => <StatCard key={s.label} {...s} icon={STAT_ICONS[i]} />)}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                  filter === f ? 'bg-white text-brand-blue shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search patient…"
              className="w-44 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <table className="w-full text-left">
            <thead className="sticky top-0 bg-white">
              <tr className="whitespace-nowrap text-[12px] font-semibold text-slate-400">
                <th className="pb-2 pr-4">Appt ID</th>
                <th className="pb-2 pr-4">Patient</th>
                <th className="pb-2 pr-4">Doctor</th>
                <th className="pb-2 pr-4">Specialty</th>
                <th className="pb-2 pr-4">Time</th>
                <th className="pb-2 pr-4">Type</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {rows.map((a) => (
                <tr key={a.id} className="border-t border-slate-50 hover:bg-slate-50/60">
                  <td className="whitespace-nowrap py-2.5 pr-4 font-semibold text-brand-navy">{a.id}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={a.patient} className="h-8 w-8 text-[11px]" />
                      <div className="leading-tight">
                        <p className="font-semibold text-brand-navy">{a.patient}</p>
                        <p className="text-[11px] text-slate-400">{a.age}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">{a.doctor}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">{a.specialty}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">{a.time}</td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">{a.type}</td>
                  <td className="py-2.5"><StatusBadge status={a.status} /></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-slate-400">No appointments found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default Appointments
