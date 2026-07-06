import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Sparkles, CalendarCheck, Ticket, Stethoscope,
  Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext.jsx'

const FEATURES = [
  { icon: CalendarCheck, title: 'Online Appointment Booking', desc: 'Let patients book appointments anytime.' },
  { icon: Ticket, title: 'Digital Token Management', desc: 'Streamline queue and reduce waiting time.' },
  { icon: Stethoscope, title: 'Doctor & Schedule', desc: 'Manage doctors, timings and availability easily.' },
]

function ClinicLogin() {
  const navigate = useNavigate()
  const { login, homeFor } = useAuth()
  const [form, setForm] = useState({ idf: '', password: '' })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const [busy, setBusy] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleLogin = async (e) => {
    e.preventDefault()
    const err = {}
    if (!form.idf.trim()) err.idf = 'Required'
    if (!form.password.trim()) err.password = 'Required'
    setErrors(err)
    if (Object.keys(err).length) return

    setBusy(true)
    setBanner({ type: 'success', msg: 'Signing you in…' })
    try {
      const u = await login(form.idf.trim(), form.password)
      navigate(homeFor(u.role_name))
    } catch (e2) {
      setBanner({
        type: 'error',
        msg: e2.status === 401 ? 'Invalid credentials. Use the demo credentials below.' : e2.message || 'Login failed',
      })
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f2ecdf] px-4 py-6 font-sans text-slate-700 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto grid max-w-[1300px] items-stretch gap-6 lg:grid-cols-2">
        {/* ── Left: pitch + features ──────────────────────────────────────── */}
        <section className="rounded-[28px] border border-[#ece5d5] bg-white p-8 shadow-[0_10px_40px_rgba(15,39,66,0.06)] sm:p-10">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3.5 py-1.5 text-[13px] font-semibold text-teal-700">
            <Sparkles className="h-4 w-4" /> Trusted by Clinics, Loved by Patients
          </span>

          <h1 className="mt-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-[#0f2742] sm:text-5xl">
            Grow your clinic with{' '}
            <span className="bg-gradient-to-r from-teal-600 to-green-600 bg-clip-text text-transparent">TapCure</span>
          </h1>
          <div className="mt-4 h-1 w-20 rounded-full bg-gradient-to-r from-teal-600 to-green-600" />

          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-slate-500">
            Manage appointments, tokens, doctors and patient visits — all in one
            smart platform designed for modern clinics.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-2xl bg-[#f7f2e8] p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-[15px] font-bold leading-tight text-[#0f2742]">{title}</h3>
                <p className="mt-1.5 text-[13px] leading-snug text-slate-500">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3 rounded-2xl bg-green-50 p-4">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-green-600 text-white">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <p className="text-[13px] leading-snug text-slate-600">
              <b className="font-bold text-[#0f2742]">HIPAA-aligned &amp; secure.</b> Built for
              India's clinics — your data is encrypted and always protected.
            </p>
          </div>
        </section>

        {/* ── Right: login card ───────────────────────────────────────────── */}
        <section className="rounded-[28px] border border-[#ece5d5] bg-white p-8 shadow-[0_10px_40px_rgba(15,39,66,0.06)] sm:p-10">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-600">
              <Stethoscope className="h-8 w-8" />
            </span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-[#0f2742]">Clinic Login</h2>
            <p className="mt-2 max-w-sm text-sm text-slate-500">
              Sign in to access your clinic dashboard and manage your practice.
            </p>
          </div>

          {banner && (
            <div
              className={`mt-5 rounded-xl border px-4 py-2.5 text-sm ${
                banner.type === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-green-200 bg-green-50 text-green-700'
              }`}
            >
              {banner.msg}
            </div>
          )}

          <form onSubmit={handleLogin} className="mt-6 space-y-3">
            <div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#e5dcc9] bg-[#f8f4ea] px-4 py-3.5 transition-colors focus-within:border-teal-500">
                <Mail className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type="text"
                  placeholder="Clinic Email / Mobile Number"
                  value={form.idf}
                  onChange={set('idf')}
                  className="flex-1 bg-transparent text-sm text-[#0f2742] placeholder:text-slate-400 focus:outline-none"
                />
              </div>
              {errors.idf && <p className="mt-1 pl-1 text-xs text-red-600">{errors.idf}</p>}
            </div>

            <div>
              <div className="flex items-center gap-3 rounded-2xl border border-[#e5dcc9] bg-[#f8f4ea] px-4 py-3.5 transition-colors focus-within:border-teal-500">
                <Lock className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Password"
                  value={form.password}
                  onChange={set('password')}
                  className="flex-1 bg-transparent text-sm text-[#0f2742] placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="text-slate-400 transition-colors hover:text-teal-600"
                >
                  {showPw ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 pl-1 text-xs text-red-600">{errors.password}</p>}
            </div>

            <button
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-green-600 py-4 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Login to Dashboard'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-[#e5dcc9]" /> or <span className="h-px flex-1 bg-[#e5dcc9]" />
          </div>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => setBanner({ type: 'success', msg: 'Password reset link sent (demo).' })}
              className="font-semibold text-teal-700 hover:underline"
            >
              Forgot password?
            </button>
            <span className="text-slate-500">
              New clinic?{' '}
              <Link to="/clinic-signup" className="font-bold text-teal-700 hover:underline">
                Register here
              </Link>
            </span>
          </div>
        </section>
      </div>
    </div>
  )
}

export default ClinicLogin
