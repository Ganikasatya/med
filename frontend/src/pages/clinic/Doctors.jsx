import { useEffect, useState } from 'react'
import { Stethoscope, UserCheck, UserX, Plus, Search, Briefcase, IndianRupee, Building2, X, RefreshCw } from 'lucide-react'
import { Card, StatusBadge, StatCard, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { TextInput, PasswordInput } from '../../components/common/FormControls.jsx'
import { doctorsApi, departmentsApi } from '../../api'

const STATUS_LABEL = { active: 'Active', on_leave: 'On Leave', inactive: 'Inactive', suspended: 'Inactive' }

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
      <Icon className="h-4 w-4 text-slate-400" />
      <div className="leading-tight">
        <p className="font-bold text-brand-navy">{value}</p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function AddDoctorModal({ departments, onClose, onAdded }) {
  const [form, setForm] = useState({
    name: '', specialization: 'General Physician', consultation_fee: '', experience_years: '',
    department_id: '', languages: '', create_login: false, email: '', password: '',
  })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!form.name.trim()) er.name = 'Required'
    if (form.create_login) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'Valid email required'
      if (!form.password || form.password.length < 6) er.password = 'Min 6 characters'
    }
    setErrors(er)
    if (Object.keys(er).length) return

    setBusy(true)
    setErr(null)
    try {
      await doctorsApi.onboard({
        name: form.name.trim(),
        specialization: form.specialization,
        consultation_fee: form.consultation_fee ? Number(form.consultation_fee) : 0,
        experience_years: form.experience_years ? Number(form.experience_years) : 0,
        department_id: form.department_id ? Number(form.department_id) : undefined,
        languages: form.languages,
        create_login: form.create_login,
        email: form.create_login ? form.email : undefined,
        password: form.create_login ? form.password : undefined,
      })
      onAdded()
    } catch (e2) {
      setErr(e2.message || 'Could not add doctor')
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-[480px] rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-brand-navy">Add Doctor</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <TextInput icon={Stethoscope} placeholder="Doctor Name" value={form.name} onChange={set('name')} error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput placeholder="Specialization" value={form.specialization} onChange={set('specialization')} />
            <select value={form.department_id} onChange={set('department_id')} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-navy">
              <option value="">Department</option>
              {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextInput icon={IndianRupee} placeholder="Consultation Fee" inputMode="numeric" value={form.consultation_fee} onChange={set('consultation_fee')} />
            <TextInput icon={Briefcase} placeholder="Experience (yrs)" inputMode="numeric" value={form.experience_years} onChange={set('experience_years')} />
          </div>
          <TextInput placeholder="Languages (e.g. Hindi, Telugu)" value={form.languages} onChange={set('languages')} />

          <label className="flex items-center gap-2 pt-1 text-[13px] font-medium text-slate-600">
            <input type="checkbox" checked={form.create_login} onChange={(e) => setForm((f) => ({ ...f, create_login: e.target.checked }))} className="h-4 w-4 rounded border-slate-300 text-brand-blue" />
            Create a login so this doctor can use the Doctor console
          </label>
          {form.create_login && (
            <div className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
              <TextInput placeholder="Doctor's email" value={form.email} onChange={set('email')} error={errors.email} />
              <PasswordInput placeholder="Temporary password" value={form.password} onChange={set('password')} error={errors.password} />
            </div>
          )}
          {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
          <button disabled={busy} className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">
            {busy ? 'Adding…' : 'Add Doctor'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Doctors() {
  const [doctors, setDoctors] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [err, setErr] = useState(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      const [docs, depts] = await Promise.all([doctorsApi.list(), departmentsApi.list()])
      setDoctors(docs)
      setDepartments(depts)
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const deptName = (id) => departments.find((d) => d.department_id === id)?.name || '—'
  const filtered = doctors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()) || d.specialization.toLowerCase().includes(search.toLowerCase()))
  const active = doctors.filter((d) => d.status === 'active').length
  const onLeave = doctors.filter((d) => d.status === 'on_leave').length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Doctors" subtitle="Your clinic's medical team. Add as many doctors as you need.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search doctor…" className="w-40 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
        </div>
        <ToolButton icon={RefreshCw} onClick={load}>Refresh</ToolButton>
        <ToolButton icon={Plus} tone="primary" onClick={() => setShowAdd(true)}>Add Doctor</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard value={doctors.length} label="Total Doctors" icon={Stethoscope} tone="blue" />
        <StatCard value={active} label="Active" icon={UserCheck} tone="green" />
        <StatCard value={onLeave} label="On Leave" icon={UserX} tone="orange" />
      </div>

      {err && <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-400">
          No doctors yet. Click <span className="font-semibold text-brand-blue">Add Doctor</span> to add your first one.
        </Card>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <Card key={d.doctor_id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <Avatar name={d.name || 'Doctor'} className="h-12 w-12 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-brand-navy">{d.name}</p>
                  <p className="text-[12px] text-slate-500">{d.specialization}</p>
                </div>
                <StatusBadge status={STATUS_LABEL[d.status] || d.status} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2.5 text-[12px]">
                <Info icon={IndianRupee} label="Fee" value={`₹${d.consultation_fee}`} />
                <Info icon={Briefcase} label="Experience" value={`${d.experience_years} yrs`} />
                <Info icon={Building2} label="Department" value={deptName(d.department_id)} />
                <Info icon={Stethoscope} label="Login" value={d.user_id ? 'Yes' : 'No'} />
              </div>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <AddDoctorModal
          departments={departments}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

export default Doctors
