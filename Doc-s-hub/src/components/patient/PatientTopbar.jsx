import { Menu, Bell, ChevronDown, Globe } from 'lucide-react'
import { PATIENT } from '../../data/patientDashboardData.js'

/**
 * Patient console top bar: menu toggle (decorative for now) on the left;
 * language selector, notifications and the patient profile chip on the right.
 */
function PatientTopbar() {
  return (
    <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-6 py-3">
      {/* Left: menu */}
      <button
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Right: language + notifications + profile */}
      <div className="flex items-center gap-4">
        <button className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:border-slate-300">
          <Globe className="h-4 w-4 text-slate-400" />
          {PATIENT.language}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>

        <button className="relative text-slate-500 hover:text-brand-blue" aria-label="Notifications">
          <Bell className="h-6 w-6" />
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {PATIENT.notifications}
          </span>
        </button>

        <button className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-slate-50">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
            {PATIENT.initials}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-bold text-brand-navy">{PATIENT.name}</span>
            <span className="block text-[11px] text-slate-400">Patient</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  )
}

export default PatientTopbar
