import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Home,
  CalendarDays,
  Users,
  UserPlus,
  Stethoscope,
  Building2,
  UserCog,
  Clock,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { CLINIC_NAV } from '../../data/clinicPagesData.js'
import { useAuth } from '../../context/AuthContext.jsx'

const ICONS = { Home, CalendarDays, Users, UserPlus, Stethoscope, Building2, UserCog, Clock, BarChart3, Settings }

/** Which nav row the current route falls on — drives the glider position.
 *  Mirrors NavLink's active logic (exact match for `end`, prefix otherwise). */
function activeNavIndex(pathname) {
  const i = CLINIC_NAV.findIndex(({ to, end }) =>
    end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`),
  )
  return i < 0 ? 0 : i
}

/** Left navigation rail for the clinic dashboard (routed). */
function ClinicSidebar({ open = false, onClose }) {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { pathname } = useLocation()
  const activeIndex = activeNavIndex(pathname)
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-full w-64 shrink-0 flex-col bg-teal-900 text-teal-100/85 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Brand — logo in a white chip, same as the doctor / front-desk consoles. */}
      <div className="flex items-center gap-2.5 px-5 pb-5 pt-5">
        <span className="inline-flex items-center rounded-xl bg-white px-2.5 py-2 shadow-sm">
          <Logo className="h-9 shrink-0" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-extrabold text-white">TapCure</span>
          <span className="block text-[10px] font-medium text-teal-200/70">Clinic Console</span>
        </span>
      </div>

      <nav
        className="flex-1 overflow-y-auto px-3 py-1"
        onClick={(e) => { if (e.target.closest('a')) onClose?.() }}
      >
        {/* Glider nav: the yellow bar + glow slide to the active row. */}
        <div className="radio-container" style={{ '--total-radio': CLINIC_NAV.length }}>
          <div className="glider-container">
            <div className="glider" style={{ transform: `translateY(${activeIndex * 100}%)` }} />
          </div>
          {CLINIC_NAV.map(({ label, to, icon, end }) => {
            const Icon = ICONS[icon]
            return (
              <NavLink
                key={label}
                to={to}
                end={end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {label}
              </NavLink>
            )
          })}
        </div>
      </nav>

      {/* Logout — clears the session and returns to the public landing page. */}
      <div className="px-3 pb-3 pt-1">
        <button
          type="button"
          onClick={() => { logout(); navigate('/') }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-teal-100/80 transition-colors hover:bg-red-500/20 hover:text-red-200"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          Logout
        </button>
      </div>
    </aside>
  )
}

export default ClinicSidebar
