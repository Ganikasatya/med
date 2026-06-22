import { useMemo, useState } from 'react'
import { Search, UserPlus, Users, UserCheck } from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading, Avatar } from '../../components/clinic/ui.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { ageSex } from '../../lib/format.js'

function Patients() {
  const { patientsById, loading } = useDoctorCtx()
  const [q, setQ] = useState('')

  const all = useMemo(() => Object.values(patientsById), [patientsById])
  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return all.filter((p) => !term || `${p.name} ${p.phone}`.toLowerCase().includes(term))
  }, [all, q])

  const registered = all.filter((p) => p.is_registered).length

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Patient List" subtitle="All patients registered at your clinic.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search patient…"
            className="w-44 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
        </div>
      </PageHeading>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard value={all.length} label="Total Patients" icon={Users} tone="blue" />
        <StatCard value={registered} label="Registered" icon={UserCheck} tone="green" />
        <StatCard value={all.length - registered} label="Walk-in" icon={UserPlus} tone="purple" />
      </div>

      <Card>
        <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Patient</th><th className="pb-3 pr-4">Age / Gender</th><th className="pb-3 pr-4">Mobile</th>
              <th className="pb-3 pr-4">City</th><th className="pb-3 pr-4">Source</th><th className="pb-3">Tag</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((p) => (
              <tr key={p.patient_id} className="border-t border-slate-50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={p.name} className="h-9 w-9 text-xs" />
                    <span className="font-medium text-brand-navy">{p.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-500">{ageSex(p)}</td>
                <td className="py-3 pr-4 text-slate-500">{p.phone}</td>
                <td className="py-3 pr-4 text-slate-500">{p.city || '—'}</td>
                <td className="py-3 pr-4 text-slate-500 capitalize">{p.registration_source}</td>
                <td className="py-3"><StatusBadge status={p.is_registered ? 'Registered' : 'Walk-in'} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No patients found.</p>
        ) : null}
      </Card>
    </div>
  )
}

export default Patients
