import { useEffect, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { Card, StatusBadge, PageHeading } from '../../components/clinic/ui.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { tokensApi } from '../../api'
import { prettyDate, prettyTime, statusLabel, todayISO } from '../../lib/format.js'

function TokenHistory() {
  const { doctorId, resolvePatient } = useDoctorCtx()
  const [date, setDate] = useState(todayISO())
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!doctorId) return
    let active = true
    setLoading(true)
    tokensApi
      .history(doctorId, date)
      .then((list) => active && setRows(list || []))
      .catch(() => active && setRows([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [doctorId, date])

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Token History" subtitle="Past tokens issued, wait times and outcomes.">
        <span className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand-navy">
          <CalendarDays className="h-4 w-4 text-slate-400" />
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent outline-none" />
        </span>
      </PageHeading>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Token</th><th className="pb-3 pr-4">Patient</th>
              <th className="pb-3 pr-4">Seen</th><th className="pb-3 pr-4">Waited</th><th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((t) => {
              const p = resolvePatient(t.patient_id)
              return (
                <tr key={t.token_id} className="border-t border-slate-50">
                  <td className="py-3 pr-4 font-semibold text-slate-500">{prettyDate(t.token_date)}</td>
                  <td className="py-3 pr-4 font-bold text-brand-navy">{t.token_number}</td>
                  <td className="py-3 pr-4 font-medium text-brand-navy">{p?.name || (t.patient_id ? `Patient #${t.patient_id}` : 'Walk-in')}</td>
                  <td className="py-3 pr-4 tabular-nums text-slate-500">{t.actual_start ? prettyTime(t.actual_start) : '—'}</td>
                  <td className="py-3 pr-4 text-slate-500">{t.wait_duration_mins != null ? `${t.wait_duration_mins} mins` : '—'}</td>
                  <td className="py-3"><StatusBadge status={statusLabel(t.status)} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No tokens for this date.</p>
        ) : null}
      </Card>
    </div>
  )
}

export default TokenHistory
