import { RefreshCw } from 'lucide-react'
import { Card, StatusBadge, PageHeading } from '../../components/clinic/ui.jsx'
import { LIVE_QUEUE } from '../../data/patientDashboardData.js'

function Progress({ pct }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
    </div>
  )
}

function QueueBadge({ status }) {
  if (status === 'Your Turn')
    return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700">Your Turn</span>
  return <StatusBadge status={status} />
}

/** Full live-queue view for the patient's current token. */
function Tokens() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="My Tokens / Live Queue" subtitle={`Live Queue – ${LIVE_QUEUE.clinic}`} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* Your token + progress */}
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col items-center p-6 text-center">
            <p className="text-[13px] font-semibold text-slate-500">Your Token</p>
            <p className="text-[52px] font-extrabold leading-none text-brand-green">{LIVE_QUEUE.yourToken}</p>
            <p className="mt-2 text-[13px] text-slate-500">You are <span className="font-bold text-brand-green">{LIVE_QUEUE.queuePosition}th in queue</span></p>
            <p className="mt-3 text-[12px] font-semibold text-slate-400">Estimated Time</p>
            <p className="text-[20px] font-extrabold text-brand-navy">{LIVE_QUEUE.estimatedTime}</p>
          </Card>
          <Card className="p-5">
            <p className="text-[13px] font-semibold text-slate-500">Queue Progress</p>
            <p className="mb-2 text-[24px] font-extrabold text-brand-navy">{LIVE_QUEUE.progressPct}%</p>
            <Progress pct={LIVE_QUEUE.progressPct} />
            <div className="mt-3 flex justify-between text-[12px] text-slate-400">
              <span><span className="font-bold text-green-600">{LIVE_QUEUE.completed}</span> Completed</span>
              <span><span className="font-bold text-brand-navy">{LIVE_QUEUE.inQueue}</span> In Queue</span>
            </div>
          </Card>
        </div>

        {/* Queue table */}
        <Card className="flex flex-col p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-bold text-brand-navy">Live Queue</h3>
              <p className="text-[12px] text-slate-500">Total Tokens for Today: {LIVE_QUEUE.totalTokens}</p>
            </div>
            <button className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-brand-blue hover:bg-brand-blueLight/40">
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-100">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-[12px] font-semibold text-slate-400">
                  <th className="px-4 py-2.5">Token No.</th>
                  <th className="px-4 py-2.5">Status</th>
                  <th className="px-4 py-2.5">Time</th>
                </tr>
              </thead>
              <tbody className="text-[13.5px]">
                {LIVE_QUEUE.rows.map((r) => (
                  <tr key={r.token} className={`border-t border-slate-50 ${r.status === 'Your Turn' ? 'bg-green-50/60' : ''}`}>
                    <td className="px-4 py-2.5 font-bold text-brand-navy">{r.token}</td>
                    <td className="px-4 py-2.5"><QueueBadge status={r.status} /></td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-500">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-center text-[12px] text-slate-400">Please check-in at the clinic and wait for your turn.</p>
        </Card>
      </div>
    </div>
  )
}

export default Tokens
