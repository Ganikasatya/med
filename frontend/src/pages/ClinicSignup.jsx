import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Building2,
  UsersRound,
  Clock,
  Stethoscope,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  CheckCircle2,
  Plus,
  ArrowRight,
  Hash,
} from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import { TextInput, PasswordInput, SelectInput, Banner } from '../components/common/FormControls.jsx'
import { authApi } from '../api'
import {
  CLINIC_TYPES,
  CITIES,
  CONSULT_TIMES,
  WORKING_DAYS,
  SERVICE_OPTIONS,
} from '../data/authData.js'

const STEPS = [
  { n: 1, title: 'Clinic Details', sub: 'Basic information about your clinic' },
  { n: 2, title: 'Owner Details', sub: 'Information about the owner' },
  { n: 3, title: 'Clinic Timings', sub: 'Set your working hours' },
  { n: 4, title: 'Services', sub: 'Choose services you provide' },
]

const ICON_COLORS = {
  green: 'text-brand-green',
  sky: 'text-sky-500',
  pink: 'text-pink-500',
  blue: 'text-brand-blue',
  red: 'text-red-500',
  violet: 'text-violet-500',
}

function SectionCard({ icon: Icon, title, children }) {
  return (
    <section className="flex-1 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2.5 border-b border-slate-100 pb-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-[15px] font-bold text-brand-navy">{title}</h3>
      </div>
      <div className="space-y-3.5">{children}</div>
    </section>
  )
}

function ClinicSignup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], services: [], other: '' })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggle = (key, val) =>
    setForm((f) => {
      const arr = f[key]
      return { ...f, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] }
    })

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = {}
    const required = ['clinicName', 'clinicType', 'regNo', 'city', 'area', 'address', 'ownerName', 'mobile', 'email', 'password', 'confirm', 'open', 'close', 'consult']
    required.forEach((k) => { if (!form[k]?.toString().trim()) err[k] = 'Required' })
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) err.mobile = 'Enter a valid 10-digit number'
    if (form.confirm && form.password && form.confirm !== form.password) err.confirm = 'Passwords do not match'
    if (!form.services.length) err.services = 'Select at least one service'
    setErrors(err)
    if (Object.keys(err).length) {
      setDone(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    // Map "HH:MM AM/PM" consult option to minutes if it's like "10 mins"; else default.
    const consultMins = parseInt(form.consult, 10) || 10
    setBusy(true)
    setSubmitError(null)
    try {
      await authApi.registerClinic({
        clinic_name: form.clinicName,
        clinic_type: form.clinicType,
        registration_number: form.regNo,
        city: form.city,
        area: form.area,
        address: form.address,
        owner_name: form.ownerName,
        phone: form.mobile,
        email: form.email,
        password: form.password,
        open_time: form.open,
        close_time: form.close,
        consultation_minutes: consultMins,
        working_days: form.days,
        services: form.services,
      })
      setDone(true)
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50)
    } catch (e2) {
      setSubmitError(e2.message || 'Registration failed. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blueLight via-white to-blue-50">
      <PageHeader />

      <main className="mx-auto max-w-[1400px] px-6 py-7">
        {/* Title + registration photo (top-right, where the illustration was).
            The band reserves height so the photo never overlaps the stepper. */}
        <div className="relative min-h-[160px]">
          <h1 className="text-[30px] font-extrabold text-brand-navy">
            Register your clinic with <span className="text-brand-blue">Doctor</span>
            <span className="text-brand-green">Mitra</span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Join Doctor Mitra and grow your practice by connecting with more patients.
          </p>

          <div className="absolute -top-3 right-0 hidden w-[480px] xl:block">
            <div className="absolute right-4 -top-2 z-10 flex h-11 w-11 items-center justify-center rounded-full rounded-bl-none bg-brand-green shadow-md ring-4 ring-white">
              <Plus className="h-5 w-5 text-white" strokeWidth={3} />
            </div>
            {/* Blended into the page background with soft faded edges (no card/patch) */}
            <img
              src="/clinic-register-banner.png"
              alt="Patient registering at a Doctor Mitra clinic reception"
              className="h-[170px] w-full object-cover object-center"
              style={{
                WebkitMaskImage:
                  'linear-gradient(to right, transparent 0%, black 22%, black 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
                maskImage:
                  'linear-gradient(to right, transparent 0%, black 22%, black 90%, transparent 100%), linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)',
                WebkitMaskComposite: 'source-in',
                maskComposite: 'intersect',
              }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-4">
          {/* Stepper header */}
          <div className="mb-5 hidden items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-white px-6 py-4 shadow-card lg:flex">
            {STEPS.map((s, i) => (
              <div key={s.n} className="flex flex-1 items-center">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white ${s.n === 1 ? 'bg-brand-blue' : 'bg-slate-300'}`}>
                    {s.n}
                  </span>
                  <div>
                    <p className={`text-[13px] font-bold ${s.n === 1 ? 'text-brand-blue' : 'text-brand-navy'}`}>{s.title}</p>
                    <p className="text-[11px] text-slate-400">{s.sub}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && <span className="mx-3 h-px flex-1 bg-slate-200" />}
              </div>
            ))}
          </div>

          {Object.keys(errors).length > 0 && (
            <div className="mb-4">
              <Banner type="error">Please fill all required fields highlighted below.</Banner>
            </div>
          )}
          {submitError && (
            <div className="mb-4">
              <Banner type="error">{submitError}</Banner>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-4">
            {/* 1. Clinic Details */}
            <SectionCard icon={Building2} title="Clinic Details">
              <TextInput label="Clinic Name" required icon={Building2} placeholder="Enter clinic name" value={form.clinicName || ''} onChange={set('clinicName')} error={errors.clinicName} />
              <SelectInput label="Clinic Type" required value={form.clinicType || ''} onChange={set('clinicType')} error={errors.clinicType}>
                <option value="">Select clinic type</option>
                {CLINIC_TYPES.map((t) => <option key={t}>{t}</option>)}
              </SelectInput>
              <TextInput label="Registration Number" required icon={Hash} placeholder="Enter registration number" value={form.regNo || ''} onChange={set('regNo')} error={errors.regNo} />
              <div className="grid grid-cols-2 gap-3">
                <SelectInput label="City" required value={form.city || ''} onChange={set('city')} error={errors.city}>
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </SelectInput>
                <TextInput label="Area / Locality" required placeholder="Enter area" value={form.area || ''} onChange={set('area')} error={errors.area} />
              </div>
              <TextInput label="Full Address" required icon={MapPin} placeholder="Enter complete address" value={form.address || ''} onChange={set('address')} error={errors.address} />
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" /> Your clinic details are secure and safe with us.
              </p>
            </SectionCard>

            {/* 2. Owner Details */}
            <SectionCard icon={UsersRound} title="Owner Details">
              <TextInput label="Owner Name" required icon={User} placeholder="Enter full name" value={form.ownerName || ''} onChange={set('ownerName')} error={errors.ownerName} />
              <TextInput label="Mobile Number" required icon={Phone} prefix="+91" placeholder="Enter mobile number" inputMode="numeric" maxLength={10} value={form.mobile || ''} onChange={set('mobile')} error={errors.mobile} />
              <TextInput label="Email Address" required icon={Mail} placeholder="Enter email address" value={form.email || ''} onChange={set('email')} error={errors.email} />
              <PasswordInput label="Password" required icon={Lock} placeholder="Create a strong password" value={form.password || ''} onChange={set('password')} error={errors.password} />
              <PasswordInput label="Confirm Password" required icon={Lock} placeholder="Confirm your password" value={form.confirm || ''} onChange={set('confirm')} error={errors.confirm} />
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" /> Use a strong password to keep your account secure.
              </p>
            </SectionCard>

            {/* 3. Clinic Timings */}
            <SectionCard icon={Clock} title="Clinic Timings">
              <TextInput label="Opening Time" required icon={Clock} type="time" value={form.open || ''} onChange={set('open')} error={errors.open} />
              <TextInput label="Closing Time" required icon={Clock} type="time" value={form.close || ''} onChange={set('close')} error={errors.close} />
              <SelectInput label="Average Consultation Time" required value={form.consult || ''} onChange={set('consult')} error={errors.consult}>
                <option value="">Select duration</option>
                {CONSULT_TIMES.map((t) => <option key={t}>{t}</option>)}
              </SelectInput>
              <div>
                <p className="mb-2 text-[13px] font-semibold text-slate-700">Working Days <span className="text-red-500">*</span></p>
                <div className="grid grid-cols-4 gap-x-2 gap-y-2.5">
                  {WORKING_DAYS.map((d) => (
                    <label key={d} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={form.days.includes(d)}
                        onChange={() => toggle('days', d)}
                        className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                      />
                      <span className="text-[13px] font-medium text-slate-600">{d}</span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-blue" /> Patients will see your availability based on these timings.
              </p>
            </SectionCard>

            {/* 4. Services */}
            <SectionCard icon={Stethoscope} title="Services">
              <p className="text-[13px] font-semibold text-slate-700">
                Select the services you provide <span className="text-red-500">*</span>
              </p>
              {errors.services && <p className="text-xs text-red-500">{errors.services}</p>}
              <div className="grid grid-cols-3 gap-2">
                {SERVICE_OPTIONS.map(({ label, icon: Icon, color }) => {
                  const on = form.services.includes(label)
                  return (
                    <button type="button" key={label} onClick={() => toggle('services', label)}
                      className={`relative flex items-center gap-1.5 rounded-xl border px-2 py-2.5 text-left transition-colors ${on ? 'border-brand-green bg-brand-greenLight' : 'border-slate-200 hover:border-brand-blue'}`}>
                      <Icon className={`h-4 w-4 shrink-0 ${ICON_COLORS[color]}`} />
                      <span className="text-[11px] font-semibold leading-tight text-slate-700">{label}</span>
                      {on && <CheckCircle2 className="absolute right-1 top-1 h-3.5 w-3.5 text-brand-green" />}
                    </button>
                  )
                })}
              </div>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-slate-700">Other Services</p>
                <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 focus-within:border-brand-blue">
                  <input placeholder="Enter other service" value={form.other} onChange={set('other')}
                    className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400" />
                  <button type="button" onClick={() => { if (form.other.trim()) { toggle('services', form.other.trim()); setForm((f) => ({ ...f, other: '' })) } }}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </SectionCard>
          </div>

          {/* Submit */}
          <div className="mt-6 flex justify-center">
            <button
              disabled={busy}
              className="flex items-center gap-2 rounded-xl bg-brand-blue px-10 py-3.5 text-sm font-semibold text-white shadow-card transition-colors hover:bg-brand-blueDark disabled:opacity-60"
            >
              <Building2 className="h-4 w-4" />
              {busy ? 'Submitting…' : 'Submit Clinic Registration'}
            </button>
          </div>

          {/* Success banner (appears below submit, matching the mockup) */}
          {done && (
            <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 sm:flex-row">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-bold text-brand-navy">Registration received — your clinic is pending approval.</p>
                  <p className="text-[13px] text-slate-500">Our team will verify your details and notify you once it's approved. You can log in after that.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/clinic-login')}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-blue bg-white px-5 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight"
              >
                Go to Clinic Login <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}

export default ClinicSignup
