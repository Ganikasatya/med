import { useEffect, useState } from 'react'
import { UserPlus, UserCheck, BellRing, Users, CheckCheck, Bell } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { notificationsApi } from '../../api'
import { relativeTime } from '../../lib/format.js'

function metaFor(type = '') {
  const t = type.toLowerCase()
  if (t.includes('walk')) return { icon: Users, tone: 'bg-teal-100 text-teal-600' }
  if (t.includes('delay')) return { icon: BellRing, tone: 'bg-purple-100 text-purple-600' }
  if (t.includes('arriv') || t.includes('check')) return { icon: UserCheck, tone: 'bg-green-100 text-green-600' }
  if (t.includes('appoint') || t.includes('book')) return { icon: UserPlus, tone: 'bg-blue-100 text-brand-blue' }
  return { icon: Bell, tone: 'bg-slate-100 text-slate-500' }
}

const isUnread = (n) => n.status !== 'read' && !n.delivered_at

function Notifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [readLocal, setReadLocal] = useState(false)

  useEffect(() => {
    let active = true
    notificationsApi
      .history({ size: 100 })
      .then((list) => active && setItems(list || []))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [])

  const unread = readLocal ? 0 : items.filter(isUnread).length

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Notifications" subtitle={loading ? 'Loading…' : `${unread} unread · stay on top of clinic activity.`}>
        {unread > 0 && <ToolButton icon={CheckCheck} onClick={() => setReadLocal(true)}>Mark all read</ToolButton>}
      </PageHeading>

      <Card>
        {loading ? (
          <p className="p-4 text-sm text-slate-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-[13.5px] text-slate-400">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {items.map((n) => {
              const m = metaFor(n.type)
              const Icon = m.icon
              const unreadRow = !readLocal && isUnread(n)
              return (
                <li key={n.notification_id} className={`flex items-start gap-3 py-3.5 ${unreadRow ? '' : 'opacity-70'}`}>
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${m.tone}`}><Icon className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-brand-navy">{n.title}</p>
                    <p className="text-[12.5px] text-slate-500">{n.message}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {unreadRow && <span className="h-2 w-2 rounded-full bg-brand-blue" />}
                    <span className="whitespace-nowrap text-[11.5px] text-slate-400">{relativeTime(n.created_at)}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default Notifications
