import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, BellRing, CalendarDays, ChevronDown, Sun, Moon, UserPlus, CheckCircle2 } from 'lucide-react'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { notificationsApi } from '../../api'
import { relativeTime } from '../../lib/format.js'

function initialsOf(name = '') {
  const parts = name.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

/** Time-of-day greeting. */
function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Ensure the doctor's name reads with a "Dr." prefix. */
function withDr(name = '') {
  const n = name.trim()
  if (!n) return 'Doctor'
  return /^dr\.?\s/i.test(n) ? n : `Dr. ${n}`
}

/** Icon + tint for a notification, keyed off its type. */
function notifMeta(type = '') {
  const t = type.toLowerCase()
  if (t.includes('delay')) return { icon: BellRing, tone: 'bg-purple-100 text-purple-600' }
  if (t.includes('arriv') || t.includes('check')) return { icon: CheckCircle2, tone: 'bg-green-100 text-green-600' }
  if (t.includes('appoint') || t.includes('book') || t.includes('walk')) return { icon: UserPlus, tone: 'bg-blue-100 text-brand-blue' }
  return { icon: Bell, tone: 'bg-slate-100 text-slate-500' }
}

// Notifications are ephemeral in the bell: once seen they're remembered here
// (localStorage) so they don't reappear. The DB copy is a separate backend concern.
const DISMISS_KEY = 'doctor-seen-notifs'
function loadDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) || '[]')) } catch { return new Set() }
}

/**
 * Doctor console top bar: menu toggle (decorative for now) + centered title,
 * with notifications, calendar and the doctor profile chip on the right.
 */
function DoctorTopbar({ onMenu, dark, onToggleTheme }) {
  const navigate = useNavigate()
  const { doctor } = useDoctorCtx()
  const [notifs, setNotifs] = useState([])
  const [notifOpen, setNotifOpen] = useState(false)
  const [dismissed, setDismissed] = useState(loadDismissed)   // seen notification ids

  useEffect(() => {
    let active = true
    notificationsApi
      .history({ size: 50 })
      .then((list) => { if (active) setNotifs(list || []) })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  // Only notifications not yet seen. When the bell closes they're marked seen
  // (persisted locally) and won't reappear — a temporary, vanish-on-view bell.
  const visible = notifs.filter((n) => !dismissed.has(String(n.notification_id)))
  const unread = visible.length

  const closeNotifs = () => {
    if (visible.length) {
      setDismissed((prev) => {
        const next = new Set(prev)
        visible.forEach((n) => next.add(String(n.notification_id)))
        try { localStorage.setItem(DISMISS_KEY, JSON.stringify([...next])) } catch { /* ignore */ }
        return next
      })
    }
    setNotifOpen(false)
  }

  const name = doctor?.name || 'Doctor'
  const specialty = doctor?.specialization || ''

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-3">
      {/* Left: menu + title */}
      <div className="flex min-w-0 items-center gap-4">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
          aria-label="Toggle menu"
          onClick={onMenu}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Center: personalised greeting */}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-[22px] font-extrabold text-brand-navy">
          {greeting()}, {withDr(name)}
        </h1>
        <p className="truncate text-[13px] text-slate-500">
          Here&apos;s what&apos;s happening at your clinic today.
        </p>
      </div>

      {/* Right: actions + profile */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleTheme}
          className="text-slate-500 hover:text-brand-blue"
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun className="h-6 w-6" /> : <Moon className="h-6 w-6" />}
        </button>
        <div className="relative">
          <button
            className="relative text-slate-500 hover:text-brand-blue"
            aria-label="Notifications"
            onClick={() => (notifOpen ? closeNotifs() : setNotifOpen(true))}
          >
            <Bell className="h-6 w-6" />
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unread}
              </span>
            )}
          </button>
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={closeNotifs} aria-hidden="true" />
              <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <h4 className="text-[14px] font-bold text-brand-navy">Notifications</h4>
                  {unread > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-600">{unread} new</span>}
                </div>
                <ul className="max-h-96 overflow-auto p-1.5">
                  {visible.length === 0 ? (
                    <li className="py-8 text-center text-[13px] text-slate-400">You&apos;re all caught up.</li>
                  ) : (
                    visible.slice(0, 12).map((n) => {
                      const meta = notifMeta(n.type)
                      const Icon = meta.icon
                      return (
                        <li key={n.notification_id} className="flex gap-3 rounded-xl px-3 py-2.5 hover:bg-slate-50">
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}><Icon className="h-4 w-4" /></span>
                          <div className="min-w-0 flex-1 leading-tight">
                            <p className="text-[13px] font-bold text-brand-navy">{n.title}</p>
                            <p className="truncate text-[12px] text-slate-500">{n.message}</p>
                            <p className="mt-0.5 text-[11px] text-slate-400">{relativeTime(n.created_at)}</p>
                          </div>
                        </li>
                      )
                    })
                  )}
                </ul>
                <button
                  onClick={() => { closeNotifs(); navigate('/doctor-dashboard/notifications') }}
                  className="w-full border-t border-slate-100 py-2.5 text-center text-[13px] font-semibold text-brand-blue hover:bg-slate-50"
                >
                  View all
                </button>
              </div>
            </>
          )}
        </div>
        <button className="text-slate-500 hover:text-brand-blue" aria-label="Calendar" onClick={() => navigate('/doctor-dashboard/today')}>
          <CalendarDays className="h-6 w-6" />
        </button>
        <button
          className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-slate-50"
          onClick={() => navigate('/doctor-dashboard/profile')}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
            {initialsOf(name)}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-bold text-brand-navy">{name}</span>
            <span className="block text-[11px] text-slate-400">{specialty}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  )
}

export default DoctorTopbar
