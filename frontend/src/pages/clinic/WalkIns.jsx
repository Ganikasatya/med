import { useState } from 'react'
import { UserPlus, Clock, CheckCircle2, RefreshCw, Ticket } from 'lucide-react'
import { Card, StatusBadge, StatCard, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { WALKIN_STATS, WALKINS } from '../../data/clinicPagesData.js'
import { GENDERS, VISIT_REASONS } from '../../data/clinicDashboardData.js'

const STAT_ICONS = [UserPlus, Clock, CheckCircle2]

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-slate-600">{label}<span className="text-red-500">*</span></label>
      {children}
    </div>
  )
}

function WalkIns() {
  const [form, setForm] = useState({ name: '', mobile: '', age: '', gender: '', reason: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Walk-in Patients" subtitle="Register walk-ins and manage the live walk-in queue.">
        <ToolButton icon={RefreshCw}>Refresh</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {WALKIN_STATS.map((s, i) => <StatCard key={s.label} {...s} icon={STAT_ICONS[i]} />)}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_2fr]">
        {/* Entry form */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue"><UserPlus className="h-5 w-5" /></span>
            <h3 className="text-[15px] font-bold text-brand-navy">New Walk-in Entry</h3>
          </div>
          <div className="space-y-3">
            <Field label="Patient Name"><input value={form.name} onChange={set('name')} placeholder="Enter full name" className="field-input" /></Field>
            <Field label="Mobile Number"><input value={form.mobile} onChange={set('mobile')} placeholder="Enter mobile number" className="field-input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age"><input value={form.age} onChange={set('age')} placeholder="Age" className="field-input" /></Field>
              <Field label="Gender">
                <select value={form.gender} onChange={set('gender')} className="field-input">
                  <option value="">Select</option>{GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Reason for Visit">
              <select value={form.reason} onChange={set('reason')} className="field-input">
                <option value="">Select reason</option>{VISIT_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white hover:bg-brand-blueDark">
              <Ticket className="h-4 w-4" /> Generate Token
            </button>
          </div>
        </Card>

        {/* Live queue */}
        <Card className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Today's Walk-in Queue</h3>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">{WALKINS.filter((w) => w.status === 'In Queue').length} in queue</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white">
                <tr className="whitespace-nowrap text-[12px] font-semibold text-slate-400">
                  <th className="pb-2 pr-4">Token</th>
                  <th className="pb-2 pr-4">Patient</th>
                  <th className="pb-2 pr-4">Age / Gender</th>
                  <th className="pb-2 pr-4">Time</th>
                  <th className="pb-2 pr-4">Reason</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {WALKINS.map((w) => (
                  <tr key={w.token} className="border-t border-slate-50 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap py-2.5 pr-4 font-semibold text-brand-navy">{w.token}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">{w.name}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">{w.age}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">{w.time}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-500">{w.reason}</td>
                    <td className="py-2.5"><StatusBadge status={w.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default WalkIns
