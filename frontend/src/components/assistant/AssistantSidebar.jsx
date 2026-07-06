import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, ListChecks, UserPlus, CalendarDays, Users, Search,
  Activity, FlaskConical, Pill, MessageSquare, Bell, LogOut, Headphones,
} from 'lucide-react'
import { ASSISTANT_NAV } from '../../data/assistantNav.js'
import { useAuth } from '../../context/AuthContext.jsx'
import Logo from '../common/Logo.jsx'

const ICONS = {
  LayoutDashboard, ListChecks, UserPlus, CalendarDays, Users, Search,
  Activity, FlaskConical, Pill, MessageSquare, Bell,
}

/** Left navigation rail for the Assistant console — deep teal, grouped sections. */
function AssistantSidebar({ open = false, onClose }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-full w-56 shrink-0 flex-col bg-teal-900 text-teal-100/85 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand — same app icon used on the public landing page. */}
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <Logo className="h-12 shrink-0 drop-shadow-[0_6px_14px_rgba(0,0,0,0.25)]" />
        <div className="leading-tight">
          <span className="block text-[15px] font-extrabold text-white">TapCure</span>
          <span className="block text-[10px] font-medium text-teal-200/70">Front Desk Console</span>
        </div>
      </div>

      {/* Grouped nav */}
      <nav
        className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3 pb-4"
        onClick={(e) => { if (e.target.closest('a')) onClose?.() }}
      >
        {ASSISTANT_NAV.map((group, gi) => (
          <div key={gi}>
            {group.section && (
              <p className="px-3 pb-1.5 pt-1 text-[10px] font-bold uppercase tracking-wider text-teal-300/70">
                {group.section}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(({ label, to, icon, end, soon }) => {
                const Icon = ICONS[icon] || LayoutDashboard
                return (
                  <NavLink
                    key={label}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition-all ${
                        isActive
                          ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-teal-900 shadow-md shadow-black/25'
                          : 'text-teal-100/80 hover:bg-white/10 hover:text-white'
                      }`
                    }
                  >
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    <span className="flex-1 truncate">{label}</span>
                    {soon && (
                      <span className="rounded-full bg-white/15 px-1.5 py-0.5 text-[9px] font-semibold text-teal-100">soon</span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Need help card */}
      <div className="mx-3 mb-2 rounded-2xl bg-white/10 p-3.5">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-teal-100">
            <Headphones className="h-4 w-4" />
          </span>
          <div className="leading-tight">
            <p className="text-[12px] font-bold text-white">Need Help?</p>
            <p className="text-[10px] text-teal-200/70">Contact Support</p>
          </div>
        </div>
      </div>

      <button
        onClick={() => { logout(); navigate('/') }}
        className="mx-3 mb-3 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold text-teal-100/80 transition-colors hover:bg-red-500/20 hover:text-red-200"
      >
        <LogOut className="h-[18px] w-[18px]" />
        Log out
      </button>
    </aside>
  )
}

export default AssistantSidebar
