import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Phone, User, MapPin, Droplet, Copy, Check, Printer, IdCard, AlertTriangle, Stethoscope, FileText, CalendarClock, Plus, Activity } from 'lucide-react'
import { Avatar } from '../clinic/ui.jsx'
import { patientsApi, fileUrl } from '../../api'
import { VitalsView, VitalsCaptureForm } from './VitalsPanel.jsx'

/**
 * The patient's full history, shown as a right-side drawer. Shared by the
 * receptionist (assistant) and doctor consoles so both show — and capture —
 * identical history: UHID card, allergies, conditions, documents and visits.
 */

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const SEVERITY_PILL = {
  'Mild': 'bg-amber-100 text-amber-700',
  'Moderate': 'bg-orange-100 text-orange-700',
  'Severe': 'bg-red-100 text-red-700',
  'Life-threatening': 'bg-red-600 text-white',
}

const STATUS_PILL = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  'no-show': 'bg-slate-200 text-slate-600',
  waiting: 'bg-amber-100 text-amber-700',
}

function CopyButton({ value }) {
  const [done, setDone] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setDone(true)
      setTimeout(() => setDone(false), 1400)
    } catch { /* clipboard blocked — ignore */ }
  }
  return (
    <button onClick={copy} title="Copy UHID" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/25">
      {done ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{done ? 'Copied' : 'Copy'}
    </button>
  )
}

/** Patient identity card — shown in the drawer and printed as a take-home slip.
 *  The UHID is the lifetime code the front desk types to pull up the patient. */
export function UhidCard({ patient }) {
  const uhid = patient.uhid || '—'
  return (
    <div className="print-card overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue to-brand-blueDark p-4 text-white shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/70">
            <IdCard className="h-3.5 w-3.5" /> Unique Health ID
          </p>
          <p className="mt-1 font-mono text-[22px] font-extrabold leading-none tracking-wide">{uhid}</p>
          <p className="mt-2 text-[13px] font-semibold">{patient.name}</p>
          <p className="text-[11px] text-white/70">
            {[patient.age && `${patient.age}y`, patient.gender, patient.phone].filter(Boolean).join(' · ')}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 print:hidden">
        <CopyButton value={uhid} />
        <button onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2 py-1 text-[11px] font-semibold text-white hover:bg-white/25">
          <Printer className="h-3.5 w-3.5" /> Print card
        </button>
      </div>
    </div>
  )
}

/* A titled history section: icon + count, an optional header "+ Add" action, an
   optional inline form, and the list (or a muted empty note). */
function HistorySection({ icon: Icon, title, count, tone = 'text-slate-400', children, empty, action, form }) {
  return (
    <div className="mt-5">
      <h4 className="mb-2 flex items-center gap-1.5 text-[13px] font-bold text-brand-navy">
        <Icon className={`h-4 w-4 ${tone}`} /> {title}
        {count > 0 && <span className="text-slate-400">({count})</span>}
        {action && <span className="ml-auto">{action}</span>}
      </h4>
      {form}
      {count === 0 ? <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-[12px] text-slate-400">{empty}</p> : children}
    </div>
  )
}

function AddToggle({ open, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-0.5 text-[11px] font-semibold text-brand-blue hover:bg-blue-50">
      {open ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}{open ? 'Close' : 'Add'}
    </button>
  )
}

const _field = 'w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[12.5px] text-brand-navy outline-none focus:border-brand-blue'

/* Wrapper around an inline add-form: handles busy/error state + Save button. */
function AddForm({ onSubmit, onDone, children, submitLabel = 'Save' }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true); setErr(null)
    try { await onSubmit(); onDone() }
    catch (e2) { setErr(e2.message || 'Could not save'); setBusy(false) }
  }
  return (
    <form onSubmit={submit} className="mb-2 space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
      {children}
      {err && <p className="rounded-lg bg-red-50 px-2 py-1 text-[11px] text-red-600">{err}</p>}
      <button disabled={busy} className="w-full rounded-lg bg-brand-blue py-1.5 text-[12px] font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">
        {busy ? 'Saving…' : submitLabel}
      </button>
    </form>
  )
}

function AddAllergyForm({ patientId, onDone }) {
  const [f, setF] = useState({ allergen: '', allergy_type: 'drug', severity: 'Mild', reaction: '' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <AddForm onDone={onDone} onSubmit={() => {
      if (!f.allergen.trim()) throw new Error('Allergen is required')
      return patientsApi.addAllergy({ patient_id: patientId, ...f, allergen: f.allergen.trim() })
    }}>
      <input className={_field} placeholder="Allergen (e.g. Penicillin)" value={f.allergen} onChange={set('allergen')} />
      <div className="grid grid-cols-2 gap-2">
        <select className={_field} value={f.allergy_type} onChange={set('allergy_type')}>
          {['drug', 'food', 'environmental', 'other'].map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className={_field} value={f.severity} onChange={set('severity')}>
          {['Mild', 'Moderate', 'Severe', 'Life-threatening'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <input className={_field} placeholder="Reaction (optional)" value={f.reaction} onChange={set('reaction')} />
    </AddForm>
  )
}

function AddConditionForm({ patientId, onDone }) {
  const [f, setF] = useState({ condition: '', diagnosed_date: '', is_chronic: false, notes: '' })
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  return (
    <AddForm onDone={onDone} onSubmit={() => {
      if (!f.condition.trim()) throw new Error('Condition is required')
      return patientsApi.addHistory({
        patient_id: patientId, condition: f.condition.trim(), is_chronic: f.is_chronic,
        diagnosed_date: f.diagnosed_date || undefined, notes: f.notes,
      })
    }}>
      <input className={_field} placeholder="Condition (e.g. Type 2 Diabetes)" value={f.condition} onChange={set('condition')} />
      <div className="grid grid-cols-2 items-center gap-2">
        <input type="date" className={_field} value={f.diagnosed_date} onChange={set('diagnosed_date')} />
        <label className="flex items-center gap-1.5 text-[12px] font-medium text-slate-600">
          <input type="checkbox" checked={f.is_chronic} onChange={(e) => setF((s) => ({ ...s, is_chronic: e.target.checked }))} /> Chronic
        </label>
      </div>
      <input className={_field} placeholder="Notes (optional)" value={f.notes} onChange={set('notes')} />
    </AddForm>
  )
}

function UploadDocForm({ patientId, onDone }) {
  const [docType, setDocType] = useState('prescription')
  const [file, setFile] = useState(null)
  return (
    <AddForm onDone={onDone} submitLabel="Upload" onSubmit={() => {
      if (!file) throw new Error('Choose a file first')
      const fd = new FormData()
      fd.append('patient_id', patientId)
      fd.append('document_type', docType)
      fd.append('file', file)
      return patientsApi.uploadDocument(fd)
    }}>
      <select className={_field} value={docType} onChange={(e) => setDocType(e.target.value)}>
        {['prescription', 'lab_report', 'scan', 'id_proof', 'other'].map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
      </select>
      <input type="file" className="w-full text-[11.5px] text-slate-500 file:mr-2 file:rounded-lg file:border-0 file:bg-brand-blueLight file:px-2 file:py-1 file:text-[11px] file:font-semibold file:text-brand-blue" onChange={(e) => setFile(e.target.files?.[0] || null)} />
    </AddForm>
  )
}

export default function PatientHistoryDrawer({ patient, onClose }) {
  const pid = patient.patient_id
  const [appts, setAppts] = useState(null)
  const [allergies, setAllergies] = useState(null)
  const [history, setHistory] = useState(null)
  const [docs, setDocs] = useState(null)
  const [vitals, setVitals] = useState(null)
  const [openForm, setOpenForm] = useState(null)  // 'allergy' | 'condition' | 'doc' | 'vitals'

  const loadAllergies = useCallback(() => patientsApi.allergies(pid).then(setAllergies).catch(() => setAllergies([])), [pid])
  const loadHistory = useCallback(() => patientsApi.medicalHistory(pid).then(setHistory).catch(() => setHistory([])), [pid])
  const loadDocs = useCallback(() => patientsApi.documents(pid).then(setDocs).catch(() => setDocs([])), [pid])
  const loadVitals = useCallback(() => patientsApi.vitals(pid).then(setVitals).catch(() => setVitals([])), [pid])

  useEffect(() => {
    patientsApi.appointments(pid).then(setAppts).catch(() => setAppts([]))
    loadAllergies(); loadHistory(); loadDocs(); loadVitals()
  }, [pid, loadAllergies, loadHistory, loadDocs, loadVitals])

  const toggle = (name) => () => setOpenForm((cur) => (cur === name ? null : name))
  const afterAdd = (reload) => () => { setOpenForm(null); reload() }

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
      <motion.div initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }} transition={{ type: 'spring', stiffness: 320, damping: 32 }} className="flex h-full w-full max-w-[440px] flex-col bg-white shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <h3 className="text-[15px] font-bold text-brand-navy">Patient History</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="flex items-center gap-3">
            <Avatar name={patient.name} className="h-14 w-14 text-lg" />
            <div className="leading-tight">
              <p className="text-[17px] font-extrabold text-brand-navy">{patient.name}</p>
              <p className="font-mono text-[12px] font-bold text-brand-blue">{patient.uhid || `PID #${patient.patient_id}`}</p>
            </div>
          </div>
          <div className="mt-4">
            <UhidCard patient={patient} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Detail icon={Phone} label="Mobile" value={patient.phone} />
            <Detail icon={User} label="Age / Gender" value={[patient.age && `${patient.age}y`, patient.gender].filter(Boolean).join(' · ')} />
            <Detail icon={Droplet} label="Blood Group" value={patient.blood_group} />
            <Detail icon={MapPin} label="City" value={patient.city} />
          </div>

          {/* Allergies first — safety critical */}
          <HistorySection icon={AlertTriangle} title="Allergies" tone="text-red-500" count={allergies?.length || 0} empty={allergies === null ? 'Loading…' : 'No known allergies.'}
            action={<AddToggle open={openForm === 'allergy'} onClick={toggle('allergy')} />}
            form={openForm === 'allergy' && <AddAllergyForm patientId={pid} onDone={afterAdd(loadAllergies)} />}>
            <ul className="space-y-2">
              {(allergies || []).map((a) => (
                <li key={a.allergy_id} className="flex items-center justify-between rounded-xl border border-red-100 bg-red-50/50 px-3 py-2 text-[12.5px]">
                  <span className="font-semibold text-brand-navy">{a.allergen}<span className="ml-1 font-normal text-slate-400">· {a.allergy_type}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${SEVERITY_PILL[a.severity] || 'bg-slate-100 text-slate-500'}`}>{a.severity}</span>
                </li>
              ))}
            </ul>
          </HistorySection>

          {/* Vitals & measurements — the "now" snapshot, captured at check-in */}
          <HistorySection icon={Activity} title="Vitals & Measurements" tone="text-rose-500" count={vitals?.length || 0} empty={vitals === null ? 'Loading…' : 'No vitals recorded yet.'}
            action={<AddToggle open={openForm === 'vitals'} onClick={toggle('vitals')} />}
            form={openForm === 'vitals' && (
              <div className="mb-2">
                <VitalsCaptureForm patientId={pid} onDone={afterAdd(loadVitals)} />
              </div>
            )}>
            <VitalsView vitals={vitals} />
          </HistorySection>

          {/* Medical history / conditions */}
          <HistorySection icon={Stethoscope} title="Medical History" tone="text-brand-blue" count={history?.length || 0} empty={history === null ? 'Loading…' : 'No conditions recorded.'}
            action={<AddToggle open={openForm === 'condition'} onClick={toggle('condition')} />}
            form={openForm === 'condition' && <AddConditionForm patientId={pid} onDone={afterAdd(loadHistory)} />}>
            <ul className="space-y-2">
              {(history || []).map((h) => (
                <li key={h.history_id} className="rounded-xl border border-slate-100 px-3 py-2 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-brand-navy">{h.condition}</span>
                    {h.is_chronic && <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-600">Chronic</span>}
                  </div>
                  {(h.diagnosed_date || h.notes) && (
                    <p className="mt-0.5 text-[11px] text-slate-400">{[h.diagnosed_date && `Dx ${fmtDate(h.diagnosed_date)}`, h.notes].filter(Boolean).join(' · ')}</p>
                  )}
                </li>
              ))}
            </ul>
          </HistorySection>

          {/* Documents */}
          <HistorySection icon={FileText} title="Documents" tone="text-emerald-500" count={docs?.length || 0} empty={docs === null ? 'Loading…' : 'No documents uploaded.'}
            action={<AddToggle open={openForm === 'doc'} onClick={toggle('doc')} />}
            form={openForm === 'doc' && <UploadDocForm patientId={pid} onDone={afterAdd(loadDocs)} />}>
            <ul className="space-y-2">
              {(docs || []).map((d) => (
                <li key={d.document_id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2 text-[12.5px]">
                  <span className="truncate font-semibold text-brand-navy">{d.file_name}<span className="ml-1 font-normal capitalize text-slate-400">· {d.document_type?.replace('_', ' ')}</span></span>
                  <a href={fileUrl(d.file_url)} target="_blank" rel="noreferrer" className="ml-2 shrink-0 rounded-lg bg-brand-blueLight px-2 py-1 text-[11px] font-semibold text-brand-blue hover:bg-blue-100">Open</a>
                </li>
              ))}
            </ul>
          </HistorySection>

          {/* Visit history — when, why, which doctor, which clinic */}
          <HistorySection icon={CalendarClock} title="Visit History" count={appts?.length || 0} empty={appts === null ? 'Loading…' : 'No visits yet.'}>
            <ul className="space-y-2">
              {(appts || []).slice(0, 12).map((a) => (
                <li key={a.appointment_id} className="rounded-xl border border-slate-100 px-3 py-2.5 text-[12.5px]">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-brand-navy">{fmtDate(a.appointment_date)}{a.slot_time ? ` · ${a.slot_time.slice(0, 5)}` : ''}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${STATUS_PILL[a.status] || 'bg-slate-100 text-slate-500'}`}>{a.status}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-[12px] text-slate-600">
                    <Stethoscope className="h-3.5 w-3.5 text-brand-blue" />
                    <span className="font-semibold">{a.doctor_name ? `Dr. ${a.doctor_name}` : 'Doctor'}</span>
                    {a.doctor_specialty && <span className="text-slate-400">· {a.doctor_specialty}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-slate-400">
                    {a.appointment_type && <span className="capitalize">Purpose: {a.appointment_type}</span>}
                    {a.hospital_name && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{a.hospital_name}</span>}
                  </div>
                  {a.notes && <p className="mt-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] text-slate-500">{a.notes}</p>}
                </li>
              ))}
            </ul>
          </HistorySection>
        </div>
      </motion.div>
    </motion.div>
  )
}
