import { useEffect, useState } from 'react'
import { RefreshCw, Radio, Clock, SkipForward, BellRing, CheckCircle2, ArrowRightCircle, Info, Users, UserCheck, UserX, Timer, Hash } from 'lucide-react'
import { Card, StatusBadge, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { doctorsApi, tokensApi, appointmentsApi } from '../../api'

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-slate-600">{label}</label>
      {children}
    </div>
  )
}

function StatCardMini({ icon: Icon, value, label, tone }) {
  const tones = {
    blue: 'border-blue-100 bg-blue-50/50 text-brand-blue',
    green: 'border-green-100 bg-green-50/50 text-green-600',
    orange: 'border-orange-100 bg-orange-50/50 text-orange-500',
    purple: 'border-purple-100 bg-purple-50/50 text-purple-600',
    teal: 'border-teal-100 bg-teal-50/50 text-teal-600',
  }
  return (
    <div className={`rounded-2xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2.5">
        <Icon className="h-6 w-6 shrink-0" />
        <div>
          <div className="text-[22px] font-extrabold leading-none text-brand-navy">{value}</div>
          <div className="mt-1 text-[12px] font-medium text-slate-500">{label}</div>
        </div>
      </div>
    </div>
  )
}

function OpQueue() {
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState(null)
  const [queue, setQueue] = useState({ current: null, waiting: [], total_waiting: 0 })
  const [stats, setStats] = useState(null)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [walkIn, setWalkIn] = useState({ name: '', phone: '', priority: 'normal' })

  // Load the clinic's doctors once.
  useEffect(() => {
    let active = true
    ;(async () => {
      setLoadingDocs(true)
      try {
        const docs = await doctorsApi.list()
        if (!active) return
        setDoctors(docs)
        if (docs.length) setDoctorId(docs[0].doctor_id)
      } catch (e) {
        if (active) setErr(e.message)
      } finally {
        if (active) setLoadingDocs(false)
      }
    })()
    return () => { active = false }
  }, [])

  const loadQueue = async (id) => {
    if (!id) return
    setLoadingQueue(true)
    setErr(null)
    try {
      const [q, s] = await Promise.all([tokensApi.queue(id), tokensApi.stats(id)])
      setQueue(q)
      setStats(s)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoadingQueue(false)
    }
  }
  useEffect(() => { loadQueue(doctorId) }, [doctorId])

  const act = async (fn) => {
    setBusy(true)
    setErr(null)
    try {
      await fn()
      await loadQueue(doctorId)
    } catch (e) {
      setErr(e.message || 'Action failed')
    }
    setBusy(false)
  }

  const callNext = () => act(() => tokensApi.next(doctorId))
  const complete = (id) => act(() => tokensApi.complete(id))
  const skip = (id) => act(() => tokensApi.skip(id))
  const recall = (id) => act(() => tokensApi.recall(id))
  const collect = (apptId, method = 'cash') => act(() => appointmentsApi.collectPayment(apptId, method))

  const generateWalkIn = (e) => {
    e.preventDefault()
    if (!/^\d{10}$/.test(walkIn.phone)) { setErr('Walk-in needs a valid 10-digit phone'); return }
    if (!walkIn.name.trim()) { setErr('Walk-in needs a name'); return }
    act(async () => {
      const appt = await appointmentsApi.walkIn({ doctor_id: doctorId, name: walkIn.name.trim(), phone: walkIn.phone })
      await tokensApi.generate(appt.appointment_id, walkIn.priority)
      setWalkIn({ name: '', phone: '', priority: 'normal' })
    })
  }

  const selectedDoctor = doctors.find((d) => d.doctor_id === doctorId)
  const cur = queue.current

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="OP Queue Management" subtitle="Live token queue for today. Pick a doctor to manage their queue.">
        <ToolButton icon={RefreshCw} onClick={() => loadQueue(doctorId)}>Refresh</ToolButton>
      </PageHeading>

      {err && <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>}

      {loadingDocs ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading doctors…</p>
      ) : doctors.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-400">No doctors yet. Add a doctor first.</Card>
      ) : (
        <>
          {/* Doctor selector */}
          <div className="flex flex-wrap gap-2">
            {doctors.map((d) => (
              <button
                key={d.doctor_id}
                onClick={() => setDoctorId(d.doctor_id)}
                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  doctorId === d.doctor_id ? 'border-brand-blue bg-brand-blueLight text-brand-blue' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                {d.name}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            <StatCardMini icon={Hash} value={stats?.total ?? '—'} label="Total Tokens" tone="blue" />
            <StatCardMini icon={UserCheck} value={stats?.served ?? '—'} label="Served" tone="green" />
            <StatCardMini icon={Users} value={stats?.waiting ?? '—'} label="Waiting" tone="orange" />
            <StatCardMini icon={UserX} value={stats?.missed ?? '—'} label="Missed" tone="purple" />
            <StatCardMini icon={Timer} value={stats?.avg_wait_mins != null ? `${stats.avg_wait_mins}m` : '—'} label="Avg Wait" tone="teal" />
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_1.4fr_1fr]">
            {/* Current running token */}
            <Card className="flex flex-col">
              <h3 className="text-[15px] font-bold text-brand-navy">Current Running Token</h3>
              {cur ? (
                <>
                  <div className="mt-5 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Radio className="h-7 w-7 shrink-0 text-green-500" />
                      <span className="text-[34px] font-extrabold leading-none text-green-600">{cur.display_code}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-bold text-brand-navy">{cur.patient_name || 'Patient'}</p>
                      <p className="text-[13px] text-slate-500">{[cur.patient_age && `${cur.patient_age}y`, cur.patient_gender].filter(Boolean).join(' · ') || '—'}</p>
                      <span className="mt-1.5 inline-block rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">{cur.priority}</span>
                    </div>
                  </div>
                  <div className="mt-auto flex gap-2 border-t border-slate-100 pt-4">
                    <button disabled={busy} onClick={() => complete(cur.token_id)} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-green py-2.5 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-60">
                      <CheckCircle2 className="h-4 w-4" /> Complete
                    </button>
                    <button disabled={busy} onClick={() => recall(cur.token_id)} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60">
                      <BellRing className="h-4 w-4" /> Recall
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-sm text-slate-400">
                  <Radio className="mb-2 h-8 w-8 text-slate-300" />
                  No one is being served. Click <span className="font-semibold text-brand-blue">Call Next</span> to start.
                </div>
              )}
              <button disabled={busy || queue.waiting.length === 0} onClick={callNext} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-50">
                <ArrowRightCircle className="h-4 w-4" /> Call Next ({queue.total_waiting} waiting)
              </button>
            </Card>

            {/* Waiting list */}
            <Card className="flex min-h-0 flex-col">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-brand-navy">Waiting Patients</h3>
                <span className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-600">{queue.total_waiting} in queue</span>
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                {loadingQueue ? (
                  <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
                ) : queue.waiting.length === 0 ? (
                  <p className="py-8 text-center text-sm text-slate-400">No patients waiting.</p>
                ) : (
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-[12px] font-semibold text-slate-400">
                        <th className="pb-2 font-semibold">Token</th>
                        <th className="pb-2 font-semibold">Patient</th>
                        <th className="pb-2 font-semibold">Pos.</th>
                        <th className="pb-2 font-semibold">Payment</th>
                        <th className="pb-2 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-[13px]">
                      {queue.waiting.map((t) => (
                        <tr key={t.token_id} className="border-t border-slate-50">
                          <td className="whitespace-nowrap py-2 pr-3 font-semibold text-brand-navy">{t.display_code}</td>
                          <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{t.patient_name || '—'}</td>
                          <td className="py-2 pr-3 text-slate-500">{t.queue_position}</td>
                          <td className="py-2 pr-3">
                            {t.consultation_fee > 0 && !t.consultation_paid ? (
                              <button disabled={busy} onClick={() => collect(t.appointment_id)} className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-600 disabled:opacity-60">
                                Collect ₹{t.consultation_fee}
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700"><CheckCircle2 className="h-3 w-3" /> Paid</span>
                            )}
                          </td>
                          <td className="py-2 text-right">
                            <button disabled={busy} onClick={() => skip(t.token_id)} title="Skip" className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60">
                              <SkipForward className="h-3.5 w-3.5" /> Skip
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </Card>

            {/* Walk-in entry */}
            <Card>
              <h3 className="mb-2.5 text-[15px] font-bold text-brand-navy">Walk-in Patient Entry</h3>
              <p className="mb-3 text-[12px] text-slate-400">Adds a walk-in to {selectedDoctor?.name || 'this doctor'} and issues a token instantly.</p>
              <form onSubmit={generateWalkIn} className="space-y-2.5">
                <Field label="Patient Name">
                  <input value={walkIn.name} onChange={(e) => setWalkIn((w) => ({ ...w, name: e.target.value }))} placeholder="Enter full name" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue" />
                </Field>
                <Field label="Mobile Number">
                  <input value={walkIn.phone} onChange={(e) => setWalkIn((w) => ({ ...w, phone: e.target.value }))} inputMode="numeric" maxLength={10} placeholder="10-digit number" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-blue" />
                </Field>
                <Field label="Priority">
                  <select value={walkIn.priority} onChange={(e) => setWalkIn((w) => ({ ...w, priority: e.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue">
                    <option value="normal">Normal</option>
                    <option value="urgent">Urgent</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </Field>
                <button disabled={busy} className="w-full rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">
                  {busy ? 'Working…' : 'Generate Token'}
                </button>
              </form>
            </Card>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[12px] text-slate-400">
            <Info className="h-3.5 w-3.5" /> Queue is per doctor, for today. All times in IST.
          </p>
        </>
      )}
    </div>
  )
}

export default OpQueue
