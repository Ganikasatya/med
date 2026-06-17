import { useEffect, useState } from 'react'
import { Ticket, AlertTriangle, Bell, CalendarCheck, CreditCard, FlaskConical, CheckCheck } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { notificationsApi } from '../../api'
import { relativeTime } from '../../lib/format.js'
import { useI18n } from '../../i18n/index.jsx'

/** Pick an icon + tint from the notification's `type` string (best-effort match). */
function metaFor(type = '') {
  const t = type.toLowerCase()
  if (t.includes('token')) return { icon: Ticket, tone: 'bg-blue-100 text-brand-blue' }
  if (t.includes('delay')) return { icon: AlertTriangle, tone: 'bg-red-100 text-red-500' }
  if (t.includes('remind')) return { icon: Bell, tone: 'bg-green-100 text-green-600' }
  if (t.includes('appoint') || t.includes('book')) return { icon: CalendarCheck, tone: 'bg-purple-100 text-purple-600' }
  if (t.includes('pay') || t.includes('invoice')) return { icon: CreditCard, tone: 'bg-teal-100 text-teal-600' }
  if (t.includes('report') || t.includes('lab')) return { icon: FlaskConical, tone: 'bg-orange-100 text-orange-500' }
  return { icon: Bell, tone: 'bg-slate-100 text-slate-500' }
}

const isUnread = (n) => n.status !== 'read' && !n.delivered_at

/** All notifications feed, backed by GET /notification-history. */
function Notifications() {
  const { t } = useI18n()
  const { patient } = usePatientCtx()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [readLocal, setReadLocal] = useState(false) // cosmetic "mark all read"

  useEffect(() => {
    if (!patient) return
    let active = true
    notificationsApi
      .history({ patient_id: patient.patient_id, size: 100 })
      .then((list) => active && setItems(list || []))
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [patient])

  const unread = readLocal ? 0 : items.filter(isUnread).length

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title={t('ppage.notificationsTitle')}
        subtitle={loading ? t('pcommon.loading') : unread === 1 ? t('ppage.unreadOne', { n: unread }) : t('ppage.unreadMany', { n: unread })}
      >
        {unread > 0 && (
          <ToolButton icon={CheckCheck} onClick={() => setReadLocal(true)}>{t('ppage.markAllRead')}</ToolButton>
        )}
      </PageHeading>

      <Card className="p-2">
        {loading ? (
          <p className="p-4 text-sm text-slate-400">{t('pcommon.loading')}</p>
        ) : items.length === 0 ? (
          <p className="p-6 text-center text-[13.5px] text-slate-400">{t('ppage.noNotifications')}</p>
        ) : (
          <ul className="divide-y divide-slate-50">
            {items.map((n) => {
              const meta = metaFor(n.type)
              const Icon = meta.icon
              const unreadRow = !readLocal && isUnread(n)
              return (
                <li key={n.notification_id} className={`flex items-start gap-3 rounded-xl p-3 ${unreadRow ? 'bg-brand-blueLight/40' : ''}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-semibold text-slate-700">{n.title}</p>
                    {n.message && <p className="text-[12.5px] text-slate-500">{n.message}</p>}
                    <p className="text-[11px] text-slate-400">{relativeTime(n.created_at)}</p>
                  </div>
                  {unreadRow && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-blue" />}
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
