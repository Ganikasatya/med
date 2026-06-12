import { Building2, ChevronDown, Bell } from 'lucide-react'
import { CLINIC } from '../../data/clinicDashboardData.js'

/** Top bar: clinic selector (left) + notifications & admin (right). */
function ClinicTopbar() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
      {/* Clinic selector */}
      <button className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
          <Building2 className="h-5 w-5" />
        </span>
        <span className="text-[15px] font-bold text-brand-navy">{CLINIC.name}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {/* Right */}
      <div className="flex items-center gap-5">
        <button className="relative text-slate-500 hover:text-brand-blue">
          <Bell className="h-6 w-6" />
          <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {CLINIC.notifications}
          </span>
        </button>
        <button className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
            RS
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-bold text-brand-navy">{CLINIC.admin}</span>
            <span className="block text-[11px] text-slate-400">{CLINIC.role}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  )
}

export default ClinicTopbar
