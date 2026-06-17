import { useEffect, useState } from 'react'
import { XCircle, UserX, RotateCcw } from 'lucide-react'
import { Card, StatCard, StatusBadge, PageHeading } from '../../components/clinic/ui.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { appointmentsApi } from '../../api'
import { prettyDate, statusLabel } from '../../lib/format.js'

function Cancellations() {
  const { doctorId, resolvePatient } = useDoctorCtx()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!doctorId) return
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const [appts, cancels] = await Promise.all([
          appointmentsApi.list({ doctor_id: doctorId, size: 200 }),
          appointmentsApi.cancellations().catch(() => []),
        ])
        if (!active) return
        const cancelMap = Object.fromEntries((cancels || []).map((c) => [c.appointment_id, c]))
        const filtered = (appts || [])
          .filter((a) => a.status === 'cancelled' || a.status === 'no_show')
          .sort((a, b) => (a.appointment_date < b.appointment_date ? 1 : -1))
          .map((a) => ({ ...a, _cancel: cancelMap[a.appointment_id] }))
        setRows(filtered)
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [doctorId])

  const cancelled = rows.filter((c) => c.status === 'cancelled').length
  const noShow = rows.filter((c) => c.status === 'no_show').length

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Cancellations / No Shows" subtitle="Track missed and cancelled appointments." />

      <div className="grid grid-cols-3 gap-4">
        <StatCard value={rows.length} label="Total" icon={XCircle} tone="orange" />
        <StatCard value={cancelled} label="Cancelled" icon={RotateCcw} tone="red" />
        <StatCard value={noShow} label="No Shows" icon={UserX} tone="purple" />
      </div>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Date</th><th className="pb-3 pr-4">Patient</th>
              <th className="pb-3 pr-4">Reason</th><th className="pb-3 pr-4">Type</th><th className="pb-3">Refund</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {rows.map((c) => {
              const p = resolvePatient(c.patient_id)
              const reason = c._cancel?.cancel_reason || c.notes || '—'
              const refund = c._cancel?.refund_status
              return (
                <tr key={c.appointment_id} className="border-t border-slate-50">
                  <td className="py-3 pr-4 font-semibold text-slate-500">{prettyDate(c.appointment_date)}</td>
                  <td className="py-3 pr-4 font-medium text-brand-navy">{p?.name || `Patient #${c.patient_id}`}</td>
                  <td className="py-3 pr-4 text-slate-500">{reason}</td>
                  <td className="py-3 pr-4"><StatusBadge status={statusLabel(c.status)} /></td>
                  <td className="py-3 text-slate-500">{refund && refund !== 'none' ? <StatusBadge status={statusLabel(refund)} /> : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {loading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">No cancellations or no-shows.</p>
        ) : null}
      </Card>
    </div>
  )
}

export default Cancellations
