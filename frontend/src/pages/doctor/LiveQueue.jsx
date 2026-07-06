import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Radio, Clock, PlayCircle, CheckCircle2, SkipForward, RotateCcw, AlertTriangle,
  Users, Hourglass, Stethoscope, UserX, RefreshCw, BellRing, Pill,
} from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { tokensApi, doctorsApi, appointmentsApi, patientsApi } from '../../api'
import { VitalsSummaryCard } from '../../components/patient/VitalsPanel.jsx'
import RxComposer from '../../components/doctor/RxComposer.jsx'
import { prettyTime, statusLabel, todayISO } from '../../lib/format.js'

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function LiveQueue() {
  const { doctorId, resolvePatient } = useDoctorCtx()
  const [queue, setQueue] = useState({ current: null, waiting: [], total_waiting: 0 })
  const [stats, setStats] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const [busy, setBusy] = useState(false)
  const [delay, setDelay] = useState(null)
  const [vitals, setVitals] = useState(null)
  const [rxFor, setRxFor] = useState(null)   // current token we're writing an Rx for
  const startRef = useRef(null)

  const load = useCallback(async () => {
    if (!doctorId) return
    try {
      const [q, s] = await Promise.all([
        tokensApi.queue(doctorId, todayISO()),
        tokensApi.stats(doctorId, todayISO()).catch(() => null),
      ])
      setQueue(q || { current: null, waiting: [], total_waiting: 0 })
      setStats(s)
      // Anchor the running timer to the current token's actual_start.
      startRef.current = q?.current?.actual_start ? new Date(q.current.actual_start).getTime() : null
      // Pull the current patient's latest vitals (recorded by reception at
      // check-in) so the doctor sees them right here during the consult.
      const pid = q?.current?.patient_id
      if (pid) patientsApi.vitals(pid).then(setVitals).catch(() => setVitals([]))
      else setVitals(null)
    } catch {
      /* leave previous state */
    }
  }, [doctorId])

  useEffect(() => {
    load()
    const poll = setInterval(load, 10000)
    return () => clearInterval(poll)
  }, [load])

  // 1s ticker for the running consultation timer.
  useEffect(() => {
    const id = setInterval(() => {
      if (startRef.current) setElapsed(Math.max(0, Math.round((Date.now() - startRef.current) / 1000)))
      else setElapsed(0)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const act = async (fn) => {
    setBusy(true)
    try {
      await fn()
      await load()
    } catch (e) {
      alert(e.message || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  const current = queue.current
  const waiting = queue.waiting || []
  const next = waiting[0] || null

  const sendDelay = () =>
    act(async () => {
      await doctorsApi.logDelay({ doctor_id: doctorId, delay_minutes: 15, reason: 'Running late' })
      setDelay({ count: waiting.length, eta: 15 })
    })

  const nameOf = (t) => resolvePatient(t?.patient_id)?.name || (t ? `Token ${t.token_number}` : '')

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Live OP Queue" subtitle="Real-time OPD queue — call, complete and manage patients.">
        <ToolButton icon={RefreshCw} onClick={load}>Refresh</ToolButton>
        <ToolButton icon={BellRing} tone="danger" onClick={sendDelay} disabled={busy}>Doctor Delay Alert</ToolButton>
      </PageHeading>

      {delay && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
          <BellRing className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="flex-1 text-[13.5px] text-amber-800">
            <span className="font-bold">Delay alert sent</span> — revised ETA <span className="font-bold">+{delay.eta} mins</span>.
          </p>
          <button onClick={() => setDelay(null)} className="rounded-lg p-1 text-amber-500 hover:bg-amber-100">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard value={stats?.total ?? queue.total_waiting} label="Tokens Today" icon={Users} tone="blue" />
        <StatCard value={stats?.waiting ?? queue.total_waiting} label="Waiting" icon={Hourglass} tone="orange" />
        <StatCard value={current ? 1 : 0} label="In Consultation" icon={Stethoscope} tone="green" />
        <StatCard value={stats?.served ?? 0} label="Completed" icon={CheckCircle2} tone="teal" />
        <StatCard value={stats?.avg_wait_mins != null ? `${stats.avg_wait_mins} min` : '—'} label="Avg Wait" icon={Clock} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <div className="flex flex-col gap-4">
        <Card className="flex flex-col">
          <h3 className="text-[15px] font-bold text-brand-navy">Current Running Token</h3>
          {current ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <Radio className="h-8 w-8 text-green-500" />
                <span className="text-[44px] font-extrabold leading-none text-green-600">{current.token_number}</span>
                <div className="ml-auto text-right">
                  <p className="text-[15px] font-bold text-brand-navy">{nameOf(current)}</p>
                  {current.family_member_name && <p className="text-[11px] font-semibold text-purple-600">for {current.family_member_name}</p>}
                  <p className="text-[13px] text-slate-500">{current.display_code}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2">
                <StatusBadge status={statusLabel(current.status)} />
                <span className="flex items-center gap-1 text-[15px] font-bold tabular-nums text-brand-navy">
                  <Clock className="h-4 w-4 text-slate-400" />{fmt(elapsed)}
                </span>
              </div>
            </>
          ) : (
            <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm font-semibold text-slate-500">No active consultation</p>
              <p className="mt-1 text-xs text-slate-400">Call the next patient to begin.</p>
            </div>
          )}

          <div className="mt-3 grid grid-cols-2 gap-2">
            <button onClick={() => act(() => tokensApi.next(doctorId))} disabled={busy || !next}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-40">
              <PlayCircle className="h-4 w-4" /> Call Next {next ? `(#${next.token_number})` : ''}
            </button>
            <button onClick={() => act(() => tokensApi.complete(current.token_id))} disabled={busy || !current}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-green-200 py-2 text-[13px] font-semibold text-green-600 hover:bg-green-50 disabled:opacity-40">
              <CheckCircle2 className="h-4 w-4" /> Complete
            </button>
            <button onClick={() => act(() => tokensApi.skip(current.token_id, 'Skipped'))} disabled={busy || !current}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 py-2 text-[13px] font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-40">
              <SkipForward className="h-4 w-4" /> Skip
            </button>
            <button onClick={() => setRxFor(current)} disabled={!current || !current?.patient_id}
              className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-brand-blue/30 bg-brand-blueLight/40 py-2 text-[13px] font-semibold text-brand-blue hover:bg-brand-blueLight disabled:opacity-40">
              <Pill className="h-4 w-4" /> Write Prescription
            </button>
          </div>
        </Card>

        {/* Vitals — recorded at check-in */}
        <VitalsSummaryCard vitals={current ? vitals : []} patientName={current ? nameOf(current) : null} />
        </div>

        {/* Full queue */}
        <Card className="flex flex-col">
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-[15px] font-bold text-brand-navy">Queue</h3>
            <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
              <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span>Live
            </span>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-400">
                <th className="pb-3 pr-3">Token</th><th className="pb-3 pr-3">Patient</th><th className="pb-3 pr-3">Position</th>
                <th className="pb-3 pr-3">Status</th><th className="pb-3 pr-3">Est. Time</th><th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {[current, ...waiting].filter(Boolean).map((r) => (
                <tr key={r.token_id} className={`border-t border-slate-50 ${r.status === 'current' ? 'bg-green-50/40' : ''}`}>
                  <td className="py-3 pr-3 font-bold text-brand-navy">{r.token_number}</td>
                  <td className="py-3 pr-3 font-medium text-brand-navy">{nameOf(r)}{r.family_member_name ? <span className="ml-1.5 text-[11px] font-semibold text-purple-600">· for {r.family_member_name}</span> : null}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.queue_position}</td>
                  <td className="py-3 pr-3"><StatusBadge status={statusLabel(r.status)} /></td>
                  <td className="py-3 pr-3 text-slate-500">{r.estimated_time ? prettyTime(r.estimated_time) : '—'}</td>
                  <td className="py-3">
                    {r.status === 'current' ? (
                      <span className="text-[12px] text-green-600">Active</span>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        {r.consultation_fee > 0 && !r.consultation_paid ? (
                          <button onClick={() => act(() => appointmentsApi.collectPayment(r.appointment_id))} disabled={busy} className="rounded-lg bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-amber-600 disabled:opacity-60">Collect ₹{r.consultation_fee}</button>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">Paid</span>
                        )}
                        <button onClick={() => act(() => tokensApi.recall(r.token_id))} disabled={busy} className="flex items-center gap-1 text-[12px] font-semibold text-brand-blue hover:underline"><RotateCcw className="h-3.5 w-3.5" /> Recall</button>
                        <button onClick={() => act(() => tokensApi.missed(r.token_id))} disabled={busy} className="flex items-center gap-1 text-[12px] font-semibold text-red-500 hover:underline"><UserX className="h-3.5 w-3.5" /> No-show</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {!current && waiting.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Queue is empty.</p>}
        </Card>
      </div>

      {rxFor && (
        <RxComposer
          patientId={rxFor.patient_id}
          doctorId={doctorId}
          appointmentId={rxFor.appointment_id}
          patientName={nameOf(rxFor)}
          defaultFamilyMemberId={rxFor.family_member_id}
          onClose={() => setRxFor(null)}
        />
      )}
    </div>
  )
}

export default LiveQueue
