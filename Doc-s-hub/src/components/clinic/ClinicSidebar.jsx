import { NavLink, Link } from 'react-router-dom'
import {
  Home,
  CalendarDays,
  Users,
  UserPlus,
  Stethoscope,
  Clock,
  BarChart3,
  Headphones,
} from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { CLINIC_NAV } from '../../data/clinicPagesData.js'

const ICONS = { Home, CalendarDays, Users, UserPlus, Stethoscope, Clock, BarChart3 }

/** Left navigation rail for the clinic dashboard (routed). */
function ClinicSidebar() {
  return (
    <aside className="flex h-full w-64 shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="px-5 pb-4 pt-5">
        <Logo />
        <p className="ml-11 -mt-1 text-[11px] font-medium text-slate-400">
          Simplifying Healthcare
        </p>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {CLINIC_NAV.map(({ label, to, icon, end }) => {
          const Icon = ICONS[icon]
          return (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          )
        })}
      </nav>

      {/* Need help card */}
      <div className="m-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-blue text-white">
          <Headphones className="h-5 w-5" />
        </span>
        <h4 className="mt-3 text-sm font-bold text-brand-navy">Need Help?</h4>
        <p className="mt-1 text-xs leading-snug text-slate-500">
          Our support team is here to help you.
        </p>
        <Link
          to="/"
          className="mt-3 block rounded-lg bg-brand-blue py-2 text-center text-[13px] font-semibold text-white transition-colors hover:bg-brand-blueDark"
        >
          Contact Support
        </Link>
      </div>
    </aside>
  )
}

export default ClinicSidebar
