import { Activity, FileText, ScanLine, Eye, Download, Upload, ShieldCheck, AlertCircle, HeartPulse } from 'lucide-react'
import { Card, StatCard, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { VITALS, HEALTH_DOCS, ALLERGIES, CONDITIONS } from '../../data/patientDashboardData.js'

/** Health records — latest vitals, conditions/allergies and documents. */
function HealthRecords() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Health Records" subtitle="Your vitals, conditions and medical documents — all in one place.">
        <ToolButton icon={Upload} tone="primary">Upload Record</ToolButton>
      </PageHeading>

      {/* Vitals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {VITALS.map((v) => (
          <StatCard
            key={v.label}
            value={<>{v.value}<span className="ml-1 text-[12px] font-semibold text-slate-400">{v.unit}</span></>}
            label={v.label}
            sub={`Updated ${v.updated}`}
            icon={v.label === 'Heart Rate' ? HeartPulse : Activity}
            tone={v.tone}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        {/* Documents */}
        <Card className="p-5">
          <h3 className="mb-3 text-[16px] font-bold text-brand-navy">Medical Documents</h3>
          <ul className="space-y-3">
            {HEALTH_DOCS.map((d, i) => {
              const Icon = d.type === 'Scan' ? ScanLine : FileText
              return (
                <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[14px] font-bold text-brand-navy">{d.title}</p>
                    <p className="truncate text-[12px] text-slate-400">{d.source} · {d.type}</p>
                  </div>
                  <span className="text-[12px] text-slate-400">{d.date}</span>
                  <div className="flex items-center gap-2">
                    <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-brand-blue hover:bg-brand-blueLight/40">
                      <Eye className="h-3.5 w-3.5" /> View
                    </button>
                    <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </Card>

        {/* Conditions + allergies */}
        <div className="flex flex-col gap-5">
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
              <HeartPulse className="h-4 w-4 text-brand-blue" /> Ongoing Conditions
            </h3>
            <ul className="space-y-2">
              {CONDITIONS.map((c) => (
                <li key={c} className="rounded-lg bg-blue-50 px-3 py-2 text-[12.5px] font-medium text-brand-navy">{c}</li>
              ))}
            </ul>
          </Card>
          <Card className="p-5">
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
              <AlertCircle className="h-4 w-4 text-red-500" /> Allergies
            </h3>
            <div className="flex flex-wrap gap-2">
              {ALLERGIES.map((a) => (
                <span key={a} className="rounded-full bg-red-50 px-3 py-1 text-[12px] font-semibold text-red-600">{a}</span>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-[12.5px] text-green-700">
        <ShieldCheck className="h-4 w-4 shrink-0" />
        Your health data is secure and private. Only you can access your records.
      </div>
    </div>
  )
}

export default HealthRecords
