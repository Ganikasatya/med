import { useEffect, useMemo, useState } from 'react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { appointmentsApi } from '../../api'

const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function BarChart({ data }) {
  const max = Math.max(1, ...data.map((d) => d.value))
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
  const { doctorId } = useDoctorCtx()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!doctorId) return
    let active = true
    setLoading(true)
    appointmentsApi
      .list({ doctor_id: doctorId, size: 200 })
      .then((list) => active && setAppts(list || []))
      .catch(() => active && setAppts([]))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [doctorId])

  const { kpis, weekData, typeSplit } = useMemo(() => {
    const completed = appts.filter((a) => a.status === 'completed')
    // Money ACTUALLY collected for this doctor: consultation fees that were paid
    // (collected at the clinic) + the booking fees paid online at booking time.
    const consultRevenue = appts.reduce(
      (n, a) => n + (a.consultation_paid ? Number(a.consultation_fee || 0) : 0), 0)
    const bookingRevenue = appts.reduce((n, a) => n + Number(a.booking_fee_paid || 0), 0)
    const revenue = consultRevenue + bookingRevenue
    const patients = new Set(appts.map((a) => a.patient_id)).size
    const noShows = appts.filter((a) => a.status === 'no_show').length

    // Visits per weekday (last 7 days window from appointment_date).
    const counts = Object.fromEntries(WEEK.map((d) => [d, 0]))
    appts.forEach((a) => {
      const dt = new Date(a.appointment_date)
      if (!Number.isNaN(dt.getTime())) {
        const wd = WEEK[(dt.getDay() + 6) % 7] // JS Sun=0 -> shift so Mon=0
        counts[wd] += 1
      }
    })

    // Type split.
    const types = { Online: 0, 'Walk-in': 0, Emergency: 0 }
    appts.forEach((a) => {
      if (a.appointment_type === 'walkin') types['Walk-in'] += 1
      else if (a.appointment_type === 'emergency') types.Emergency += 1
      else types.Online += 1
    })
    const total = appts.length || 1
    const split = [
      { label: 'Online', value: Math.round((types.Online / total) * 100), tone: 'bg-brand-blue' },
      { label: 'Walk-in', value: Math.round((types['Walk-in'] / total) * 100), tone: 'bg-brand-green' },
      { label: 'Emergency', value: Math.round((types.Emergency / total) * 100), tone: 'bg-purple-500' },
    ]

    return {
      kpis: [
        { label: 'Total Patients', value: patients, tone: 'text-brand-blue' },
        { label: 'Consultations', value: completed.length, tone: 'text-green-600' },
        { label: 'Collected', value: `₹${revenue.toLocaleString('en-IN')}`, tone: 'text-teal-600',
          sub: `Consult ₹${consultRevenue.toLocaleString('en-IN')} · Booking ₹${bookingRevenue.toLocaleString('en-IN')}` },
        { label: 'No-shows', value: noShows, tone: 'text-orange-500' },
      ],
      weekData: WEEK.map((d) => ({ day: d, value: counts[d] })),
      typeSplit: split,
    }
  }, [appts])

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Reports" subtitle="Your performance summary, computed from your appointments." />

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label}>
                <p className="text-[12.5px] font-medium text-slate-500">{k.label}</p>
                <span className={`mt-1.5 block text-[26px] font-extrabold leading-none ${k.tone}`}>{k.value}</span>
                {k.sub && <p className="mt-1.5 text-[11px] font-medium text-slate-400">{k.sub}</p>}
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
            <Card>
              <h3 className="mb-1 text-[15px] font-bold text-brand-navy">Visits by Weekday</h3>
              <BarChart data={weekData} />
            </Card>
            <Card>
              <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Appointment Types</h3>
              <div className="space-y-3">
                {typeSplit.map((t) => (
                  <div key={t.label}>
                    <div className="mb-1 flex items-center justify-between text-[13px]"><span className="font-semibold text-brand-navy">{t.label}</span><span className="text-slate-500">{t.value}%</span></div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${t.tone}`} style={{ width: `${t.value}%` }} /></div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

export default Reports
