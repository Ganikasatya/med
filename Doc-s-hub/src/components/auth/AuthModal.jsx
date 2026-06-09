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
  Plus,
  ShieldCheck,
} from 'lucide-react'
import Logo from '../common/Logo.jsx'
import { TextInput, PasswordInput, SelectInput, Checkbox, Banner } from '../common/FormControls.jsx'
import { AUTH_ROLES, DUMMY, CITIES, SPECIALIZATIONS } from '../../data/authData.js'
import { useAuth } from '../../context/AuthContext.jsx'

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const mobileRe = /^\d{10}$/

/**
 * Premium split auth modal used for BOTH patient and doctor roles.
 * Left = gradient promo panel; right = Login / Sign up tabs (+ OTP flow).
 *
 * Rendered through a portal to <body> so the homepage's scale() transform
 * never shrinks or clips it.
 */
function AuthModal({ open, onClose, role = 'patient', initialMode = 'login' }) {
  const cfg = AUTH_ROLES[role]
  const navigate = useNavigate()
  const { login } = useAuth()

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

  const succeed = (name) => {
    setBanner({ type: 'success', msg: 'Success! Redirecting to your dashboard…' })
    login(role, { name: name || form.fullName || cfg.login.title, email: form.email })
    setTimeout(() => {
      onClose()
      navigate(cfg.redirect)
    }, 850)
  }

  /* ---------------- Password login ---------------- */
  const handleLogin = (e) => {
    e.preventDefault()
    const err = {}
    if (!form.idf?.trim()) err.idf = 'Required'
    if (!form.password?.trim()) err.password = 'Required'
    setErrors(err)
    if (Object.keys(err).length) return

    const ok = DUMMY[role].some(
      (c) => c.email === form.idf.trim() && c.password === form.password
    )
    if (ok) succeed()
    else setBanner({ type: 'error', msg: 'Invalid credentials. Try the demo login below.' })
  }

  /* ---------------- OTP login ---------------- */
  const sendOtp = () => {
    if (!mobileRe.test(form.otpMobile || '')) {
      setErrors({ otpMobile: 'Enter a valid 10-digit mobile number' })
      return
    }
    setErrors({})
    setOtp('sent')
    setBanner({ type: 'success', msg: `OTP sent to +91 ${form.otpMobile} (use ${DUMMY.otp})` })
  }
  const verifyOtp = () => {
    if ((form.otpCode || '') !== DUMMY.otp) {
      setErrors({ otpCode: 'Incorrect OTP' })
      return
    }
    setErrors({})
    succeed()
  }

  /* ---------------- Signup ---------------- */
  const handleSignup = (e) => {
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
    succeed(form.fullName)
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
        className="relative flex w-full max-w-[760px] overflow-hidden rounded-3xl bg-white shadow-2xl"
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

        {/* Left promo panel */}
        <div className="relative hidden w-[42%] flex-col justify-center overflow-hidden bg-gradient-to-br from-brand-blue via-brand-blue to-brand-green p-7 text-white md:flex">
          {/* faint plus pattern */}
          <Plus className="absolute right-6 top-10 h-8 w-8 text-white/15" />
          <Plus className="absolute right-16 top-1/2 h-5 w-5 text-white/10" />
          <Plus className="absolute bottom-10 left-8 h-6 w-6 text-white/10" />
          <Logo className="[&_span]:text-white [&_path]:fill-white/90" />
          <h3 className="mt-7 text-[26px] font-extrabold leading-tight">
            {cfg.brand.title}
          </h3>
          <p className="mt-2 text-sm text-white/80">{cfg.brand.subtitle}</p>
          <ul className="mt-6 space-y-4">
            {cfg.brand.benefits.map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
                  <Icon className="h-[18px] w-[18px] text-white" />
                </span>
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-xs leading-snug text-white/75">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Right form panel */}
        <div className="flex w-full flex-col p-7 md:w-[58%]">
          <div className="mb-4 flex flex-col items-center text-center">
            <Logo />
            <h2 className="mt-3 text-2xl font-extrabold text-brand-navy">
              {cfg[mode].title}
            </h2>
            <p className="mt-1 max-w-xs text-[13px] text-slate-500">
              {cfg[mode].subtitle}
            </p>
          </div>

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

          {/* SIGNUP */}
          {mode === 'signup' && (
            <form onSubmit={handleSignup} className="space-y-3">
              <TextInput icon={User} placeholder="Full Name" value={form.fullName || ''} onChange={set('fullName')} error={errors.fullName} />
              <TextInput icon={Phone} prefix="+91" placeholder="Mobile Number" inputMode="numeric" maxLength={10} value={form.mobile || ''} onChange={set('mobile')} error={errors.mobile} />
              <TextInput icon={Mail} placeholder="Email" value={form.email || ''} onChange={set('email')} error={errors.email} />
              {role === 'patient' ? (
                <SelectInput icon={MapPin} value={form.city || ''} onChange={set('city')} error={errors.city}>
                  <option value="">Select City</option>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </SelectInput>
              ) : (
                <SelectInput icon={Stethoscope} value={form.specialization || ''} onChange={set('specialization')} error={errors.specialization}>
                  <option value="">Select Specialization</option>
                  {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
                </SelectInput>
              )}
              <PasswordInput icon={Lock} placeholder="Password" value={form.password || ''} onChange={set('password')} error={errors.password} />
              <PasswordInput icon={Lock} placeholder="Confirm Password" value={form.confirm || ''} onChange={set('confirm')} error={errors.confirm} />
              <Checkbox checked={!!form.terms} onChange={(e) => setForm((f) => ({ ...f, terms: e.target.checked }))}>
                I agree to the <span className="font-semibold text-brand-blue">Terms &amp; Privacy Policy</span>
              </Checkbox>
              {errors.terms && <p className="-mt-1 text-xs text-red-500">{errors.terms}</p>}
              <button className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark">
                Create Account
              </button>
            </form>
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
