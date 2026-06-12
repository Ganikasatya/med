import { CalendarDays, Download, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { REPORT_KPIS, VISITS_WEEK, APPT_TYPE_SPLIT } from '../../data/doctorPagesData.js'

const KPI_TONE = { blue: 'text-brand-blue', green: 'text-green-600', teal: 'text-teal-600', orange: 'text-orange-500' }

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.value))
  return (
    <div className="flex h-44 items-end gap-3 pt-2">
      {data.map((d) => (
        <div key={d.day} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <span className="text-[11px] font-semibold text-slate-400">{d.value}</span>
          <div className="w-full rounded-t-md bg-gradient-to-t from-brand-blue/50 to-brand-blue" style={{ height: `${(d.value / max) * 100}%` }} />
          <span className="text-[11px] text-slate-400">{d.day}</span>
        </div>
      ))}
    </div>
  )
}

function Reports() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Reports" subtitle="Performance summary for the selected period.">
        <ToolButton icon={CalendarDays}>This Month</ToolButton>
        <ToolButton icon={Download} tone="primary">Export</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {REPORT_KPIS.map((k) => {
          const up = k.delta.startsWith('+')
          return (
            <Card key={k.label}>
              <p className="text-[12.5px] font-medium text-slate-500">{k.label}</p>
              <div className="mt-1.5 flex items-end justify-between">
                <span className={`text-[26px] font-extrabold leading-none ${KPI_TONE[k.tone]}`}>{k.value}</span>
                <span className={`flex items-center gap-0.5 text-[12px] font-semibold ${up ? 'text-green-600' : 'text-red-500'}`}>
                  {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}{k.delta}
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <h3 className="mb-1 text-[15px] font-bold text-brand-navy">Visits This Week</h3>
          <BarChart data={VISITS_WEEK} />
        </Card>
        <Card>
          <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Appointment Types</h3>
          <div className="space-y-3">
            {APPT_TYPE_SPLIT.map((t) => (
              <div key={t.label}>
                <div className="mb-1 flex items-center justify-between text-[13px]"><span className="font-semibold text-brand-navy">{t.label}</span><span className="text-slate-500">{t.value}%</span></div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${t.tone}`} style={{ width: `${t.value}%` }} /></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Reports
