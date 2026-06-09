import { XCircle, UserX, RotateCcw } from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading } from '../../components/clinic/ui.jsx'
import { CANCELLATIONS } from '../../data/doctorPagesData.js'

function Cancellations() {
  const cancelled = CANCELLATIONS.filter((c) => c.type === 'Cancelled').length
  const noShow = CANCELLATIONS.filter((c) => c.type === 'No Show').length

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Cancellations / No Shows" subtitle="Track missed and cancelled appointments." />

      <div className="grid grid-cols-3 gap-4">
        <StatCard value={CANCELLATIONS.length} label="Total" icon={XCircle} tone="orange" />
        <StatCard value={cancelled} label="Cancelled" icon={RotateCcw} tone="red" />
        <StatCard value={noShow} label="No Shows" icon={UserX} tone="purple" />
      </div>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Patient</th><th className="pb-3 pr-4">Token</th>
              <th className="pb-3 pr-4">Reason</th><th className="pb-3 pr-4">Type</th><th className="pb-3">Refund</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {CANCELLATIONS.map((c, i) => (
              <tr key={i} className="border-t border-slate-50">
                <td className="py-3 pr-4 font-semibold text-slate-500">{c.date}</td>
                <td className="py-3 pr-4 font-medium text-brand-navy">{c.patient}</td>
                <td className="py-3 pr-4 font-bold text-brand-navy">{c.token}</td>
                <td className="py-3 pr-4 text-slate-500">{c.reason}</td>
                <td className="py-3 pr-4"><StatusBadge status={c.type} /></td>
                <td className="py-3 text-slate-500">{c.refund === 'Refunded' ? <StatusBadge status="Refunded" /> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export default Cancellations
