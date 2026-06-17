import { useEffect, useState } from 'react'
import { Users, UserCheck, UserX, Plus, Search, RefreshCw, X, Mail, Phone, BadgeCheck, Briefcase, Trash2 } from 'lucide-react'
import { Card, StatusBadge, StatCard, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { TextInput, PasswordInput } from '../../components/common/FormControls.jsx'
import { receptionApi } from '../../api'

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
      <Icon className="h-4 w-4 text-slate-400" />
      <div className="min-w-0 leading-tight">
        <p className="truncate font-bold text-brand-navy">{value || '—'}</p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function AddStaffModal({ onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', designation: 'Front Desk Executive', employee_id: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!form.name.trim()) er.name = 'Required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = 'Valid email required'
    if (form.phone && !/^\d{10}$/.test(form.phone)) er.phone = '10 digits'
    if (!form.password || form.password.length < 6) er.password = 'Min 6 characters'
    setErrors(er)
    if (Object.keys(er).length) return

    setBusy(true)
    setErr(null)
    try {
      await receptionApi.onboard({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
        designation: form.designation,
        employee_id: form.employee_id.trim() || undefined,
      })
      onAdded()
    } catch (e2) {
      setErr(e2.message || 'Could not add staff member')
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-brand-navy">Add Receptionist</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <TextInput icon={Users} placeholder="Full Name" value={form.name} onChange={set('name')} error={errors.name} />
          <TextInput icon={Mail} placeholder="Email (used to log in)" value={form.email} onChange={set('email')} error={errors.email} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput icon={Phone} placeholder="Mobile (10 digits)" inputMode="numeric" value={form.phone} onChange={set('phone')} error={errors.phone} />
            <TextInput icon={BadgeCheck} placeholder="Employee ID (optional)" value={form.employee_id} onChange={set('employee_id')} />
          </div>
          <TextInput icon={Briefcase} placeholder="Designation" value={form.designation} onChange={set('designation')} />
          <PasswordInput icon={undefined} placeholder="Temporary password" value={form.password} onChange={set('password')} error={errors.password} />
          {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
          <button disabled={busy} className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">
            {busy ? 'Adding…' : 'Add Receptionist'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Staff() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [err, setErr] = useState(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      setStaff(await receptionApi.list())
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const deactivate = async (s) => {
    if (!window.confirm(`Deactivate ${s.name || 'this receptionist'}? They will no longer be able to log in.`)) return
    try {
      await receptionApi.remove(s.receptionist_id)
      load()
    } catch (e) {
      setErr(e.message)
    }
  }

  const filtered = staff.filter((s) => (s.name || '').toLowerCase().includes(search.toLowerCase()))
  const active = staff.filter((s) => s.is_active).length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Staff" subtitle="Receptionists / front-desk users for your clinic. Each can log in and manage the queue.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff…" className="w-40 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
        </div>
        <ToolButton icon={RefreshCw} onClick={load}>Refresh</ToolButton>
        <ToolButton icon={Plus} tone="primary" onClick={() => setShowAdd(true)}>Add Receptionist</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-2 gap-3">
        <StatCard value={staff.length} label="Total Staff" icon={Users} tone="blue" />
        <StatCard value={active} label="Active" icon={UserCheck} tone="green" />
      </div>

      {err && <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-400">
          No receptionists yet. Click <span className="font-semibold text-brand-blue">Add Receptionist</span> to add your first front-desk user.
        </Card>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <Card key={s.receptionist_id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <Avatar name={s.name || 'Staff'} className="h-12 w-12 text-base" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-brand-navy">{s.name || 'Receptionist'}</p>
                  <p className="text-[12px] text-slate-500">{s.designation}</p>
                </div>
                <StatusBadge status={s.is_active ? 'Active' : 'Inactive'} />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-2.5 text-[12px]">
                <Info icon={Mail} label="Email" value={s.email} />
                <Info icon={Phone} label="Phone" value={s.phone} />
                {s.employee_id && <Info icon={BadgeCheck} label="Employee ID" value={s.employee_id} />}
              </div>
              {s.is_active && (
                <button
                  onClick={() => deactivate(s)}
                  className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-1.5 text-[12px] font-semibold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Deactivate
                </button>
              )}
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <AddStaffModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

export default Staff
