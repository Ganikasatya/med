import { useEffect, useState } from 'react'
import { AlertTriangle, Bell, CheckCheck, RefreshCw } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { notificationsApi } from '../../api'
import { relativeTime } from '../../lib/format.js'

const metaFor = (type = '') => {
  const t = type.toLowerCase()
  if (t.includes('delay')) return { icon: AlertTriangle, tone: 'bg-amber-100 text-amber-600' }
  return { icon: Bell, tone: 'bg-slate-100 text-slate-500' }
}

const isUnread = (n) => n.status !== 'read' && !n.delivered_at

function AssistantNotifications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [readLocal, setReadLocal] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      setItems(await notificationsApi.history({ size: 100 }))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const unread = readLocal ? 0 : items.filter(isUnread).length

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Notifications" subtitle={loading ? 'Loading alerts...' : `${unread} unread alert${unread === 1 ? '' : 's'}`}>
        {unread > 0 && <ToolButton icon={CheckCheck} onClick={() => setReadLocal(true)}>Mark read</ToolButton>}
        <ToolButton icon={RefreshCw} onClick={load}>Refresh</ToolButton>
      </PageHeading>

      <Card className="p-2">
        {loading ? (
          <p className="p-4 text-sm text-slate-400">Loading...</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-[13.5px] text-slate-400">No notifications yet.</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {items.map((n) => {
              const meta = metaFor(n.type)
              const Icon = meta.icon
              const unreadRow = !readLocal && isUnread(n)
              return (
                <li key={n.notification_id} className={`flex items-start gap-3 rounded-xl p-3 ${unreadRow ? 'bg-amber-50/70' : ''}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-brand-navy">{n.title || 'Notification'}</p>
                    {n.message && <p className="text-[12.5px] text-slate-500">{n.message}</p>}
                    <p className="mt-0.5 text-[11px] text-slate-400">{relativeTime(n.created_at)}</p>
                  </div>
                  {unreadRow && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}

export default AssistantNotifications
