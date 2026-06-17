import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, UserPlus, RefreshCw, X, Phone, User, MapPin, Droplet, Calendar, ChevronLeft, ChevronRight, Filter, Eye } from 'lucide-react'
import { Card, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { TextInput } from '../../components/common/FormControls.jsx'
import AnimatedNumber from '../../components/common/AnimatedNumber.jsx'
import { patientsApi } from '../../api'
import { useAuth } from '../../context/AuthContext.jsx'

const SOURCE_PILL = {
  walkin: 'bg-slate-100 text-slate-600',
  app: 'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
  csc: 'bg-purple-100 text-purple-600',
  phone: 'bg-orange-100 text-orange-600',
}
const SOURCE_LABEL = { walkin: 'Walk-in', app: 'App', whatsapp: 'WhatsApp', csc: 'CSC', phone: 'Phone' }
const PAGE_SIZE = 12

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/* ---------------- Add Patient modal ---------------- */
function AddPatientModal({ hospitalId, onClose, onAdded }) {
  const [form, setForm] = useState({ name: '', phone: '', gender: 'Male', age: '', blood_group: '', city: '' })
  const [errors, setErrors] = useState({})
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    const er = {}
    if (!form.name.trim()) er.name = 'Required'
    if (!/^\d{10}$/.test(form.phone)) er.phone = 'Enter a valid 10-digit number'
    setErrors(er)
    if (Object.keys(er).length) return
    setBusy(true)
    setErr(null)
    try {
      await patientsApi.create({
        hospital_id: hospitalId,
        name: form.name.trim(),
        phone: form.phone,
        gender: form.gender,
        age: form.age ? Number(form.age) : undefined,
        blood_group: form.blood_group || undefined,
        city: form.city,
        registration_source: 'walkin',
      })
      onAdded()
    } catch (e2) {
      setErr(e2.message || 'Could not register patient')
    }
    setBusy(false)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-[460px] rounded-2xl bg-white p-6 shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-brand-navy">Add Patient</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <TextInput icon={User} placeholder="Full Name" value={form.name} onChange={set('name')} error={errors.name} />
          <TextInput icon={Phone} prefix="+91" placeholder="Mobile Number" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} error={errors.phone} />
          <div className="grid grid-cols-3 gap-3">
            <select value={form.gender} onChange={set('gender')} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-navy">
              <option>Male</option><option>Female</option><option>Other</option>
            </select>
            <input type="number" placeholder="Age" value={form.age} onChange={set('age')} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-navy" />
            <select value={form.blood_group} onChange={set('blood_group')} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-navy">
              <option value="">Blood</option>
              {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
          <TextInput icon={MapPin} placeholder="City / Village" value={form.city} onChange={set('city')} />
          {err && <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{err}</div>}
          <button disabled={busy} className="w-full rounded-xl bg-brand-blue py-3 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">
            {busy ? 'Saving…' : 'Register Patient'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  )
}

/* ---------------- Profile drawer ---------------- */
function ProfileDrawer({ patient, onClose }) {
  const [appts, setAppts] = useState(null)
  useEffect(() => {
    patientsApi.appointments(patient.patient_id).then(setAppts).catch(() => setAppts([]))
  }, [patient.patient_id])

  const Detail = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5">
      <Icon className="h-4 w-4 text-slate-400" />
      <div className="leading-tight">
        <p className="text-[13px] font-bold text-brand-navy">{value || '—'}</p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex justify-end bg-slate-900/50" onMouseDown={onClose}>
      <motion.div initial={{ x: 380 }} animate={{ x: 0 }} exit={{ x: 380 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="flex h-full w-full max-w-[400px] flex-col bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h3 className="text-[15px] font-bold text-brand-navy">Patient Profile</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-3">
            <Avatar name={patient.name} className="h-14 w-14 text-lg" />
            <div className="leading-tight">
              <p className="text-[17px] font-extrabold text-brand-navy">{patient.name}</p>
              <p className="text-[12px] text-slate-400">PID #{patient.patient_id}</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Detail icon={Phone} label="Mobile" value={patient.phone} />
            <Detail icon={User} label="Age / Gender" value={[patient.age && `${patient.age}y`, patient.gender].filter(Boolean).join(' · ')} />
            <Detail icon={Droplet} label="Blood Group" value={patient.blood_group} />
            <Detail icon={MapPin} label="City" value={patient.city} />
          </div>
          <h4 className="mb-2 mt-6 text-[13px] font-bold text-brand-navy">Recent Appointments</h4>
          {appts === null ? (
            <p className="py-4 text-center text-sm text-slate-400">Loading…</p>
          ) : appts.length === 0 ? (
            <p className="py-4 text-center text-sm text-slate-400">No appointments yet.</p>
          ) : (
            <ul className="space-y-2">
              {appts.slice(0, 6).map((a) => (
                <li key={a.appointment_id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[12.5px]">
                  <span className="font-semibold text-brand-navy">{fmtDate(a.appointment_date)}</span>
                  <span className="capitalize text-slate-500">{a.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ---------------- Page ---------------- */
export default function AssistantPatients() {
  const { user } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [search, setSearch] = useState('')
  const [gender, setGender] = useState('')
  const [blood, setBlood] = useState('')
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [profile, setProfile] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      setRows(await patientsApi.list({ search: search.trim() || undefined, page, size: PAGE_SIZE }))
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }, [search, page])
  useEffect(() => { load() }, [load])

  // Client-side refine on the loaded page (gender / blood group).
  const filtered = rows.filter((p) =>
    (!gender || p.gender === gender) && (!blood || p.blood_group === blood)
  )

  const resetFilters = () => { setSearch(''); setGender(''); setBlood(''); setPage(1) }

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title="Patient List"
        subtitle="View and manage all registered patients."
      >
        <ToolButton icon={RefreshCw} onClick={load}>Refresh</ToolButton>
        <ToolButton icon={UserPlus} tone="primary" onClick={() => setShowAdd(true)}>Add Patient</ToolButton>
      </PageHeading>

      {/* Filter bar */}
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name or mobile…"
              className="w-full bg-transparent py-2.5 text-sm outline-none placeholder:text-slate-400"
            />
          </div>
          <select value={gender} onChange={(e) => setGender(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600">
            <option value="">All Genders</option><option>Male</option><option>Female</option><option>Other</option>
          </select>
          <select value={blood} onChange={(e) => setBlood(e.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600">
            <option value="">All Blood Groups</option>
            {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map((b) => <option key={b}>{b}</option>)}
          </select>
          <button onClick={resetFilters} className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50">
            <Filter className="h-4 w-4" /> Reset
          </button>
        </div>
      </Card>

      {err && <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>}

      {/* Table */}
      <Card className="!p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[15px] font-bold text-brand-navy">
            All Patients <span className="text-slate-400">(<AnimatedNumber value={filtered.length} />)</span>
          </h3>
        </div>
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">Loading patients…</p>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No patients found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-5 py-2.5">Patient</th>
                  <th className="px-3 py-2.5">Age / Gender</th>
                  <th className="px-3 py-2.5">Mobile</th>
                  <th className="px-3 py-2.5">Blood</th>
                  <th className="px-3 py-2.5">City</th>
                  <th className="px-3 py-2.5">Source</th>
                  <th className="px-3 py-2.5">Registered</th>
                  <th className="px-5 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-[13px]">
                <AnimatePresence initial={false}>
                  {filtered.map((p, i) => (
                    <motion.tr
                      key={p.patient_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.025, 0.4) }}
                      className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar name={p.name} className="h-9 w-9 text-[11px]" />
                          <div className="leading-tight">
                            <p className="font-bold text-brand-navy">{p.name}</p>
                            <p className="text-[11px] text-slate-400">PID #{p.patient_id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{[p.age && `${p.age}y`, p.gender].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-3 py-2.5 text-slate-500">{p.phone}</td>
                      <td className="px-3 py-2.5">
                        {p.blood_group ? <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[11px] font-bold text-red-500">{p.blood_group}</span> : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-slate-500">{p.city || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${SOURCE_PILL[p.registration_source] || 'bg-slate-100 text-slate-500'}`}>
                          {SOURCE_LABEL[p.registration_source] || p.registration_source}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">{fmtDate(p.created_at)}</td>
                      <td className="px-5 py-2.5 text-right">
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setProfile(p)}
                          className="inline-flex items-center gap-1 rounded-lg bg-brand-blueLight px-2.5 py-1.5 text-[12px] font-semibold text-brand-blue hover:bg-blue-100"
                        >
                          <Eye className="h-3.5 w-3.5" /> View
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
          <span className="text-[12px] text-slate-400">Page {page}{rows.length < PAGE_SIZE ? ' · last' : ''}</span>
          <div className="flex gap-1.5">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button disabled={rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {showAdd && (
          <AddPatientModal
            hospitalId={user?.hospital_id}
            onClose={() => setShowAdd(false)}
            onAdded={() => { setShowAdd(false); load() }}
          />
        )}
        {profile && <ProfileDrawer patient={profile} onClose={() => setProfile(null)} />}
      </AnimatePresence>
    </div>
  )
}
