import { useState } from 'react'
import { Search, UserPlus, Users, UserCheck } from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { PATIENTS } from '../../data/doctorPagesData.js'

function Patients() {
  const [q, setQ] = useState('')
  const rows = PATIENTS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
  const regulars = PATIENTS.filter((p) => p.tag === 'Regular').length

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Patient List" subtitle="All patients who have visited or booked with you.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient…"
            className="w-44 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
        </div>
        <ToolButton icon={UserPlus} tone="primary">Add Patient</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-3 gap-4">
        <StatCard value={PATIENTS.length} label="Total Patients" icon={Users} tone="blue" />
        <StatCard value={regulars} label="Regulars" icon={UserCheck} tone="green" />
        <StatCard value={PATIENTS.length - regulars} label="New" icon={UserPlus} tone="purple" />
      </div>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Patient</th><th className="pb-3 pr-4">Age / Gender</th><th className="pb-3 pr-4">Mobile</th>
              <th className="pb-3 pr-4">Last Visit</th><th className="pb-3 pr-4">Visits</th><th className="pb-3">Tag</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((p) => (
              <tr key={p.mobile} className="border-t border-slate-50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.name} className="h-9 w-9 text-xs" />
                    <span className="font-medium text-brand-navy">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-500">{p.age}</td>
                <td className="py-3 pr-4 text-slate-500">{p.mobile}</td>
                <td className="py-3 pr-4 text-slate-500">{p.lastVisit}</td>
                <td className="py-3 pr-4 font-bold text-brand-navy">{p.visits}</td>
                <td className="py-3"><StatusBadge status={p.tag} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No patients found.</p>}
      </Card>
    </div>
  )
}

export default Patients
