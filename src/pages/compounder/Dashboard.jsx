import { Link } from 'react-router-dom'
import { ArrowRight, BellRing, Clock, FlaskConical, HeartPulse, PackageCheck, Plus, Printer, Radio, UserPlus } from 'lucide-react'
import { Card, StatusBadge, Avatar } from '../../components/clinic/ui.jsx'
import { APPOINTMENTS, DASHBOARD_STATS, NOTIFICATIONS, QUEUE } from '../../data/compounderData.js'

const TONES = {
  blue: 'border-blue-100 bg-blue-50/50 text-brand-blue',
  green: 'border-green-100 bg-green-50/50 text-green-600',
  orange: 'border-orange-100 bg-orange-50/50 text-orange-500',
  purple: 'border-purple-100 bg-purple-50/50 text-purple-600',
}

const ACTIONS = [
  { label: 'Add Walk-in Patient', icon: UserPlus, to: 'appointments', tone: 'text-green-600' },
  { label: 'Record Vitals', icon: HeartPulse, to: 'vitals', tone: 'text-brand-blue' },
  { label: 'Order Lab Test', icon: FlaskConical, to: 'lab-orders', tone: 'text-purple-600' },
  { label: 'Dispense Medicine', icon: PackageCheck, to: 'medicines', tone: 'text-orange-500' },
  { label: 'Print Token Slip', icon: Printer, to: 'queue', tone: 'text-brand-blue' },
]

function Dashboard() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-extrabold text-brand-navy">Nurse / Compounder Dashboard</h1>
        <p className="text-sm text-slate-500">Track appointments, manage patients and support doctor consultation.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {DASHBOARD_STATS.map(({ label, value, sub, icon: Icon, tone }) => (
          <div key={label} className={`rounded-2xl border p-4 ${TONES[tone]}`}>
            <div className="flex items-start justify-between">
              <div><p className="text-[12px] font-semibold text-slate-600">{label}</p><p className="mt-2 text-3xl font-extrabold text-brand-navy">{value}</p><p className="mt-1 text-[11px] text-slate-500">{sub}</p></div>
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/80"><Icon className="h-5 w-5" /></span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr_280px]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2"><h3 className="text-[16px] font-bold text-brand-navy">Live Queue</h3><span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">Live</span></div>
            <Link to="queue" className="text-[12px] font-semibold text-brand-blue">View Full Queue</Link>
          </div>
          <table className="w-full text-left">
            <thead><tr className="text-[11px] font-semibold text-slate-400"><th className="pb-2">Token</th><th className="pb-2">Patient</th><th className="pb-2">Status</th><th className="pb-2">Wait</th></tr></thead>
            <tbody className="text-[13px]">{QUEUE.slice(0, 5).map((p) => (
              <tr key={p.token} className="border-t border-slate-50">
                <td className="py-2.5 text-lg font-extrabold text-brand-navy">{p.token}</td>
                <td className="py-2.5"><div className="flex items-center gap-2"><Avatar name={p.patient} className="h-8 w-8 text-[10px]" /><div><p className="font-semibold text-brand-navy">{p.patient}</p><p className="text-[10px] text-slate-400">{p.age}</p></div></div></td>
                <td className="py-2.5"><StatusBadge status={p.status} /></td>
                <td className="py-2.5 text-slate-500">{p.wait}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>

        <Card>
          <h3 className="mb-3 text-[16px] font-bold text-brand-navy">Today's Schedule</h3>
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <Avatar name="Dr. Ramesh Kumar" className="h-10 w-10 text-xs" />
            <div><p className="text-[13px] font-bold text-brand-navy">Dr. Ramesh Kumar</p><p className="text-[11px] text-slate-400">General Physician</p></div>
          </div>
          {['09:00 AM – 10:00 AM', '10:00 AM – 11:00 AM', '11:00 AM – 12:00 PM', '12:00 PM – 01:00 PM', '05:00 PM – 06:00 PM'].map((time, index) => (
            <div key={time} className="mb-3">
              <div className="mb-1 flex justify-between text-[11px]"><span className="font-semibold text-brand-navy">{time}</span><span>{12 - index * 2} / 12</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${index < 3 ? 'bg-brand-green' : 'bg-amber-400'}`} style={{ width: `${Math.max(0, 100 - index * 18)}%` }} /></div>
            </div>
          ))}
        </Card>

        <Card>
          <h3 className="mb-3 text-[16px] font-bold text-brand-navy">Quick Actions</h3>
          <div className="space-y-2">
            {ACTIONS.map(({ label, icon: Icon, to, tone }) => (
              <Link key={label} to={to} className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-3 hover:border-brand-blue">
                <Icon className={`h-5 w-5 ${tone}`} /><span className="text-[12px] font-semibold text-brand-navy">{label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <div className="mb-2 flex justify-between"><h3 className="text-[16px] font-bold text-brand-navy">Today's Appointments</h3><Link to="appointments" className="text-[12px] font-semibold text-brand-blue">View All</Link></div>
          {APPOINTMENTS.slice(0, 4).map((a) => (
            <div key={a.token} className="flex items-center gap-3 border-t border-slate-50 py-2.5">
              <span className="w-20 text-[12px] font-semibold text-slate-500">{a.time}</span><Avatar name={a.patient} className="h-8 w-8 text-[10px]" />
              <span className="flex-1 text-[13px] font-semibold text-brand-navy">{a.patient}</span><span className="text-[12px] text-slate-500">{a.type}</span>
              <span className="font-bold text-brand-navy">{a.token}</span><StatusBadge status={a.status} />
            </div>
          ))}
        </Card>
        <Card>
          <h3 className="mb-2 text-[16px] font-bold text-brand-navy">Alerts &amp; Notifications</h3>
          {NOTIFICATIONS.slice(0, 4).map((n, i) => (
            <div key={n.title} className="flex gap-3 border-t border-slate-50 py-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-brand-blue">{i === 0 ? <Clock className="h-4 w-4" /> : <BellRing className="h-4 w-4" />}</span>
              <div className="min-w-0 flex-1"><p className="text-[12px] font-bold text-brand-navy">{n.title}</p><p className="truncate text-[11px] text-slate-500">{n.desc}</p></div>
              <span className="text-[10px] text-slate-400">{n.time}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] text-brand-blue">
        <Radio className="h-5 w-5" /> Keep your queue updated and provide accurate information to patients.
        <ArrowRight className="ml-auto h-4 w-4" />
      </div>
    </div>
  )
}

export default Dashboard
