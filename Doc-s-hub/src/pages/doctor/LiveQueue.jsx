import { useState, useEffect } from 'react'
import {
  Radio, Clock, PlayCircle, CheckCircle2, PauseCircle, RotateCcw, AlertTriangle,
  Users, Hourglass, Stethoscope, UserX, RefreshCw, BellRing,
} from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { QUEUE, CURRENT_ELAPSED_SEC, WAIT_SLA_MINS } from '../../data/doctorDashboardData.js'

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

function WaitCell({ mins }) {
  if (mins == null) return <span className="text-slate-300">—</span>
  const over = mins > WAIT_SLA_MINS
  return (
    <span className={`inline-flex items-center gap-1 font-semibold ${over ? 'text-red-500' : 'text-slate-500'}`}>
      {over && <AlertTriangle className="h-4 w-4" />}~{mins} mins
    </span>
  )
}

function LiveQueue() {
  const [queue, setQueue] = useState(QUEUE)
  const [elapsed, setElapsed] = useState(CURRENT_ELAPSED_SEC)
  const [delay, setDelay] = useState(null)

  const current = queue.find((p) => p.status === 'In Consultation') || null
  const waiting = queue.filter((p) => p.status === 'Waiting')
  const onHold = queue.filter((p) => p.status === 'On Hold')
  const completed = queue.filter((p) => p.status === 'Completed')
  const next = waiting[0] || null
  const overSla = waiting.filter((p) => p.waitMins > WAIT_SLA_MINS).length

  useEffect(() => {
    if (!current) return
    const id = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(id)
  }, [current?.token])

  const markComplete = () => current && setQueue((q) => q.map((p) => (p.token === current.token ? { ...p, status: 'Completed' } : p)))
  const hold = () => current && setQueue((q) => q.map((p) => (p.token === current.token ? { ...p, status: 'On Hold' } : p)))
  const recall = (token) => setQueue((q) => q.map((p) => (p.token === token ? { ...p, status: 'Waiting', waitMins: 0 } : p)))
  const callNext = () => {
    setQueue((q) => {
      let nq = current ? q.map((p) => (p.token === current.token ? { ...p, status: 'Completed' } : p)) : q
      const nx = nq.find((p) => p.status === 'Waiting')
      if (nx) nq = nq.map((p) => (p.token === nx.token ? { ...p, status: 'In Consultation', waitMins: null } : p))
      return nq
    })
    setElapsed(0)
  }

  const avgWait = waiting.length ? Math.round(waiting.reduce((n, p) => n + (p.waitMins || 0), 0) / waiting.length) : 0
  const maxWait = waiting.length ? Math.max(...waiting.map((p) => p.waitMins || 0)) : 0
  const load = Math.min(100, Math.round((waiting.length / queue.length) * 100))

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Live OP Queue" subtitle="Real-time OPD queue — call, complete and manage patients.">
        <ToolButton icon={RefreshCw}>Refresh</ToolButton>
        <ToolButton icon={BellRing} tone="danger" onClick={() => setDelay({ count: waiting.length, eta: 15 })}>Doctor Delay Alert</ToolButton>
      </PageHeading>

      {delay && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3">
          <BellRing className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="flex-1 text-[13.5px] text-amber-800">
            <span className="font-bold">Delay alert sent</span> to {delay.count} waiting patient{delay.count === 1 ? '' : 's'} — revised ETA <span className="font-bold">+{delay.eta} mins</span>.
          </p>
          <button onClick={() => setDelay(null)} className="rounded-lg p-1 text-amber-500 hover:bg-amber-100">✕</button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard value={queue.length} label="In Queue" icon={Users} tone="blue" />
        <StatCard value={waiting.length} label="Waiting" icon={Hourglass} tone="orange" />
        <StatCard value={current ? 1 : 0} label="In Consultation" icon={Stethoscope} tone="green" />
        <StatCard value={completed.length} label="Completed" icon={CheckCircle2} tone="teal" />
        <StatCard value={overSla} label="Over SLA" icon={AlertTriangle} tone="red" />
      </div>

      {/* Current token + full table */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_1fr]">
        <Card className="flex flex-col">
          <h3 className="text-[15px] font-bold text-brand-navy">Current Running Token</h3>
          {current ? (
            <>
              <div className="mt-3 flex items-center gap-3">
                <Radio className="h-8 w-8 text-green-500" />
                <span className="text-[44px] font-extrabold leading-none text-green-600">{current.token}</span>
                <div className="ml-auto text-right">
                  <p className="text-[15px] font-bold text-brand-navy">{current.name}</p>
                  <p className="text-[13px] text-slate-500">{current.age}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-xl bg-green-50 px-3 py-2">
                <StatusBadge status="In Consultation" />
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
            <button onClick={callNext} disabled={!next}
              className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-brand-blue py-2.5 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-40">
              <PlayCircle className="h-4 w-4" /> Call Next {next ? `(#${next.token})` : ''}
            </button>
            <button onClick={markComplete} disabled={!current}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-green-200 py-2 text-[13px] font-semibold text-green-600 hover:bg-green-50 disabled:opacity-40">
              <CheckCircle2 className="h-4 w-4" /> Complete
            </button>
            <button onClick={hold} disabled={!current}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-amber-200 py-2 text-[13px] font-semibold text-amber-600 hover:bg-amber-50 disabled:opacity-40">
              <PauseCircle className="h-4 w-4" /> Hold
            </button>
          </div>

          {/* Analytics */}
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-xl bg-blue-50 p-2.5"><p className="text-[11px] text-slate-500">Avg Wait</p><p className="text-lg font-extrabold text-brand-navy">{avgWait} min</p></div>
              <div className="rounded-xl bg-orange-50 p-2.5"><p className="text-[11px] text-slate-500">Max Wait</p><p className="text-lg font-extrabold text-brand-navy">{maxWait} min</p></div>
            </div>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-[12px]"><span className="font-semibold text-brand-navy">Queue Load</span><span className="font-semibold text-slate-500">{load}%</span></div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-brand-green to-amber-400" style={{ width: `${load}%` }} /></div>
            </div>
          </div>
        </Card>

        {/* Full queue */}
        <Card className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-brand-navy">Queue</h3>
              <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" /><span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" /></span>Live
              </span>
            </div>
            {overSla > 0 && <span className="flex items-center gap-1 text-[12px] font-semibold text-red-500"><AlertTriangle className="h-4 w-4" /> {overSla} over SLA</span>}
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-400">
                <th className="pb-3 pr-3">Token</th><th className="pb-3 pr-3">Patient</th><th className="pb-3 pr-3">Age / Gender</th>
                <th className="pb-3 pr-3">Status</th><th className="pb-3 pr-3">Wait (Est.)</th><th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {queue.map((r) => (
                <tr key={r.token} className={`border-t border-slate-50 ${r.status === 'In Consultation' ? 'bg-green-50/40' : ''}`}>
                  <td className="py-3 pr-3 font-bold text-brand-navy">{r.token}</td>
                  <td className="py-3 pr-3 font-medium text-brand-navy">{r.name}</td>
                  <td className="py-3 pr-3 text-slate-500">{r.age}</td>
                  <td className="py-3 pr-3"><StatusBadge status={r.status} /></td>
                  <td className="py-3 pr-3 text-[13px]"><WaitCell mins={r.waitMins} /></td>
                  <td className="py-3">
                    {(r.status === 'On Hold' || r.status === 'Completed') ? (
                      <button onClick={() => recall(r.token)} className="flex items-center gap-1 text-[12px] font-semibold text-brand-blue hover:underline"><RotateCcw className="h-3.5 w-3.5" /> Recall</button>
                    ) : r.status === 'Waiting' ? (
                      <span className="text-[12px] text-slate-400">In line</span>
                    ) : (
                      <span className="text-[12px] text-green-600">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {onHold.length > 0 && <p className="mt-3 flex items-center gap-1.5 text-[12px] text-amber-600"><UserX className="h-4 w-4" /> {onHold.length} patient(s) on hold — recall when ready.</p>}
        </Card>
      </div>
    </div>
  )
}

export default LiveQueue
