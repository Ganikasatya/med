import { NavLink, Link } from 'react-router-dom'
import {
  Home, CalendarDays, Users, UserRound, Building2, FileText, FolderHeart,
  CreditCard, Bell, Settings, LifeBuoy, LogOut, Headphones,
} from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { PATIENT_NAV } from '../../data/patientNav.js'

const ICONS = {
  Home, CalendarDays, Users, UserRound, Building2, FileText, FolderHeart,
  CreditCard, Bell, Settings, LifeBuoy,
}

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

/** Left navigation rail for the patient console. */
function PatientSidebar() {
  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-slate-100 bg-white">
      <div className="px-5 pb-3 pt-5">
        <Logo />
      </div>

      <nav className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-2">
        <div className="space-y-0.5">
          {PATIENT_NAV.map((item) => <NavItem key={item.label} {...item} />)}
        </div>

        {/* Logout — returns to the public landing page. */}
        <Link
          to="/"
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">Logout</span>
        </Link>
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

export default PatientSidebar
