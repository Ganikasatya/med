import { NavLink, useNavigate } from 'react-router-dom'
import { Headphones, LogOut } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { COMPOUNDER_NAV } from '../../data/compounderData.js'
import { useAuth } from '../../context/AuthContext.jsx'

function CompounderSidebar() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-[#082e60] text-white">
      <div className="bg-white px-5 py-5">
        <Logo />
      </div>
      <nav className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {COMPOUNDER_NAV.map((item, index) => {
          if (item.section) {
            return <p key={`${item.section}-${index}`} className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-wider text-blue-200">{item.section}</p>
          }
          const Icon = item.icon
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition-colors ${
                isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-50 hover:bg-white/10'
              }`}
            >
              <Icon className="h-[18px] w-[18px]" />
              {item.label}
            </NavLink>
          )
        })}
        <button onClick={handleLogout} className="mt-3 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold text-blue-50 hover:bg-red-500/20 hover:text-red-200">
          <LogOut className="h-[18px] w-[18px]" /> Logout
        </button>
      </nav>
      <div className="m-3 flex items-center gap-3 rounded-xl border border-blue-400/30 bg-white/5 p-3">
        <Headphones className="h-8 w-8 text-blue-200" />
        <div><p className="text-[13px] font-bold">Need Help?</p><p className="text-[11px] text-blue-200">Contact Support</p></div>
      </div>
    </aside>
  )
}

export default CompounderSidebar
