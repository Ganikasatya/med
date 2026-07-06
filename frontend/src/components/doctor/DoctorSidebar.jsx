import { NavLink, Link, useNavigate } from 'react-router-dom'
import {
  Home, ClipboardList, Users, Clock, BarChart3, PieChart, History,
  Building2, Settings, Headphones, LogOut,
} from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { DOCTOR_NAV } from '../../data/doctorNav.js'
import { useAuth } from '../../context/AuthContext.jsx'

const ICONS = {
  Home, ClipboardList, Users, Clock, BarChart3, PieChart, History, Building2, Settings,
}

const linkClass = ({ isActive }) =>
  `flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold transition-all ${
    isActive
      ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 text-teal-900 shadow-md shadow-black/25'
      : 'text-teal-100/80 hover:bg-white/10 hover:text-white'
  }`

function NavItem({ label, to, icon, end }) {
  const Icon = ICONS[icon]
  return (
    <NavLink to={to} end={end} className={linkClass}>
      {Icon && <Icon className="h-[18px] w-[18px] shrink-0" />}
      <span className="truncate">{label}</span>
    </NavLink>
  )
}

/** Left navigation rail for the doctor console (full grouped menu). */
function DoctorSidebar({ open = false, onClose }) {
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-full w-60 shrink-0 flex-col bg-teal-900 text-teal-100/85 transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="px-4 pb-3 pt-5">
        <span className="inline-flex items-center rounded-xl bg-white px-3 py-2 shadow-sm">
          <Logo className="h-9" />
        </span>
      </div>

      <nav
        className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-2"
        onClick={(e) => { if (e.target.closest('a')) onClose?.() }}
      >
        <div className="space-y-3">
          {DOCTOR_NAV.map((group, gi) => (
            <div key={group.section ?? `g${gi}`}>
              {group.section && (
                <p className="px-3 pb-1 pt-1 text-[10px] font-bold uppercase tracking-wider text-teal-200/60">
                  {group.section}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => <NavItem key={item.label} {...item} />)}
              </div>
            </div>
          ))}
        </div>

        {/* Logout — clears the session and returns to the public landing page. */}
        <button
          type="button"
          onClick={() => { logout(); navigate('/') }}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold text-teal-100/80 transition-colors hover:bg-red-500/20 hover:text-red-200"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" /> Logout
        </button>
      </nav>

      {/* Need help card */}
      <div className="m-3 flex items-center gap-3 rounded-2xl bg-white/10 p-3.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 text-teal-100">
          <Headphones className="h-[18px] w-[18px]" />
        </span>
        <div className="leading-tight">
          <h4 className="text-[13px] font-bold text-white">Need Help?</h4>
          <Link to="/" className="text-[12px] font-semibold text-teal-200/70 hover:text-teal-100">
            Contact Support
          </Link>
        </div>
      </div>
    </aside>
  )
}

export default DoctorSidebar
