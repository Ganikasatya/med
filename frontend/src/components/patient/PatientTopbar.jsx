import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Menu, Bell, ChevronDown, Globe, Sun, Moon } from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { notificationsApi } from '../../api'
import { useI18n, LANGS } from '../../i18n/index.jsx'

/** Build initials from a full name, e.g. "Ravi Kumar" -> "RK". */
function initialsOf(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
}

/** Time-of-day greeting i18n key. */
function greetingKey() {
  const h = new Date().getHours()
  if (h < 12) return 'pdash.greetingMorning'
  if (h < 17) return 'pdash.greetingAfternoon'
  return 'pdash.greetingEvening'
}

/**
 * Patient console top bar: menu toggle (decorative for now) on the left;
 * language selector, notifications and the patient profile chip on the right.
 * Backed by the logged-in patient record from PatientContext.
 */
function PatientTopbar({ onMenu, dark, onToggleTheme }) {
  const navigate = useNavigate()
  const { patient } = usePatientCtx()
  const { t, lang, setLang } = useI18n()
  const [unread, setUnread] = useState(0)
  const [langOpen, setLangOpen] = useState(false)

  useEffect(() => {
    if (!patient) return
    let active = true
    notificationsApi
      .history({ patient_id: patient.patient_id, size: 50 })
      .then((list) => {
        if (!active) return
        // No per-row "read" flag in the API yet; treat undelivered as unread.
        setUnread((list || []).filter((n) => n.status !== 'read' && !n.delivered_at).length)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [patient])

  const name = patient?.name || t('pnav.patient')

  return (
    <header className="relative flex shrink-0 items-center justify-between gap-4 border-b border-slate-100 bg-white px-4 py-2.5 sm:px-6">
      {/* Left: menu (mobile) + logo */}
      <div className="flex items-center gap-2">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50 lg:hidden"
          aria-label="Toggle menu"
          onClick={onMenu}
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link to="/patient-dashboard" className="flex items-center">
          <Logo className="h-10" />
        </Link>
      </div>

      {/* Greeting — centered in the topbar (moved up from the dashboard page) */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 text-center lg:block">
        <p className="text-[22px] font-extrabold leading-tight text-brand-navy">
          {t(greetingKey())}, {name}
        </p>
        <p className="text-[13px] text-slate-500">{t('pdash.greetingLine')}</p>
      </div>

      {/* Right: language + notifications + profile */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-[13px] font-semibold text-slate-600 hover:border-slate-300"
          >
            <Globe className="h-4 w-4 text-slate-400" />
            {LANGS[lang].label}
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          {langOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setLangOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-36 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                {Object.entries(LANGS).map(([code, { label }]) => (
                  <button
                    key={code}
                    onClick={() => { setLang(code); setLangOpen(false) }}
                    className={`block w-full px-3 py-1.5 text-left text-[13px] font-semibold hover:bg-slate-50 ${
                      lang === code ? 'text-brand-blue' : 'text-slate-600'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <button
          onClick={onToggleTheme}
          className="text-slate-500 hover:text-brand-blue"
          aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={dark ? 'Light mode' : 'Dark mode'}
        >
          {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>

        <button
          className="relative text-slate-500 hover:text-brand-blue"
          aria-label="Notifications"
          onClick={() => navigate('/patient-dashboard/notifications')}
        >
          <Bell className="h-6 w-6" />
          {unread > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unread}
            </span>
          )}
        </button>

        <button
          className="flex items-center gap-2.5 rounded-xl px-1.5 py-1 hover:bg-slate-50"
          onClick={() => navigate('/patient-dashboard/profile')}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">
            {initialsOf(name)}
          </span>
          <span className="text-left leading-tight">
            <span className="block text-[13px] font-bold text-brand-navy">{name}</span>
            <span className="block text-[11px] text-slate-400">{t('pnav.patient')}</span>
          </span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  )
}

export default PatientTopbar
