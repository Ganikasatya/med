import { useState } from 'react'
import { BellRing, Clock, Users, Send, CheckCircle2 } from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { DELAY_LOG } from '../../data/doctorPagesData.js'
import { QUEUE } from '../../data/doctorDashboardData.js'

const PRESETS = [10, 15, 20, 30, 45]

function DelayAlert() {
  const waiting = QUEUE.filter((p) => p.status === 'Waiting').length
  const [minutes, setMinutes] = useState(15)
  const [sent, setSent] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Doctor Delay Alert" subtitle="Notify waiting patients about a delay and revised wait time." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[420px_1fr]">
        {/* Compose */}
        <Card>
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy"><BellRing className="h-5 w-5 text-red-500" /> Send Delay Alert</h3>

          <div className="mb-3 flex items-center gap-3 rounded-xl bg-blue-50 p-3">
            <Users className="h-5 w-5 text-brand-blue" />
            <p className="text-[13px] text-slate-600"><span className="font-bold text-brand-navy">{waiting} waiting patients</span> will be notified by SMS &amp; app.</p>
          </div>

          <label className="mb-1.5 block text-[12.5px] font-semibold text-slate-600">Estimated delay</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.map((m) => (
              <button key={m} onClick={() => { setMinutes(m); setSent(false) }}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-colors ${minutes === m ? 'border-brand-blue bg-brand-blue text-white' : 'border-slate-200 text-brand-navy hover:border-slate-300'}`}>
                +{m} min
              </button>
            ))}
          </div>

          {sent ? (
            <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13.5px] font-semibold text-green-700">
              <CheckCircle2 className="h-5 w-5" /> Alert sent to {waiting} patients (+{minutes} min).
            </div>
          ) : (
            <button onClick={() => setSent(true)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-600">
              <Send className="h-4 w-4" /> Send Delay Alert
            </button>
          )}
        </Card>

        {/* Log */}
        <Card>
          <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Recent Alerts</h3>
          <ul className="divide-y divide-slate-50">
            {DELAY_LOG.map((d, i) => (
              <li key={i} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-purple-600"><Clock className="h-[18px] w-[18px]" /></span>
                <div className="flex-1">
                  <p className="text-[13.5px] font-semibold text-brand-navy">+{d.minutes} min delay · {d.count} patients</p>
                  <p className="text-[12px] text-slate-500">via {d.channel}</p>
                </div>
                <span className="text-[12px] text-slate-400">{d.time}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}

export default DelayAlert
