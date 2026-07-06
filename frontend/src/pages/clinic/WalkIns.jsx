import { useEffect, useMemo, useState } from 'react'
import { UserPlus, Clock, CheckCircle2, RefreshCw, Ticket, AlertTriangle } from 'lucide-react'
import { Card, StatCard, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { VISIT_REASONS } from '../../data/clinicDashboardData.js'
import { doctorsApi, appointmentsApi, tokensApi } from '../../api'

const STAT_ICONS = [UserPlus, Clock, CheckCircle2]
const PRIORITIES = [
  { value: 'normal', label: 'Normal' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'emergency', label: 'Emergency' },
]

function Field({ label, required, children }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-slate-600">
        {label}{required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}

function WalkIns() {
  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({ doctor_id: '', name: '', mobile: '', reason: '', priority: 'normal' })
  const [queue, setQueue] = useState(null)
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [banner, setBanner] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  useEffect(() => {
    doctorsApi.list().then((d) => {
      setDoctors(d)
      if (d.length) setForm((f) => ({ ...f, doctor_id: String(d[0].doctor_id) }))
    })
  }, [])

  const loadQueue = async (id = form.doctor_id) => {
    if (!id) return
    try {
      setQueue(await tokensApi.queue(id))
    } catch {
      setQueue(null)
    }
  }
  useEffect(() => {
    loadQueue(form.doctor_id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.doctor_id])

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (!form.doctor_id) err.doctor_id = 'Select a doctor'
    if (!form.name.trim()) err.name = 'Required'
    if (!/^\d{10}$/.test(form.mobile)) err.mobile = 'Enter a valid 10-digit number'
    setErrors(err)
    if (Object.keys(err).length) return

    setBusy(true)
    setBanner(null)
    try {
      const appt = await appointmentsApi.walkIn({
        doctor_id: Number(form.doctor_id),
        name: form.name.trim(),
        phone: form.mobile,
        notes: form.reason,
      })
      const { token, estimate } = await tokensApi.generate(appt.appointment_id, form.priority)
      setBanner({ type: 'success', msg: `Token ${token.display_code} issued — est. wait ~${estimate?.wait_min ?? '—'} min` })
      setForm((f) => ({ ...f, name: '', mobile: '', reason: '', priority: 'normal' }))
      await loadQueue()
    } catch (e2) {
      setBanner({ type: 'error', msg: e2.message || 'Could not register walk-in' })
    }
    setBusy(false)
  }

  const waiting = queue?.waiting || []
  const current = queue?.current
  const stats = useMemo(() => {
    const walkins = waiting.filter((t) => t.is_walkin).length + (current?.is_walkin ? 1 : 0)
    return [
      { value: walkins, label: 'Walk-ins in queue', tone: 'blue' },
      { value: waiting.length, label: 'Total waiting', tone: 'orange' },
      { value: current ? 1 : 0, label: 'In consultation', tone: 'green' },
    ]
  }, [waiting, current])

  const doc = doctors.find((d) => String(d.doctor_id) === String(form.doctor_id))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Walk-in Patients" subtitle="Register walk-ins and manage the live walk-in queue.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          {doc && <Avatar name={doc.name} className="h-6 w-6 text-[9px]" />}
          <select value={form.doctor_id} onChange={set('doctor_id')} className="bg-transparent py-2 text-sm font-semibold text-brand-navy outline-none">
            {doctors.map((d) => (
              <option key={d.doctor_id} value={d.doctor_id}>{d.name}</option>
            ))}
          </select>
        </div>
        <ToolButton icon={RefreshCw} onClick={() => loadQueue()}>Refresh</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((s, i) => <StatCard key={s.label} {...s} icon={STAT_ICONS[i]} />)}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_2fr]">
        {/* Entry form */}
        <Card>
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue"><UserPlus className="h-5 w-5" /></span>
            <h3 className="text-[15px] font-bold text-brand-navy">New Walk-in Entry</h3>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Patient Name" required>
              <input value={form.name} onChange={set('name')} placeholder="Enter full name" className="field-input" />
              {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name}</p>}
            </Field>
            <Field label="Mobile Number" required>
              <input value={form.mobile} onChange={set('mobile')} placeholder="10-digit mobile" inputMode="numeric" maxLength={10} className="field-input" />
              {errors.mobile && <p className="mt-1 text-xs text-red-500">{errors.mobile}</p>}
            </Field>
            <Field label="Reason for Visit">
              <select value={form.reason} onChange={set('reason')} className="field-input">
                <option value="">Select reason</option>{VISIT_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => (
                  <button
                    type="button"
                    key={p.value}
                    onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                    className={`rounded-xl border py-2 text-[12.5px] font-semibold transition-all ${form.priority === p.value ? 'border-brand-blue bg-brand-blueLight text-brand-blue' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </Field>

            {banner && (
              <div className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${banner.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                {banner.type === 'success' ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                {banner.msg}
              </div>
            )}

            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">
              <Ticket className="h-4 w-4" /> {busy ? 'Issuing token…' : 'Generate Token'}
            </button>
          </form>
        </Card>

        {/* Live queue */}
        <Card className="flex min-h-0 flex-col">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Today's Queue — {doc?.name || '—'}</h3>
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700">{waiting.length} in queue</span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            <table className="w-full text-left">
              <thead className="sticky top-0 bg-white">
                <tr className="whitespace-nowrap text-[12px] font-semibold text-slate-400">
                  <th className="pb-2 pr-4">Token</th>
                  <th className="pb-2 pr-4">Patient</th>
                  <th className="pb-2 pr-4">Pos</th>
                  <th className="pb-2 pr-4">Priority</th>
                  <th className="pb-2">Type</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                {current && (
                  <tr className="border-t border-slate-50 bg-green-50/40">
                    <td className="whitespace-nowrap py-2.5 pr-4 font-semibold text-brand-navy">{current.display_code}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">{current.patient_name || 'Patient'}</td>
                    <td className="py-2.5 pr-4 text-slate-500">—</td>
                    <td className="py-2.5 pr-4 capitalize text-slate-500">{current.priority}</td>
                    <td className="py-2.5"><span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">In consultation</span></td>
                  </tr>
                )}
                {waiting.map((w) => (
                  <tr key={w.token_id} className="border-t border-slate-50 hover:bg-slate-50/60">
                    <td className="whitespace-nowrap py-2.5 pr-4 font-semibold text-brand-navy">{w.display_code}</td>
                    <td className="whitespace-nowrap py-2.5 pr-4 text-slate-600">{w.patient_name || 'Patient'}</td>
                    <td className="py-2.5 pr-4 text-slate-500">{w.queue_position}</td>
                    <td className="py-2.5 pr-4 capitalize text-slate-500">{w.priority}</td>
                    <td className="py-2.5">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${w.is_walkin ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                        {w.is_walkin ? 'Walk-in' : 'Booked'}
                      </span>
                    </td>
                  </tr>
                ))}
                {!current && waiting.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-sm text-slate-400">The queue is empty.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default WalkIns
