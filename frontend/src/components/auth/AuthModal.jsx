import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import {
  X,
  User,
  Lock,
  Mail,
  Phone,
  MapPin,
  Stethoscope,
  ShieldCheck,
  Ticket,
  CalendarCheck,
  ClipboardList,
  Sparkles,
} from 'lucide-react'
import { TextInput, PasswordInput, SelectInput, Checkbox, Banner } from '../common/FormControls.jsx'
import { AUTH_ROLES, DUMMY, CITIES, SPECIALIZATIONS } from '../../data/authData.js'
import { useAuth } from '../../context/AuthContext.jsx'
import { useI18n } from '../../i18n/index.jsx'
import PatientVoiceAuth from './PatientVoiceAuth.jsx'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const mobileRe = /^\d{10}$/

// Editorial promo content for the split panel (matches the reference designs).
const PATIENT_PROMO = {
  badge: 'For patients & families',
  title: 'Your health journey starts here',
  subtitle: 'Book doctors, get tokens, and avoid long waiting queues.',
  features: [
    { icon: ShieldCheck, title: 'Verified doctors', desc: 'Trusted & experienced doctors you can rely on.' },
    { icon: Ticket, title: 'Instant token booking', desc: 'Get tokens in seconds and skip the long lines.' },
    { icon: CalendarCheck, title: 'Family health records', desc: 'One place for everyone you care for.' },
  ],
}
const DOCTOR_PROMO = {
  badge: 'For clinicians',
  title: 'Care for more patients, effortlessly',
  subtitle: 'Manage appointments, tokens and patient history in one place.',
  features: [
    { icon: CalendarCheck, title: 'Smart appointments', desc: 'Organise your day and reduce no-shows.' },
    { icon: Ticket, title: 'Live token queue', desc: 'Call patients in order, skip the chaos.' },
    { icon: ClipboardList, title: 'Patient history', desc: 'Access visit history securely, anytime.' },
  ],
}

/**
 * Premium split auth modal used for BOTH patient and doctor roles.
 * Left = gradient promo panel; right = Login / Sign up tabs (+ OTP flow).
 *
 * Rendered through a portal to <body> so the homepage's scale() transform
 * never shrinks or clips it.
 */
function AuthModal({ open, onClose, role = 'patient', initialMode = 'login' }) {
  const cfg = AUTH_ROLES[role]
  const promo = role === 'patient' ? PATIENT_PROMO : DOCTOR_PROMO
  const navigate = useNavigate()
  const { login, register, homeFor } = useAuth()
  const { t } = useI18n()

  const [mode, setMode] = useState(initialMode) // 'login' | 'signup'
  const [otp, setOtp] = useState(null) // null | 'enter' | 'sent'
  const [form, setForm] = useState({})
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null) // { type, msg }

  // Reset to a clean state whenever the modal (re)opens.
  useEffect(() => {
    if (open) {
      setMode(initialMode)
      setOtp(null)
      setForm({})
      setErrors({})
      setBanner(null)
    }
  }, [open, initialMode, role])

  // Lock body scroll + close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const finish = (u) => {
    setBanner({ type: 'success', msg: 'Success! Redirecting to your dashboard…' })
    setTimeout(() => {
      onClose()
      navigate(homeFor(u.role_name))
    }, 600)
  }

  /* ---------------- Password login ---------------- */
  const handleLogin = async (e) => {
    e.preventDefault()
    const err = {}
    if (!form.idf?.trim()) err.idf = 'Required'
    if (!form.password?.trim()) err.password = 'Required'
    setErrors(err)
    if (Object.keys(err).length) return

    try {
      const u = await login(form.idf.trim(), form.password)
      finish(u)
    } catch (e2) {
      setBanner({
        type: 'error',
        msg: e2.status === 401 ? 'Invalid credentials. Try the demo login below.' : e2.message || 'Login failed',
      })
    }
  }

  /* ---------------- OTP login (not enabled on the backend yet) ---------------- */
  const sendOtp = () => {
    if (!mobileRe.test(form.otpMobile || '')) {
      setErrors({ otpMobile: 'Enter a valid 10-digit mobile number' })
      return
    }
    setErrors({})
    setOtp('sent')
    setBanner({ type: 'success', msg: `OTP sent to +91 ${form.otpMobile} (demo)` })
  }
  const verifyOtp = () => {
    setBanner({ type: 'error', msg: 'OTP login is coming soon — please use email + password.' })
  }

  /* ---------------- Signup ---------------- */
  const handleSignup = async (e) => {
    e.preventDefault()
    const err = {}
    if (!form.fullName?.trim()) err.fullName = 'Required'
    if (!mobileRe.test(form.mobile || '')) err.mobile = 'Enter a valid 10-digit number'
    if (!emailRe.test(form.email || '')) err.email = 'Enter a valid email'
    if (role === 'patient' && !form.city) err.city = 'Select your city'
    if (role === 'doctor' && !form.specialization) err.specialization = 'Select specialization'
    if (!form.password?.trim()) err.password = 'Required'
    else if (form.password.length < 6) err.password = 'Min 6 characters'
    if (form.confirm !== form.password) err.confirm = 'Passwords do not match'
    if (!form.terms) err.terms = 'Please accept the terms'
    setErrors(err)
    if (Object.keys(err).length) return

    if (role !== 'patient') {
      setBanner({ type: 'error', msg: 'Doctor accounts are created by your hospital. Please log in instead.' })
      return
    }
    try {
      const u = await register({
        name: form.fullName,
        email: form.email,
        phone: form.mobile,
        password: form.password,
        city: form.city,
      })
      finish(u)
    } catch (e2) {
      setBanner({ type: 'error', msg: e2.message || 'Sign up failed' })
    }
  }

  const TabBtn = ({ value, children }) => (
    <button
      type="button"
      onClick={() => {
        setMode(value)
        setOtp(null)
        setErrors({})
        setBanner(null)
      }}
      className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-colors ${
        mode === value ? 'bg-brand-blue text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      {children}
    </button>
  )

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="theme-patient relative flex max-h-[94vh] w-full max-w-[1120px] overflow-hidden rounded-3xl bg-white shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Left promo panel — brand teal→green (matches landing, patient & doctor) */}
        <div className="relative hidden w-[46%] flex-col justify-center overflow-hidden bg-gradient-to-br from-[#0f766e] via-[#0d9488] to-[#16a34a] p-11 text-white md:flex">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-[13px] font-semibold text-green-100 ring-1 ring-white/15">
            <Sparkles className="h-4 w-4" /> {promo.badge}
          </span>
          <h3 className="mt-8 font-serif text-[2.7rem] leading-[1.08] text-white">{promo.title}</h3>
          <p className="mt-4 text-[15px] text-green-100/80">{promo.subtitle}</p>
          <ul className="mt-10 space-y-6">
            {promo.features.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/15">
                  <Icon className="h-6 w-6 text-white" />
                </span>
                <div>
                  <p className="text-base font-bold text-white">{title}</p>
                  <p className="text-[13px] leading-snug text-green-100/70">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right form panel */}
        <div className="flex w-full flex-col overflow-y-auto p-9 md:w-[58%] md:p-10">
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#d9f2e6] text-[#0f766e]">
              {role === 'patient' ? <User className="h-8 w-8" /> : <Stethoscope className="h-8 w-8" />}
            </span>
            <h2 className="mt-4 font-serif text-4xl text-brand-navy">
              {role === 'patient' ? t('auth.title') : cfg[mode].title}
            </h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              {role === 'patient' ? t('auth.subtitle') : cfg[mode].subtitle}
            </p>
          </div>

          {role === 'patient' ? (
            <PatientVoiceAuth onClose={onClose} />
          ) : (
          <>
          {/* Tabs */}
          <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
            {mode === 'signup' ? (
              <>
                <TabBtn value="signup">Sign up</TabBtn>
                <TabBtn value="login">Login</TabBtn>
              </>
            ) : (
              <>
                <TabBtn value="login">Login</TabBtn>
                <TabBtn value="signup">Sign up</TabBtn>
              </>
            )}
          </div>

          {banner && (
            <div className="mb-3">
              <Banner type={banner.type}>{banner.msg}</Banner>
            </div>
          )}

          {/* LOGIN */}
          {mode === 'login' && !otp && (
            <form onSubmit={handleLogin} className="space-y-3">
              <TextInput
                icon={User}
                placeholder="Email or Mobile Number"
                value={form.idf || ''}
                onChange={set('idf')}
                error={errors.idf}
              />
              <PasswordInput
                icon={Lock}
                placeholder="Password"
                value={form.password || ''}
                onChange={set('password')}
                error={errors.password}
              />
              <button className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark">
                Login
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtp('enter')
                  setBanner(null)
                  setErrors({})
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-brand-blue py-3 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight"
              >
                <Phone className="h-4 w-4" />
                Continue with OTP
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setBanner({ type: 'success', msg: 'Password reset link sent (demo).' })}
                  className="text-[13px] font-medium text-brand-blue hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <DemoHint role={role} />
            </form>
          )}

          {/* OTP */}
          {mode === 'login' && otp && (
            <div className="space-y-3">
              {otp === 'enter' ? (
                <>
                  <TextInput
                    icon={Phone}
                    prefix="+91"
                    placeholder="Mobile Number"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.otpMobile || ''}
                    onChange={set('otpMobile')}
                    error={errors.otpMobile}
                  />
                  <button
                    onClick={sendOtp}
                    className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blueDark"
                  >
                    Send OTP
                  </button>
                </>
              ) : (
                <>
                  <TextInput
                    icon={ShieldCheck}
                    placeholder="Enter 6-digit OTP"
                    inputMode="numeric"
                    maxLength={6}
                    value={form.otpCode || ''}
                    onChange={set('otpCode')}
                    error={errors.otpCode}
                  />
                  <button
                    onClick={verifyOtp}
                    className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blueDark"
                  >
                    Verify &amp; Login
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setOtp(null)
                  setErrors({})
                  setBanner(null)
                }}
                className="w-full text-center text-[13px] font-medium text-slate-500 hover:text-brand-blue"
              >
                ← Back to password login
              </button>
            </div>
          )}

          {/* SIGNUP → doctors register on a dedicated page (needs document uploads
              + manual verification), so route out of the modal. */}
          {mode === 'signup' && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl border border-brand-blueLight bg-brand-blueLight/40 p-4">
                <p className="text-sm font-semibold text-brand-navy">Register your practice on TapCure</p>
                <p className="mt-1 text-[13px] text-slate-500">
                  Doctor sign-up needs your medical registration certificate and degree for
                  manual verification. We'll take you to the full registration form.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); navigate('/doctor-signup') }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark"
              >
                <Stethoscope className="h-4 w-4" /> Continue to Doctor Registration
              </button>
              <p className="text-center text-[13px] text-slate-500">
                Already registered?{' '}
                <button type="button" onClick={() => setMode('login')} className="font-semibold text-brand-blue hover:underline">
                  Login
                </button>
              </p>
            </div>
          )}
          </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

function DemoHint({ role }) {
  const c = DUMMY[role][0]
  return (
    <div className="rounded-xl border border-blue-100 bg-brand-blueLight px-3.5 py-2.5 text-[12px] text-slate-600">
      <span className="font-semibold text-brand-blue">Demo login</span> — {c.email} / {c.password}
    </div>
  )
}

export default AuthModal
