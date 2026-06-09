import { Activity } from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { ANALYTICS_METRICS, VISITS_WEEK } from '../../data/doctorPagesData.js'

function LineChart({ data }) {
  const max = Math.max(...data.map((d) => d.value))
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${28 - (d.value / max) * 24}`).join(' ')
  return (
    <svg viewBox="0 0 100 28" className="h-40 w-full" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => <circle key={i} cx={(i / (data.length - 1)) * 100} cy={28 - (d.value / max) * 24} r="0.9" fill="#2563eb" />)}
    </svg>
  )
}

function Analytics() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Analytics" subtitle="Deeper insights into your practice patterns." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {ANALYTICS_METRICS.map((m) => (
          <Card key={m.label} className="text-center">
            <p className="text-[22px] font-extrabold text-brand-navy">{m.value}</p>
            <p className="mt-1 text-[12px] text-slate-500">{m.label}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h3 className="mb-1 flex items-center gap-2 text-[15px] font-bold text-brand-navy"><Activity className="h-5 w-5 text-brand-blue" /> Patient Visits Trend</h3>
        <p className="mb-2 text-[12.5px] text-slate-400">Daily visits over the last week</p>
        <LineChart data={VISITS_WEEK} />
        <div className="mt-1 flex justify-between text-[11px] text-slate-400">
          {VISITS_WEEK.map((d) => <span key={d.day}>{d.day}</span>)}
        </div>
      </Card>
    </div>
  )
}

export default Analytics
