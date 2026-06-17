import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UserPlus, Phone, CheckCircle2, Ticket, Clock, Stethoscope, AlertTriangle } from 'lucide-react'
import { Card, PageHeading, Avatar } from '../../components/clinic/ui.jsx'
import { TextInput } from '../../components/common/FormControls.jsx'
import { doctorsApi, appointmentsApi, tokensApi } from '../../api'

const PRIORITIES = [
  { value: 'normal', label: 'Normal', cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  { value: 'urgent', label: 'Urgent', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'emergency', label: 'Emergency', cls: 'bg-red-50 text-red-600 border-red-200' },
]

export default function AssistantWalkIn() {
  const [doctors, setDoctors] = useState([])
  const [form, setForm] = useState({ doctor_id: '', name: '', phone: '', priority: 'normal' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [issued, setIssued] = useState([])
  const [banner, setBanner] = useState(null)

  useEffect(() => {
    doctorsApi.list().then((d) => {
      setDoctors(d)
      if (d.length) setForm((f) => ({ ...f, doctor_id: String(d[0].doctor_id) }))
    })
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const err = {}
    if (!form.doctor_id) err.doctor_id = 'Select a doctor'
    if (!form.name.trim()) err.name = 'Required'
    if (!/^\d{10}$/.test(form.phone)) err.phone = 'Enter a valid 10-digit number'
    setErrors(err)
    if (Object.keys(err).length) return

    setBusy(true)
    setBanner(null)
    try {
      const appt = await appointmentsApi.walkIn({ doctor_id: Number(form.doctor_id), name: form.name.trim(), phone: form.phone })
      const { token, estimate } = await tokensApi.generate(appt.appointment_id, form.priority)
      const doc = doctors.find((d) => String(d.doctor_id) === String(form.doctor_id))
      setIssued((list) => [
        { id: token.token_id, code: token.display_code, name: form.name.trim(), doctor: doc?.name, wait: estimate?.wait_min },
        ...list,
      ])
      setBanner({ type: 'success', msg: `Token ${token.display_code} issued — est. wait ~${estimate?.wait_min ?? '—'} min` })
      setForm((f) => ({ ...f, name: '', phone: '', priority: 'normal' }))
    } catch (e2) {
      setBanner({ type: 'error', msg: e2.message || 'Could not register walk-in' })
    }
    setBusy(false)
  }

  const doc = doctors.find((d) => String(d.doctor_id) === String(form.doctor_id))

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Register Walk-in" subtitle="Add a walk-in patient and issue a queue token instantly." />

      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        {/* Form */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card>
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-600">Doctor</label>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                  {doc && <Avatar name={doc.name} className="h-7 w-7 text-[9px]" />}
                  <select value={form.doctor_id} onChange={set('doctor_id')} className="w-full bg-transparent py-2.5 text-sm font-medium text-brand-navy outline-none">
                    {doctors.map((d) => (
                      <option key={d.doctor_id} value={d.doctor_id}>{d.name} — {d.specialization}</option>
                    ))}
                  </select>
                </div>
                {errors.doctor_id && <p className="mt-1 text-xs text-red-500">{errors.doctor_id}</p>}
              </div>

              <TextInput icon={UserPlus} placeholder="Patient Name" value={form.name} onChange={set('name')} error={errors.name} />
              <TextInput icon={Phone} prefix="+91" placeholder="Mobile Number" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} error={errors.phone} />

              <div>
                <label className="mb-1.5 block text-[13px] font-semibold text-slate-600">Priority</label>
                <div className="grid grid-cols-3 gap-2">
                  {PRIORITIES.map((p) => (
                    <button
                      type="button"
                      key={p.value}
                      onClick={() => setForm((f) => ({ ...f, priority: p.value }))}
                      className={`rounded-xl border py-2 text-[12.5px] font-semibold transition-all ${form.priority === p.value ? `${p.cls} ring-2 ring-offset-1 ring-brand-blue/30` : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <AnimatePresence>
                {banner && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm ${banner.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                  >
                    {banner.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    {banner.msg}
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                whileTap={{ scale: 0.98 }}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60"
              >
                <Ticket className="h-4 w-4" /> {busy ? 'Issuing token…' : 'Register & Issue Token'}
              </motion.button>
            </form>
          </Card>
        </motion.div>

        {/* Issued tokens */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
          <Card className="!p-0">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
              <h3 className="text-[15px] font-bold text-brand-navy">Tokens Issued</h3>
              <span className="text-[11px] font-semibold text-slate-400">this session</span>
            </div>
            {issued.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-14 text-slate-400">
                <Stethoscope className="h-8 w-8 text-slate-200" />
                <p className="text-sm">No walk-ins issued yet.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                <AnimatePresence initial={false}>
                  {issued.map((t) => (
                    <motion.li
                      key={t.id}
                      initial={{ opacity: 0, x: -24, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-100 text-green-600"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </motion.span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-[14px] font-bold text-brand-navy">{t.code} · {t.name}</p>
                        <p className="flex items-center gap-1 text-[11px] text-slate-400"><Clock className="h-3 w-3" /> {t.doctor} · est. ~{t.wait ?? '—'} min</p>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
