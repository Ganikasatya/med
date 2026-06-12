import { useState } from 'react'
import { UserPlus, Ticket } from 'lucide-react'
import { Card, StatusBadge, PageHeading } from '../../components/clinic/ui.jsx'
import { RECENT_WALKINS } from '../../data/doctorPagesData.js'
import { GENDERS, VISIT_REASONS } from '../../data/clinicDashboardData.js'

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[12.5px] font-semibold text-slate-600">{label}<span className="text-red-500">*</span></label>
      {children}
    </div>
  )
}

function WalkIn() {
  const [form, setForm] = useState({ name: '', mobile: '', age: '', gender: '', reason: '' })
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Walk-in Entry" subtitle="Register a walk-in patient and issue a queue token." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[380px_1fr]">
        {/* Form */}
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
            <UserPlus className="h-5 w-5 text-brand-blue" /> New Walk-in
          </h3>
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
            <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark">
              <Ticket className="h-4 w-4" /> Generate Token
            </button>
          </div>
        </Card>

        {/* Recent walk-ins */}
        <Card>
          <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Recent Walk-ins</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-400">
                <th className="pb-3 pr-4">Token</th><th className="pb-3 pr-4">Patient</th><th className="pb-3 pr-4">Mobile</th>
                <th className="pb-3 pr-4">Reason</th><th className="pb-3 pr-4">Time</th><th className="pb-3">Status</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {RECENT_WALKINS.map((w) => (
                <tr key={w.token} className="border-t border-slate-50">
                  <td className="py-3 pr-4 font-bold text-brand-navy">{w.token}</td>
                  <td className="py-3 pr-4 font-medium text-brand-navy">{w.name}</td>
                  <td className="py-3 pr-4 text-slate-500">{w.mobile}</td>
                  <td className="py-3 pr-4 text-slate-500">{w.reason}</td>
                  <td className="py-3 pr-4 tabular-nums text-slate-500">{w.time}</td>
                  <td className="py-3"><StatusBadge status={w.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

export default WalkIn
