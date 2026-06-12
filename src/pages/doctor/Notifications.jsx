import { UserPlus, UserCheck, BellRing, Users, CheckCheck } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { ALL_NOTIFICATIONS } from '../../data/doctorPagesData.js'

const META = {
  appt: { icon: UserPlus, tone: 'bg-blue-100 text-brand-blue' },
  arrived: { icon: UserCheck, tone: 'bg-green-100 text-green-600' },
  delay: { icon: BellRing, tone: 'bg-purple-100 text-purple-600' },
  walkin: { icon: Users, tone: 'bg-teal-100 text-teal-600' },
}

function Notifications() {
  const unread = ALL_NOTIFICATIONS.filter((n) => n.unread).length

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Notifications" subtitle={`${unread} unread · stay on top of clinic activity.`}>
        <ToolButton icon={CheckCheck}>Mark all read</ToolButton>
      </PageHeading>

      <Card>
        <ul className="divide-y divide-slate-50">
          {ALL_NOTIFICATIONS.map((n, i) => {
            const m = META[n.kind]
            const Icon = m.icon
            return (
              <li key={i} className={`flex items-start gap-3 py-3.5 ${n.unread ? '' : 'opacity-70'}`}>
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${m.tone}`}><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-bold text-brand-navy">{n.title}</p>
                  <p className="text-[12.5px] text-slate-500">{n.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  {n.unread && <span className="h-2 w-2 rounded-full bg-brand-blue" />}
                  <span className="whitespace-nowrap text-[11.5px] text-slate-400">{n.time}</span>
                </div>
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

export default Notifications
