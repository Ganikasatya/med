import { IndianRupee, Wallet, Receipt, Download } from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading } from '../../components/clinic/ui.jsx'
import { PAYMENTS, PAYMENTS_SUMMARY } from '../../data/patientDashboardData.js'
import { useI18n } from '../../i18n/index.jsx'

/** Payment history — platform fees, consultations and lab payments. */
function Payments() {
  const { t } = useI18n()
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={t('ppage.paymentsTitle')} subtitle={t('ppage.paymentsSubtitle')} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard value={<><IndianRupee className="inline h-5 w-5" />{PAYMENTS_SUMMARY.totalSpent}</>} label={t('ppage.totalSpent')} icon={Wallet} tone="blue" />
        <StatCard value={<><IndianRupee className="inline h-5 w-5" />{PAYMENTS_SUMMARY.thisMonth}</>} label={t('ppage.thisMonth')} icon={IndianRupee} tone="green" />
        <StatCard value={PAYMENTS_SUMMARY.transactions} label={t('ppage.transactions')} icon={Receipt} tone="purple" />
      </div>

      <Card className="p-5">
        <h3 className="mb-3 text-[16px] font-bold text-brand-navy">{t('ppage.transactionHistory')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-400">
                <th className="pb-3 pr-3">{t('ppage.colDate')}</th>
                <th className="pb-3 pr-3">{t('ppage.colDescription')}</th>
                <th className="pb-3 pr-3">{t('ppage.colToken')}</th>
                <th className="pb-3 pr-3">{t('ppage.colMethod')}</th>
                <th className="pb-3 pr-3">{t('ppage.colAmount')}</th>
                <th className="pb-3 pr-3">{t('ppage.colStatus')}</th>
                <th className="pb-3">{t('ppage.colReceipt')}</th>
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
