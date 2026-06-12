import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, ChevronDown, HeartPulse, MapPin, Stethoscope, User } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import AuthModal from '../auth/AuthModal.jsx'
import { BRAND, LANGUAGES, NAV_LINKS } from '../../data/landingData.js'

const ROLES = [
  { key: 'patient', label: 'Patient', desc: 'Book doctors and get tokens', icon: User, tone: 'bg-blue-50 text-brand-blue' },
  { key: 'doctor', label: 'Doctor', desc: 'Manage patients and schedule', icon: Stethoscope, tone: 'bg-green-50 text-brand-green' },
  { key: 'clinic', label: 'Clinic', desc: 'Manage doctors and operations', icon: Building2, tone: 'bg-purple-50 text-purple-600' },
  { key: 'compounder', label: 'Compounder', desc: 'Queue, vitals and medicines', icon: HeartPulse, tone: 'bg-orange-50 text-orange-500' },
]

function RoleMenu({ mode, onSelect }) {
  return (
    <ul className="absolute right-0 top-full z-40 mt-1.5 w-64 overflow-hidden rounded-xl border border-slate-100 bg-white py-1.5 shadow-cardHover">
      {ROLES.map(({ key, label, desc, icon: Icon, tone }) => (
        <li key={key}>
          <button onClick={() => onSelect(key, mode)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50">
            <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-brand-navy">{label}</span>
              <span className="block text-[11px] text-slate-400">{desc}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

function Navbar() {
  const navigate = useNavigate()
  const [langOpen, setLangOpen] = useState(false)
  const [language, setLanguage] = useState(LANGUAGES[0])
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [auth, setAuth] = useState({ open: false, role: 'patient', mode: 'login' })
  const langRef = useRef(null)
  const loginRef = useRef(null)
  const signupRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false)
      if (loginRef.current && !loginRef.current.contains(e.target)) setLoginOpen(false)
      if (signupRef.current && !signupRef.current.contains(e.target)) setSignupOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const role = new URLSearchParams(window.location.search).get('auth')
    if (['patient', 'doctor', 'compounder'].includes(role)) {
      setAuth({ open: true, role, mode: 'login' })
    }
  }, [])

  const openAuth = (role, mode) => {
    setLoginOpen(false)
    setSignupOpen(false)
    if (role === 'clinic') {
      navigate(mode === 'login' ? '/clinic-login' : '/clinic-signup')
      return
    }
    setAuth({ open: true, role, mode })
  }

  return (
    <header className="z-30 flex h-20 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-8">
      <div className="flex items-center gap-6">
        <Logo />
        <div className="hidden items-center gap-2 border-l border-slate-200 pl-6 lg:flex">
          <MapPin className="h-5 w-5 text-brand-green" />
          <div className="leading-tight">
            <div className="flex items-center gap-1 text-[15px] font-bold text-brand-navy">{BRAND.city}<ChevronDown className="h-4 w-4 text-slate-400" /></div>
            <button className="text-xs text-slate-400 hover:text-brand-blue">Change City</button>
          </div>
        </div>
      </div>

      <nav className="hidden items-center gap-8 xl:flex">
        {NAV_LINKS.map((link) => <button key={link} className="text-[15px] font-medium text-slate-700 hover:text-brand-blue">{link}</button>)}
      </nav>

      <div className="flex items-center gap-3">
        <div className="relative hidden lg:block" ref={langRef}>
          <button onClick={() => setLangOpen((o) => !o)} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-[14px] font-medium text-brand-navy">
            {language}<ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
          </button>
          {langOpen && <ul className="absolute right-0 top-full z-40 mt-1 w-36 rounded-lg border border-slate-100 bg-white py-1 shadow-cardHover">
            {LANGUAGES.map((lang) => <li key={lang}><button onClick={() => { setLanguage(lang); setLangOpen(false) }} className="block w-full px-4 py-2 text-left text-sm hover:bg-brand-blueLight">{lang}</button></li>)}
          </ul>}
        </div>

        <div className="relative" ref={loginRef}>
          <button onClick={() => { setLoginOpen((o) => !o); setSignupOpen(false) }} className="flex items-center gap-2 rounded-lg border border-brand-blue px-4 py-2 text-[15px] font-semibold text-brand-blue hover:bg-brand-blueLight">
            Login<ChevronDown className={`h-4 w-4 transition-transform ${loginOpen ? 'rotate-180' : ''}`} />
          </button>
          {loginOpen && <RoleMenu mode="login" onSelect={openAuth} />}
        </div>

        <div className="relative" ref={signupRef}>
          <button onClick={() => { setSignupOpen((o) => !o); setLoginOpen(false) }} className="flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-[15px] font-semibold text-white hover:bg-brand-blueDark">
            Sign up<ChevronDown className={`h-4 w-4 transition-transform ${signupOpen ? 'rotate-180' : ''}`} />
          </button>
          {signupOpen && <RoleMenu mode="signup" onSelect={openAuth} />}
        </div>
      </div>

      <AuthModal
        open={auth.open}
        role={auth.role}
        initialMode={auth.mode}
        lockMode
        onClose={() => setAuth((a) => ({ ...a, open: false }))}
      />
    </header>
  )
}

export default Navbar
