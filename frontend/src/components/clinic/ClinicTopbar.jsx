import { useEffect, useState } from 'react'
import { Building2, ChevronDown, Bell } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { hospitalsApi } from '../../api'
import { Avatar } from './ui.jsx'

const ROLE_LABELS = {
  HOSPITAL_ADMIN: 'Clinic Admin',
  SUPER_ADMIN: 'Super Admin',
  RECEPTIONIST: 'Receptionist',
  DOCTOR: 'Doctor',
}

/** Top bar: clinic name (left) + notifications & admin (right) — from real data. */
function ClinicTopbar() {
  const { user } = useAuth()
  const [clinic, setClinic] = useState(null)

  useEffect(() => {
    // Show the clinic this admin registered/belongs to.
    const load = user?.hospital_id
      ? hospitalsApi.get(user.hospital_id)
      : hospitalsApi.list().then((list) => (list || [])[0] || null)
    load.then(setClinic).catch(() => {})
  }, [user?.hospital_id])

  const roleLabel = ROLE_LABELS[user?.role_name] || 'Clinic Admin'

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
      {/* Clinic name */}
      <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
          <Building2 className="h-5 w-5" />
        </span>
        <span className="leading-tight">
          <span className="block text-[15px] font-bold text-brand-navy">{clinic?.name || 'My Clinic'}</span>
          {(clinic?.city || clinic?.state) && (
            <span className="block text-[11px] text-slate-400">{[clinic.city, clinic.state].filter(Boolean).join(', ')}</span>
          )}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center gap-5">
        <button className="relative text-slate-500 hover:text-brand-blue">
          <Bell className="h-6 w-6" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2.5">
          <Avatar name={user?.name || 'Admin'} className="h-9 w-9 text-sm" />
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-bold text-brand-navy">{user?.name || 'Admin'}</span>
            <span className="block text-[11px] text-slate-400">{roleLabel}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </div>
      </div>
    </header>
  )
}

export default ClinicTopbar
