import { IndianRupee, Wallet, Receipt, Download } from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading } from '../../components/clinic/ui.jsx'
import { PAYMENTS, PAYMENTS_SUMMARY } from '../../data/patientDashboardData.js'

/** Payment history — platform fees, consultations and lab payments. */
function Payments() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Payments" subtitle="Your platform fees, consultation and lab payments." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard value={<><IndianRupee className="inline h-5 w-5" />{PAYMENTS_SUMMARY.totalSpent}</>} label="Total Spent" icon={Wallet} tone="blue" />
        <StatCard value={<><IndianRupee className="inline h-5 w-5" />{PAYMENTS_SUMMARY.thisMonth}</>} label="This Month" icon={IndianRupee} tone="green" />
        <StatCard value={PAYMENTS_SUMMARY.transactions} label="Transactions" icon={Receipt} tone="purple" />
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-[16px] font-bold text-brand-navy">Transaction History</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-400">
                <th className="pb-3 pr-3">Date</th>
                <th className="pb-3 pr-3">Description</th>
                <th className="pb-3 pr-3">Token</th>
                <th className="pb-3 pr-3">Method</th>
                <th className="pb-3 pr-3">Amount</th>
                <th className="pb-3 pr-3">Status</th>
                <th className="pb-3">Receipt</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px]">
              {PAYMENTS.map((p, i) => (
                <tr key={i} className="border-t border-slate-50">
                  <td className="py-2.5 pr-3 tabular-nums text-slate-500">{p.date}</td>
                  <td className="py-2.5 pr-3 text-slate-700">{p.desc}</td>
                  <td className="py-2.5 pr-3 font-bold text-brand-navy">{p.token ? String(p.token).padStart(2, '0') : '—'}</td>
                  <td className="py-2.5 pr-3 text-slate-500">{p.method}</td>
                  <td className="py-2.5 pr-3 font-bold text-brand-navy">₹{p.amount}</td>
                  <td className="py-2.5 pr-3"><StatusBadge status={p.status} /></td>
                  <td className="py-2.5">
                    <button className="flex items-center gap-1 text-[12.5px] font-semibold text-brand-blue hover:underline">
                      <Download className="h-3.5 w-3.5" /> PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export default Payments
