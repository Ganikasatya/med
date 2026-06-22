import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Menu, Bell, CalendarDays, ChevronDown } from 'lucide-react'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { notificationsApi } from '../../api'

function initialsOf(name = '') {
  const parts = name.replace(/^Dr\.?\s*/i, '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

/**
 * Doctor console top bar: menu toggle (decorative for now) + centered title,
 * with notifications, calendar and the doctor profile chip on the right.
 */
function DoctorTopbar({ onMenu }) {
  const navigate = useNavigate()
  const { doctor } = useDoctorCtx()
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true
    notificationsApi
      .history({ size: 50 })
      .then((list) => active && setUnread((list || []).filter((n) => n.status !== 'read' && !n.delivered_at).length))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

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

      {/* Center: title */}
      <div className="min-w-0 flex-1 text-center">
        <h1 className="truncate text-[22px] font-extrabold text-brand-navy">
          Doctor Mitra — Doctor Dashboard
        </h1>
        <p className="truncate text-[13px] text-slate-500">
          Manage appointments, queue, patients and clinic operations in real-time.
        </p>
      </div>

      {/* Right: actions + profile */}
      <div className="flex items-center gap-4">
        <button
          className="relative text-slate-500 hover:text-brand-blue"
          aria-label="Notifications"
          onClick={() => navigate('/doctor-dashboard/notifications')}
        >
          <Bell className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>
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
