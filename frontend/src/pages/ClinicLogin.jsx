import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Sparkles,
  CalendarCheck,
  Ticket,
  Stethoscope,
  ClipboardList,
  Globe,
  Smile,
  Mail,
  Lock,
  Info,
  ArrowRight,
  ShieldCheck,
  Building2,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import { TextInput, PasswordInput, Banner } from '../components/common/FormControls.jsx'
import { useAuth } from '../context/AuthContext.jsx'

const BENEFITS = [
  { icon: CalendarCheck, title: 'Online Appointment Booking', desc: 'Let patients book appointments anytime.', tone: 'green' },
  { icon: Ticket, title: 'Digital Token Management', desc: 'Streamline queue and reduce waiting time.', tone: 'blue' },
  { icon: Stethoscope, title: 'Doctor & Schedule Management', desc: 'Manage doctors, timings and availability easily.', tone: 'green' },
  { icon: ClipboardList, title: 'Patient Visit Tracking', desc: 'Track patient visits and history securely.', tone: 'blue' },
  { icon: Globe, title: 'Clinic Profile Visibility', desc: "Increase your clinic's online presence.", tone: 'blue' },
  { icon: Smile, title: 'Less Waiting, Better Experience', desc: 'Happy patients, healthy practice.', tone: 'blue' },
]

function ClinicLogin() {
  const navigate = useNavigate()
  const { login, homeFor } = useAuth()
  const [form, setForm] = useState({ idf: '', password: '' })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const [busy, setBusy] = useState(false)

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
    <div className="min-h-screen bg-gradient-to-br from-brand-blueLight via-white to-blue-50">
      <PageHeader />

      <main className="mx-auto grid max-w-[1180px] gap-6 px-6 py-8 lg:grid-cols-[1.45fr_1fr] lg:items-start">
        {/* Left — pitch + benefits */}
        <section className="rounded-3xl border border-slate-100 bg-white p-7 shadow-card">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blueLight px-3 py-1 text-xs font-semibold text-brand-blue">
            <Sparkles className="h-3.5 w-3.5" />
            Trusted by Clinics, Loved by Patients
          </span>
          <h1 className="mt-4 text-[34px] font-extrabold leading-tight text-brand-navy">
            Grow your clinic with{' '}
            <span className="text-brand-blue">Doctor</span>
            <span className="text-brand-green">Mitra</span>
          </h1>
          <div className="mt-2 h-1 w-16 rounded-full bg-brand-green" />
          <p className="mt-3 max-w-xl text-sm text-slate-500">
            Manage appointments, tokens, doctors, and patient visits — all in one
            smart platform designed for modern clinics.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {BENEFITS.map(({ icon: Icon, title, desc, tone }) => (
              <div key={title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-card">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    tone === 'green' ? 'bg-brand-greenLight text-brand-green' : 'bg-brand-blueLight text-brand-blue'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 text-[13.5px] font-bold leading-tight text-brand-navy">{title}</h3>
                <p className="mt-1 text-xs leading-snug text-slate-500">{desc}</p>
              </div>
            ))}
          </div>

          {/* Reassurance banner */}
          <div className="mt-5 flex items-center gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-blueLight to-blue-100/60 p-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green text-white">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold text-brand-navy">Secure. Reliable. Always by your side.</p>
                <p className="text-xs text-slate-500">Doctor Mitra empowers clinics to deliver better care, every day.</p>
              </div>
            </div>
            <div className="ml-auto hidden items-center gap-2 rounded-xl bg-brand-blue px-4 py-2.5 text-white sm:flex">
              <Building2 className="h-5 w-5" />
              <span className="text-sm font-bold">CLINIC</span>
            </div>
          </div>
        </section>

        {/* Right — login card */}
        <section className="rounded-3xl border border-slate-100 bg-white p-7 shadow-card lg:sticky lg:top-8">
          <div className="flex flex-col items-center text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blueLight">
              <Stethoscope className="h-6 w-6 text-brand-blue" />
            </span>
            <h2 className="mt-3 text-2xl font-extrabold text-brand-navy">Clinic Login</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Sign in to access your clinic dashboard and manage your practice.
            </p>
          </div>

          {banner && <div className="mt-4"><Banner type={banner.type}>{banner.msg}</Banner></div>}

          <form onSubmit={handleLogin} className="mt-4 space-y-3">
            <TextInput icon={Mail} placeholder="Clinic Email / Mobile Number" value={form.idf} onChange={set('idf')} error={errors.idf} />
            <PasswordInput icon={Lock} placeholder="Password" value={form.password} onChange={set('password')} error={errors.password} />
            <button
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Login to Dashboard'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="flex items-center justify-between text-[13px]">
            <button
              type="button"
              onClick={() => setBanner({ type: 'success', msg: 'Password reset link sent (demo).' })}
              className="font-medium text-brand-blue hover:underline"
            >
              Forgot password?
            </button>
            <span className="text-slate-500">
              New clinic?{' '}
              <Link to="/clinic-signup" className="font-semibold text-brand-blue hover:underline">
                Register here
              </Link>
            </span>
          </div>

          {/* Demo credentials */}
          <div className="mt-5 rounded-2xl border border-blue-100 bg-brand-blueLight p-4">
            <p className="flex items-center gap-1.5 text-[13px] font-bold text-brand-blue">
              <Info className="h-4 w-4" /> Demo Credentials
            </p>
            <p className="mt-1 text-xs text-slate-500">Staff sign-in — routed to the right console automatically.</p>
            <div className="mt-2 space-y-2 text-[13px] text-brand-navy">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Hospital Admin</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> admin@citycare.com</p>
                <p className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-slate-400" /> Admin@123</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Assistant (Front Desk)</p>
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-slate-400" /> reception@citycare.com</p>
                <p className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-slate-400" /> Recep@123</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default ClinicLogin
