import { Ticket, AlertTriangle, Bell, CalendarCheck, CreditCard, FlaskConical, CheckCheck } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { ALL_NOTIFICATIONS } from '../../data/patientDashboardData.js'

const META = {
  token: { icon: Ticket, tone: 'bg-blue-100 text-brand-blue' },
  delay: { icon: AlertTriangle, tone: 'bg-red-100 text-red-500' },
  reminder: { icon: Bell, tone: 'bg-green-100 text-green-600' },
  appt: { icon: CalendarCheck, tone: 'bg-purple-100 text-purple-600' },
  payment: { icon: CreditCard, tone: 'bg-teal-100 text-teal-600' },
  report: { icon: FlaskConical, tone: 'bg-orange-100 text-orange-500' },
}

/** All notifications feed. */
function Notifications() {
  const unread = ALL_NOTIFICATIONS.filter((n) => n.unread).length

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Notifications" subtitle={`You have ${unread} unread notification${unread === 1 ? '' : 's'}.`}>
        <ToolButton icon={CheckCheck}>Mark all as read</ToolButton>
      </PageHeading>

      <Card className="p-2">
        <ul className="divide-y divide-slate-50">
          {ALL_NOTIFICATIONS.map((n, i) => {
            const meta = META[n.kind]
            const Icon = meta.icon
            return (
              <li key={i} className={`flex items-start gap-3 rounded-xl p-3 ${n.unread ? 'bg-brand-blueLight/40' : ''}`}>
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] text-slate-700">{n.title}</p>
                  <p className="text-[11px] text-slate-400">{n.time}</p>
                </div>
                {n.unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-blue" />}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

export default Notifications
