import { useState } from 'react'
import { CalendarDays, CheckCircle2, Clock, Hourglass, Plus } from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { TODAY_APPTS } from '../../data/doctorPagesData.js'

const FILTERS = ['All', 'Confirmed', 'Waiting', 'In Consultation', 'Completed']

function Today() {
  const [filter, setFilter] = useState('All')
  const rows = TODAY_APPTS.filter((a) => filter === 'All' || a.status === filter)
  const stats = [
    { value: TODAY_APPTS.length, label: 'Total Today', icon: CalendarDays, tone: 'blue' },
    { value: TODAY_APPTS.filter((a) => a.status === 'Completed').length, label: 'Completed', icon: CheckCircle2, tone: 'green' },
    { value: TODAY_APPTS.filter((a) => a.status === 'Waiting').length, label: 'Waiting', icon: Hourglass, tone: 'orange' },
    { value: TODAY_APPTS.filter((a) => a.status === 'Confirmed').length, label: 'Upcoming', icon: Clock, tone: 'purple' },
  ]

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Today's Appointments" subtitle="Everything scheduled for you today, in order.">
        <ToolButton icon={CalendarDays}>12 Jun 2025</ToolButton>
        <ToolButton icon={Plus} tone="primary">Book Appointment</ToolButton>
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
              <th className="pb-3 pr-4">Type</th><th className="pb-3 pr-4">Token</th><th className="pb-3 pr-4">Status</th><th className="pb-3">Payment</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((a) => (
              <tr key={a.token} className="border-t border-slate-50">
                <td className="py-3 pr-4 font-semibold tabular-nums text-slate-500">{a.time}</td>
                <td className="py-3 pr-4 font-medium text-brand-navy">{a.patient}</td>
                <td className="py-3 pr-4 text-slate-500">{a.age}</td>
                <td className="py-3 pr-4">
                  <span className={`rounded-md px-2 py-0.5 text-[11.5px] font-semibold ${a.type === 'Walk-in' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-brand-blue'}`}>{a.type}</span>
                </td>
                <td className="py-3 pr-4 font-bold text-brand-navy">{a.token}</td>
                <td className="py-3 pr-4"><StatusBadge status={a.status} /></td>
                <td className="py-3"><StatusBadge status={a.payment === 'Pending' ? 'Pending' : a.payment} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No appointments match this filter.</p>}
      </Card>
    </div>
  )
}

export default Today
