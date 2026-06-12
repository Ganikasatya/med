import { CalendarPlus, Clock, MapPin } from 'lucide-react'
import { Card, StatusBadge, Avatar, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { UPCOMING_APPTS } from '../../data/patientDashboardData.js'

/** Patient's appointments — upcoming list (mirrors the dashboard data). */
function Appointments() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="My Appointments" subtitle="Manage your upcoming and past appointments.">
        <ToolButton icon={CalendarPlus} tone="primary">Book Appointment</ToolButton>
      </PageHeading>

      <Card className="p-5">
        <h3 className="mb-3 text-[16px] font-bold text-brand-navy">Upcoming</h3>
        <ul className="divide-y divide-slate-50">
          {UPCOMING_APPTS.map((a) => (
            <li key={a.token} className="flex flex-wrap items-center gap-4 py-4">
              <Avatar name={a.doctor} className="h-12 w-12" />
              <div className="min-w-[160px] leading-tight">
                <p className="text-[15px] font-bold text-brand-navy">{a.doctor}</p>
                <p className="text-[12.5px] text-slate-500">{a.specialty}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-lg bg-brand-blueLight px-3 py-1.5 text-center">
                  <p className="text-[18px] font-extrabold leading-none text-brand-blue">{a.date}</p>
                  <p className="text-[10px] text-slate-500">{a.month}</p>
                </div>
                <span className="flex items-center gap-1 text-[13px] font-semibold text-slate-600">
                  <Clock className="h-4 w-4 text-slate-400" />{a.time}
                </span>
              </div>
              <div className="min-w-[170px] leading-tight">
                <p className="text-[13.5px] font-semibold text-brand-navy">{a.clinic}</p>
                <p className="flex items-center gap-1 text-[12px] text-slate-400">
                  <MapPin className="h-3.5 w-3.5" />{a.location}
                </p>
              </div>
              <div className="ml-auto text-right leading-tight">
                <p className="text-[13px] font-semibold text-slate-500">Token: <span className="font-bold text-brand-navy">{String(a.token).padStart(2, '0')}</span></p>
                <div className="mt-1"><StatusBadge status={a.status} /></div>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export default Appointments
