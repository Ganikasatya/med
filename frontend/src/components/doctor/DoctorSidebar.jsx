import { useState } from 'react'
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Home,
  CalendarDays,
  ClipboardList,
  UserPlus,
  CircleSlash,
  Users,
  History,
  BellRing,
  Clock,
  CalendarOff,
  IndianRupee,
  UsersRound,
  BarChart3,
  PieChart,
  Bell,
  MessageSquare,
  Building2,
  UserCog,
  Settings,
  Headphones,
  ChevronDown,
  ChevronUp,
  LogOut,
} from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { DOCTOR_NAV } from '../../data/doctorNav.js'
import { useAuth } from '../../context/AuthContext.jsx'

const ICONS = {
  Home, CalendarDays, ClipboardList, UserPlus, CircleSlash, Users, History,
  BellRing, Clock, CalendarOff, IndianRupee, UsersRound, BarChart3, PieChart,
  Bell, MessageSquare, Building2, UserCog, Settings,
}

/**
 * The handful of most-used destinations shown by default. The rest of the
 * menu is revealed with "Show all".
 */
const QUICK_NAV = [
  { label: 'Dashboard', to: '', icon: 'Home', end: true },
  { label: "Today's Appointments", to: 'today', icon: 'CalendarDays' },
  { label: 'Live OP Queue', to: 'queue', icon: 'Users' },
  { label: 'My Availability', to: 'availability', icon: 'Clock' },
  { label: 'Patient List', to: 'patients', icon: 'UsersRound' },
  { label: 'Reports', to: 'reports', icon: 'BarChart3' },
  { label: 'Notifications', to: 'notifications', icon: 'Bell' },
]
const QUICK_PATHS = QUICK_NAV.map((i) => i.to)
const TOTAL_ITEMS = DOCTOR_NAV.reduce((n, g) => n + g.items.length, 0)
const MORE_COUNT = TOTAL_ITEMS - QUICK_NAV.length

const linkClass = ({ isActive }) =>
  `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-colors ${
    isActive ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'
  }`

function NavItem({ label, to, icon, end }) {
  const Icon = ICONS[icon]
  return (
    <NavLink to={to} end={end} className={linkClass}>
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

/** Left navigation rail for the doctor console (quick list + "Show all"). */
function DoctorSidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const current = pathname.replace('/doctor-dashboard', '').replace(/^\//, '')
  // If the active page is one of the hidden items, start expanded so it shows.
  const [showAll, setShowAll] = useState(!QUICK_PATHS.includes(current))

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="px-5 pb-3 pt-5">
        <Logo />
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-2">
        {showAll ? (
          /* Full grouped menu */
          <div className="space-y-3">
            {DOCTOR_NAV.map((group, gi) => (
              <div key={group.section ?? `g${gi}`}>
                {group.section && (
                  <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.section}
                  </p>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => <NavItem key={item.label} {...item} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Compact quick list */
          <div className="space-y-0.5">
            {QUICK_NAV.map((item) => <NavItem key={item.label} {...item} />)}
          </div>
        )}

        {/* Show all / Show less toggle */}
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 px-3 py-2 text-[12.5px] font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight/40"
        >
          {showAll ? (
            <>
              <ChevronUp className="h-4 w-4" /> Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-4 w-4" /> Show all ({MORE_COUNT} more)
            </>
          )}
        </button>

        {/* Logout — clears the session and returns to the public landing page. */}
        <button
          type="button"
          onClick={() => { logout(); navigate('/') }}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" /> Logout
        </button>
      </nav>

      {/* Need help card */}
      <div className="m-3 flex items-center gap-3 rounded-2xl border border-slate-100 bg-brand-blueLight/60 p-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue text-white">
          <Headphones className="h-[18px] w-[18px]" />
        </span>
        <div className="leading-tight">
          <h4 className="text-[13px] font-bold text-brand-navy">Need Help?</h4>
          <Link to="/" className="text-[12px] font-semibold text-brand-blue hover:underline">
            Contact Support
          </Link>
        </div>
      </div>
    </aside>
  )
}

export default DoctorSidebar
