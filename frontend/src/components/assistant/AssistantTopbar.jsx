import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Bell, MessageSquare, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext.jsx'
import { hospitalsApi } from '../../api'
import { Avatar } from '../clinic/ui.jsx'

const today = () =>
  new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })

/** Top bar for the Assistant console: clinic context (left) + tools + user (right). */
function AssistantTopbar() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [clinic, setClinic] = useState(null)

  useEffect(() => {
    if (!user?.hospital_id) return
    hospitalsApi.get(user.hospital_id).then(setClinic).catch(() => {})
  }, [user?.hospital_id])

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
      {/* Clinic context */}
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-brand-blue" />
        <div className="leading-tight">
          <span className="block text-[14px] font-bold text-brand-navy">{clinic?.name || 'My Clinic'}</span>
          <span className="block text-[11px] text-slate-400">
            {[clinic?.city, clinic?.state].filter(Boolean).join(', ') || 'Front desk'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <span className="hidden rounded-lg bg-slate-50 px-3 py-1.5 text-[12px] font-semibold text-slate-500 sm:block">
          {today()}
        </span>
        <button className="relative text-slate-400 hover:text-brand-blue">
          <MessageSquare className="h-5 w-5" />
        </button>
        <button onClick={() => navigate('/assistant-dashboard/notifications')} className="relative text-slate-400 hover:text-brand-blue">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-red-500" />
        </button>
        <div className="flex items-center gap-2.5 border-l border-slate-100 pl-4">
          <Avatar name={user?.name || 'Front Desk'} className="h-9 w-9 text-[12px]" />
          <span className="hidden text-left leading-tight sm:block">
            <span className="block text-[13px] font-bold text-brand-navy">{user?.name || 'Front Desk'}</span>
            <span className="block text-[11px] text-slate-400">Receptionist</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-300" />
        </div>
      </div>
    </header>
  )
}

export default AssistantTopbar
