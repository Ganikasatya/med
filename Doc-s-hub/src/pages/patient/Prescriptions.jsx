import { useState } from 'react'
import { FileText, FlaskConical, Eye, Download, Upload, ShieldCheck } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { PRESCRIPTIONS, PRESCRIPTION_TABS } from '../../data/patientDashboardData.js'

/** Health records & prescriptions, filterable by type. */
function Prescriptions() {
  const [tab, setTab] = useState('All')
  const items = tab === 'All' ? PRESCRIPTIONS : PRESCRIPTIONS.filter((p) => p.type === tab)

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Prescriptions & Health Records" subtitle="View, download and upload your medical documents.">
        <ToolButton icon={Upload} tone="primary">Upload New</ToolButton>
      </PageHeading>

      <Card className="p-5">
        {/* Tabs */}
        <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-100">
          {PRESCRIPTION_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 px-3 pb-2 text-[13px] font-semibold transition-colors ${
                tab === t ? 'border-brand-blue text-brand-blue' : 'border-transparent text-slate-500 hover:text-brand-navy'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <ul className="space-y-3">
          {items.map((p, i) => {
            const Icon = p.kind === 'lab' ? FlaskConical : FileText
            return (
              <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="truncate text-[14px] font-bold text-brand-navy">{p.title}</p>
                  <p className="truncate text-[12px] text-slate-400">{p.sub} · {p.type}</p>
                </div>
                <span className="text-[12px] text-slate-400">{p.date}</span>
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
          {items.length === 0 && (
            <li className="py-8 text-center text-[13px] text-slate-400">No documents in this category yet.</li>
          )}
        </ul>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2.5 text-[12.5px] text-green-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Your health data is secure and private. Only you can access your records.
        </div>
      </Card>
    </div>
  )
}

export default Prescriptions
