import { useEffect, useState } from 'react'
import { Building2, Plus, Search, RefreshCw, X, Layers, Trash2 } from 'lucide-react'
import { Card, StatusBadge, StatCard, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { TextInput } from '../../components/common/FormControls.jsx'
import { departmentsApi } from '../../api'
import { useAuth } from '../../context/AuthContext.jsx'

function AddDepartmentModal({ hospitalId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', code: '', floor: '', description: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!form.name.trim()) er.name = 'Required'
    setErrors(er)
    if (Object.keys(er).length) return

    setBusy(true)
    setErr(null)
    try {
      await departmentsApi.create({
        hospital_id: hospitalId,
        name: form.name.trim(),
        code: form.code.trim(),
        floor: form.floor.trim(),
        description: form.description.trim(),
      })
      onAdded()
    } catch (e2) {
      setErr(e2.message || 'Could not add department')
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-[440px] rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-brand-navy">Add Department</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <TextInput icon={Building2} placeholder="Department Name (e.g. Psychology)" value={form.name} onChange={set('name')} error={errors.name} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput placeholder="Code (e.g. PSY)" value={form.code} onChange={set('code')} />
            <TextInput placeholder="Floor (e.g. 2nd)" value={form.floor} onChange={set('floor')} />
          </div>
          <TextInput placeholder="Description (optional)" value={form.description} onChange={set('description')} />
          {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
          <button disabled={busy} className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">
            {busy ? 'Adding…' : 'Add Department'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Departments() {
  const { user } = useAuth()
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [err, setErr] = useState(null)

  const load = async () => {
    setLoading(true)
    setErr(null)
    try {
      setDepartments(await departmentsApi.list())
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const deactivate = async (d) => {
    if (!window.confirm(`Deactivate "${d.name}"? Doctors already in it keep their record, but it won't be selectable for new doctors.`)) return
    try {
      await departmentsApi.remove(d.department_id)
      load()
    } catch (e) {
      setErr(e.message)
    }
  }

  const filtered = departments.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
  const activeCount = departments.filter((d) => d.is_active).length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Departments" subtitle="Organise your clinic into departments. Doctors are assigned to one when you add them.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search department…" className="w-40 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
        </div>
        <ToolButton icon={RefreshCw} onClick={load}>Refresh</ToolButton>
        <ToolButton icon={Plus} tone="primary" onClick={() => setShowAdd(true)}>Add Department</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-2 gap-3">
        <StatCard value={departments.length} label="Total Departments" icon={Layers} tone="blue" />
        <StatCard value={activeCount} label="Active" icon={Building2} tone="green" />
      </div>

      {err && <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>}

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-400">
          No departments yet. Click <span className="font-semibold text-brand-blue">Add Department</span> to create your first one.
        </Card>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((d) => (
            <Card key={d.department_id} className="flex flex-col">
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  <Building2 className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-brand-navy">{d.name}</p>
                  <p className="text-[12px] text-slate-500">{d.code || '—'}{d.floor ? ` · ${d.floor} floor` : ''}</p>
                </div>
                <StatusBadge status={d.is_active ? 'Active' : 'Inactive'} />
              </div>
              {d.description && <p className="mt-3 text-[12px] text-slate-500">{d.description}</p>}
              {d.is_active && (
                <button
                  onClick={() => deactivate(d)}
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
        <AddDepartmentModal
          hospitalId={user?.hospital_id}
          onClose={() => setShowAdd(false)}
          onAdded={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

export default Departments
