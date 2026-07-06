import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Stethoscope,
  User,
  Phone,
  Mail,
  Lock,
  Hash,
  Award,
  BadgeCheck,
  FileText,
  Upload,
  CheckCircle2,
  ArrowRight,
  Languages,
  Briefcase,
} from 'lucide-react'
import { TextInput, PasswordInput, SelectInput, Banner } from '../components/common/FormControls.jsx'
import { authApi } from '../api'
import { SPECIALIZATIONS, CITIES } from '../data/authData.js'

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

/** Styled file picker — accepts a PDF/image, shows the chosen filename. */
function FileField({ label, required, hint, file, onPick, error, accept = '.pdf,image/*' }) {
  const ref = useRef(null)
  return (
    <div>
      <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className={`flex w-full items-center gap-2.5 rounded-xl border border-dashed bg-white px-3.5 py-3 text-left transition-colors hover:border-brand-blue ${
          error ? 'border-red-300' : file ? 'border-brand-green' : 'border-slate-300'
        }`}
      >
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${file ? 'bg-brand-greenLight text-brand-green' : 'bg-slate-100 text-slate-400'}`}>
          {file ? <CheckCircle2 className="h-4.5 w-4.5" /> : <Upload className="h-4.5 w-4.5" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-brand-navy">
            {file ? file.name : 'Click to upload'}
          </span>
          <span className="block text-[11px] text-slate-400">{file ? `${Math.max(1, Math.round(file.size / 1024))} KB` : (hint || 'PDF or image')}</span>
        </span>
      </button>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] || null)}
      />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export default function DoctorSignup() {
  const navigate = useNavigate()
  const [form, setForm] = useState({})
  const [files, setFiles] = useState({ regCert: null, degreeCert: null, councilCert: null, idProof: null })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const pick = (k) => (file) => {
    setFiles((prev) => ({ ...prev, [k]: file }))
    setErrors((er) => ({ ...er, [k]: undefined }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const err = {}
    const required = ['fullName', 'specialization', 'regNo', 'email', 'mobile', 'password', 'confirm']
    required.forEach((k) => { if (!form[k]?.toString().trim()) err[k] = 'Required' })
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) err.mobile = 'Enter a valid 10-digit number'
    if (form.password && form.password.length < 6) err.password = 'Min 6 characters'
    if (form.confirm && form.password && form.confirm !== form.password) err.confirm = 'Passwords do not match'
    if (!files.regCert) err.regCert = 'Upload your registration certificate'
    if (!files.degreeCert) err.degreeCert = 'Upload your degree certificate'
    setErrors(err)
    if (Object.keys(err).length) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    setBusy(true)
    setSubmitError(null)
    try {
      const fd = new FormData()
      fd.append('name', form.fullName)
      fd.append('email', form.email)
      fd.append('phone', form.mobile)
      fd.append('password', form.password)
      fd.append('registration_number', form.regNo)
      fd.append('specialization', form.specialization)
      fd.append('qualification', form.qualification || '')
      if (form.hprId?.trim()) fd.append('hpr_id', form.hprId.trim())
      fd.append('experience_years', String(parseInt(form.experience, 10) || 0))
      fd.append('city', form.city || '')
      fd.append('languages', form.languages || '')
      fd.append('bio', form.bio || '')
      fd.append('registration_certificate', files.regCert)
      fd.append('degree_certificate', files.degreeCert)
      if (files.councilCert) fd.append('council_certificate', files.councilCert)
      if (files.idProof) fd.append('id_proof', files.idProof)

      await authApi.registerDoctor(fd)
      setDone(true)
      setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }), 50)
    } catch (e2) {
      setSubmitError(e2.message || 'Registration failed. Please try again.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    setBusy(false)
  }

  return (
    <div className="theme-reception min-h-screen bg-[#f2ecdf]">
      <main className="mx-auto max-w-[1200px] px-6 py-8 lg:py-10">
        <div className="mb-6">
          <h1 className="text-[30px] font-extrabold text-brand-navy">
            Join <span className="text-brand-navy">Tap</span>
            <span className="bg-gradient-to-r from-brand-blue via-brand-teal to-brand-green bg-clip-text text-transparent">Cure</span> as a Doctor
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Register your independent practice. Upload your credentials — our team verifies them
            manually before your account goes live.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {Object.keys(errors).length > 0 && (
            <div className="mb-4"><Banner type="error">Please fill all required fields and upload the required documents.</Banner></div>
          )}
          {submitError && <div className="mb-4"><Banner type="error">{submitError}</Banner></div>}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            {/* 1. Personal + professional */}
            <SectionCard icon={User} title="About You">
              <TextInput label="Full Name" required icon={User} placeholder="Dr. Full Name" value={form.fullName || ''} onChange={set('fullName')} error={errors.fullName} />
              <SelectInput label="Specialization" required icon={Stethoscope} value={form.specialization || ''} onChange={set('specialization')} error={errors.specialization}>
                <option value="">Select specialization</option>
                {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
              </SelectInput>
              <TextInput label="Qualification" icon={Award} placeholder="e.g. MBBS, MD" value={form.qualification || ''} onChange={set('qualification')} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Experience (yrs)" icon={Briefcase} type="number" min="0" placeholder="0" value={form.experience || ''} onChange={set('experience')} />
                <SelectInput label="City" icon={User} value={form.city || ''} onChange={set('city')}>
                  <option value="">Select city</option>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </SelectInput>
              </div>
              <TextInput label="Languages" icon={Languages} placeholder="e.g. English, Telugu, Hindi" value={form.languages || ''} onChange={set('languages')} />
            </SectionCard>

            {/* 2. Credentials + login */}
            <SectionCard icon={BadgeCheck} title="Credentials & Account">
              <TextInput label="Medical Council Registration No." required icon={Hash} placeholder="Enter your council registration number" value={form.regNo || ''} onChange={set('regNo')} error={errors.regNo} />
              <TextInput label="HPR ID (optional)" icon={Hash} placeholder="ABDM Healthcare Professionals Registry ID, if any" value={form.hprId || ''} onChange={set('hprId')} />
              <TextInput label="Email Address" required icon={Mail} placeholder="Enter email address" value={form.email || ''} onChange={set('email')} error={errors.email} />
              <TextInput label="Mobile Number" required icon={Phone} prefix="+91" placeholder="Enter mobile number" inputMode="numeric" maxLength={10} value={form.mobile || ''} onChange={set('mobile')} error={errors.mobile} />
              <PasswordInput label="Password" required icon={Lock} placeholder="Create a strong password" value={form.password || ''} onChange={set('password')} error={errors.password} />
              <PasswordInput label="Confirm Password" required icon={Lock} placeholder="Confirm your password" value={form.confirm || ''} onChange={set('confirm')} error={errors.confirm} />
            </SectionCard>

            {/* 3. Documents */}
            <SectionCard icon={FileText} title="Verification Documents">
              <p className="text-[12px] text-slate-500">
                Upload clear scans or photos. These are reviewed manually and are never shown to patients.
              </p>
              <FileField label="Medical Registration Certificate" required hint="Council registration certificate (PDF/image)" file={files.regCert} onPick={pick('regCert')} error={errors.regCert} />
              <FileField label="Degree Certificate (MBBS/BDS/etc.)" required hint="Your primary medical degree" file={files.degreeCert} onPick={pick('degreeCert')} error={errors.degreeCert} />
              <FileField label="Medical Council Proof (optional)" hint="State/national council ID, if available" file={files.councilCert} onPick={pick('councilCert')} />
              <FileField label="ID Proof (optional)" hint="Aadhaar / PAN / passport" file={files.idProof} onPick={pick('idProof')} />
              <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" /> Your documents are stored securely and used only for verification.
              </p>
            </SectionCard>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              disabled={busy}
              className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-teal-600 to-green-600 px-10 py-3.5 text-sm font-bold text-white shadow-sm transition-transform hover:scale-[1.01] disabled:opacity-60"
            >
              <Stethoscope className="h-4 w-4" />
              {busy ? 'Submitting…' : 'Submit for Verification'}
            </button>
          </div>

          {done && (
            <div className="mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border border-green-200 bg-green-50 p-5 sm:flex-row">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-white">
                  <CheckCircle2 className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-sm font-bold text-brand-navy">Registration received — your documents are pending verification.</p>
                  <p className="text-[13px] text-slate-500">Our team will review your credentials and notify you by email once approved. You can log in after that.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-brand-blue bg-white px-5 py-2.5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight"
              >
                Back to Home <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}
