import { CalendarDays, Download } from 'lucide-react'
import { Card, StatusBadge, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { TOKEN_HISTORY } from '../../data/doctorPagesData.js'

function TokenHistory() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Token History" subtitle="Past tokens issued, wait times and outcomes.">
        <ToolButton icon={CalendarDays}>This Week</ToolButton>
        <ToolButton icon={Download}>Export</ToolButton>
      </PageHeading>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Token</th><th className="pb-3 pr-4">Patient</th>
              <th className="pb-3 pr-4">Issued</th><th className="pb-3 pr-4">Seen</th><th className="pb-3 pr-4">Waited</th><th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {TOKEN_HISTORY.map((t, i) => (
              <tr key={i} className="border-t border-slate-50">
                <td className="py-3 pr-4 font-semibold text-slate-500">{t.date}</td>
                <td className="py-3 pr-4 font-bold text-brand-navy">{t.token}</td>
                <td className="py-3 pr-4 font-medium text-brand-navy">{t.patient}</td>
                <td className="py-3 pr-4 tabular-nums text-slate-500">{t.issued}</td>
                <td className="py-3 pr-4 tabular-nums text-slate-500">{t.seen}</td>
                <td className="py-3 pr-4 text-slate-500">{t.waited}</td>
                <td className="py-3"><StatusBadge status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export default TokenHistory
