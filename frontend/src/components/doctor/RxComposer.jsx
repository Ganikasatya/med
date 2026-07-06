import { useEffect, useState } from 'react'
import { X, Plus, Trash2, Pill, CheckCircle2, AlertTriangle } from 'lucide-react'
import { prescriptionsApi, patientsApi } from '../../api'

const blankItem = () => ({ drug_name: '', dosage: '', frequency: '', duration: '', instructions: '' })

/**
 * Modal for a doctor to write a prescription for a patient.
 * Props: patientId, doctorId, appointmentId?, patientName?, defaultFamilyMemberId?, onClose, onSaved?
 */
export default function RxComposer({ patientId, doctorId, appointmentId, patientName, defaultFamilyMemberId, onClose, onSaved }) {
  const [diagnosis, setDiagnosis] = useState('')
  const [advice, setAdvice] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [items, setItems] = useState([blankItem()])
  const [family, setFamily] = useState([])
  const [forWhom, setForWhom] = useState(defaultFamilyMemberId ? String(defaultFamilyMemberId) : 'self')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    if (!patientId) return
    patientsApi.family(patientId)
      .then((r) => setFamily((r || []).filter((m) => m.is_active)))
      .catch(() => setFamily([]))
  }, [patientId])

  const setItem = (i, k) => (e) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, [k]: e.target.value } : it)))
  const addItem = () => setItems((list) => [...list, blankItem()])
  const removeItem = (i) => setItems((list) => (list.length > 1 ? list.filter((_, idx) => idx !== i) : list))

  const save = async () => {
    const meds = items.filter((it) => it.drug_name.trim())
    if (!meds.length) {
      setErr('Add at least one medicine.')
      return
    }
    setBusy(true)
    setErr(null)
    try {
      await prescriptionsApi.create({
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointmentId || null,
        family_member_id: forWhom === 'self' ? null : Number(forWhom),
        diagnosis: diagnosis.trim(),
        advice: advice.trim(),
        follow_up_date: followUp || null,
        items: meds,
      })
      onSaved?.()
      onClose()
    } catch (e) {
      setErr(e.message || 'Could not save prescription')
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue"><Pill className="h-5 w-5" /></span>
            <div>
              <h3 className="text-[17px] font-bold text-brand-navy">Write Prescription</h3>
              {patientName && <p className="text-[12px] text-slate-400">For {patientName}</p>}
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-5 w-5" /></button>
        </div>

        {family.length > 0 && (
          <div className="mb-3">
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Prescription for</label>
            <select value={forWhom} onChange={(e) => setForWhom(e.target.value)} className="field-input">
              <option value="self">{patientName || 'Self'}</option>
              {family.map((m) => (
                <option key={m.member_id} value={String(m.member_id)}>{m.name}{m.relation ? ` — ${m.relation}` : ''}</option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-3">
          <label className="mb-1 block text-[12px] font-semibold text-slate-600">Diagnosis</label>
          <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Viral fever" className="field-input" />
        </div>

        <div className="mb-2 flex items-center justify-between">
          <label className="text-[12px] font-semibold text-slate-600">Medicines</label>
          <button onClick={addItem} className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] font-semibold text-brand-blue hover:bg-brand-blueLight/40">
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-xl border border-slate-100 p-2.5">
              <div className="flex items-center gap-2">
                <input value={it.drug_name} onChange={setItem(i, 'drug_name')} placeholder="Medicine name *" className="field-input flex-1" />
                <input value={it.dosage} onChange={setItem(i, 'dosage')} placeholder="Dosage (500 mg)" className="field-input w-32" />
                <button onClick={() => removeItem(i)} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                <input value={it.frequency} onChange={setItem(i, 'frequency')} placeholder="Frequency (1-0-1)" className="field-input" />
                <input value={it.duration} onChange={setItem(i, 'duration')} placeholder="Duration (5 days)" className="field-input" />
                <input value={it.instructions} onChange={setItem(i, 'instructions')} placeholder="Instructions (after food)" className="field-input" />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Advice</label>
            <input value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Rest, fluids…" className="field-input" />
          </div>
          <div>
            <label className="mb-1 block text-[12px] font-semibold text-slate-600">Follow-up date</label>
            <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="field-input" />
          </div>
        </div>

        {err && (
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4 shrink-0" /> {err}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={busy} className="flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2 text-sm font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">
            <CheckCircle2 className="h-4 w-4" /> {busy ? 'Saving…' : 'Save Prescription'}
          </button>
        </div>
      </div>
    </div>
  )
}
