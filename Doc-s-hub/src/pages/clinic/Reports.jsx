import { CalendarDays, Download, TrendingUp, TrendingDown, Star } from 'lucide-react'
import { Card, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { REPORT_KPIS, VISITS_WEEK, DEPT_SPLIT, TOP_DOCTORS } from '../../data/clinicPagesData.js'

const KPI_TONE = {
  blue: 'text-brand-blue', teal: 'text-teal-600', orange: 'text-orange-500', green: 'text-green-600',
}

function KpiCard({ value, label, tone, delta }) {
  const up = delta.startsWith('+')
  return (
    <Card>
      <p className="text-[12px] font-medium text-slate-500">{label}</p>
      <div className="mt-1 flex items-end justify-between">
        <span className={`text-[26px] font-extrabold leading-none ${KPI_TONE[tone]}`}>{value}</span>
        <span className={`flex items-center gap-0.5 text-[12px] font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
          {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {delta}
        </span>
      </div>
    </Card>
  )
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="flex h-full items-end gap-3 pt-2">
      {data.map((d) => (
        <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] font-semibold text-slate-500">{d.value}</span>
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-brand-blue/60 to-brand-blue"
            style={{ height: `${(d.value / max) * 100}%` }}
          />
          <span className="text-[11px] text-slate-400">{d.day}</span>
        </div>
      ))}
    </div>
  )
}

function Donut({ data }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const r = 42
  const c = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-32 w-32 -rotate-90">
        {data.map((d) => {
          const len = (d.value / total) * c
          const el = (
            <circle key={d.label} cx="60" cy="60" r={r} fill="none" stroke={d.color} strokeWidth="16"
              strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />
          )
          offset += len
          return el
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-extrabold text-brand-navy">100%</span>
        <span className="text-[10px] text-slate-400">visits</span>
      </div>
    </div>
  )
}

function Reports() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Reports & Analytics" subtitle="Performance insights for your clinic.">
        <ToolButton icon={CalendarDays}>This Month</ToolButton>
        <ToolButton icon={Download} tone="primary">Export</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {REPORT_KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1.7fr_1fr]">
        {/* Bar chart */}
        <Card className="flex flex-col">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Visits This Week</h3>
            <span className="text-[12px] font-semibold text-slate-400">Total 1,395</span>
          </div>
          <div className="min-h-0 flex-1">
            <BarChart data={VISITS_WEEK} />
          </div>
        </Card>

        {/* Donut */}
        <Card className="flex flex-col">
          <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Visits by Department</h3>
          <div className="flex flex-1 items-center gap-4">
            <Donut data={DEPT_SPLIT} />
            <ul className="flex-1 space-y-2">
              {DEPT_SPLIT.map((d) => (
                <li key={d.label} className="flex items-center gap-2 text-[12px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 text-slate-600">{d.label}</span>
                  <span className="font-bold text-brand-navy">{d.value}%</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Top doctors */}
      <Card>
        <h3 className="mb-2 text-[15px] font-bold text-brand-navy">Top Doctors by Consultations</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-2 pr-4">#</th>
              <th className="pb-2 pr-4">Doctor</th>
              <th className="pb-2 pr-4">Specialty</th>
              <th className="pb-2 pr-4">Consultations</th>
              <th className="pb-2">Rating</th>
            </tr>
          </thead>
          <tbody className="text-[13px]">
            {TOP_DOCTORS.map((d, i) => (
              <tr key={d.name} className="border-t border-slate-50">
                <td className="py-2 pr-4 font-bold text-slate-400">{i + 1}</td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={d.name} className="h-8 w-8 text-[11px]" />
                    <span className="font-semibold text-brand-navy">{d.name}</span>
                  </div>
                </td>
                <td className="py-2 pr-4 text-slate-500">{d.specialty}</td>
                <td className="py-2 pr-4 font-semibold text-brand-navy">{d.consults}</td>
                <td className="py-2">
                  <span className="flex items-center gap-1 font-semibold text-amber-500">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {d.rating}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export default Reports
