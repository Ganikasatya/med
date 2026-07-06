import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Users, Plus, Pencil, Trash2, X } from 'lucide-react'
import { Card, Avatar } from '../clinic/ui.jsx'
import { TextInput, SelectInput, Banner } from '../common/FormControls.jsx'
import { patientsApi } from '../../api'
import { useI18n } from '../../i18n/index.jsx'

const GENDERS = ['Male', 'Female', 'Other']   // backend FamilyMember Gender is capitalised
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']
const RELATIONS = ['Spouse', 'Son', 'Daughter', 'Father', 'Mother', 'Brother', 'Sister', 'Other']
const blank = { name: '', relation: '', gender: '', dob: '', blood_group: '', phone: '' }
const MAX = 5

/** Manage the patient's dependents (≤5). Each can later be booked-for. */
export default function FamilyMembers({ patientId }) {
  const { t } = useI18n()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)   // 'new' | member object | null
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef(null)

  const load = () => {
    setLoading(true)
    patientsApi.family(patientId)
      .then((r) => setMembers((r || []).filter((m) => m.is_active)))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false))
  }
  useEffect(load, [patientId])

  // Open the add form straight away when arrived here via "Add family member"
  // (e.g. from the booking page), then clear the flag so it doesn't re-trigger.
  useEffect(() => {
    if (!searchParams.get('addFamily')) return
    setForm(blank)
    setErr(null)
    setEditing('new')
    const sp = new URLSearchParams(searchParams)
    sp.delete('addFamily')
    setSearchParams(sp, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Scroll the new-member form into view when it opens.
  useEffect(() => {
    if (editing === 'new') formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [editing])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const openNew = () => { setForm(blank); setErr(null); setEditing('new') }
  const openEdit = (m) => {
    setForm({ name: m.name || '', relation: m.relation || '', gender: m.gender || '', dob: m.dob || '', blood_group: m.blood_group || '', phone: m.phone || '' })
    setErr(null); setEditing(m)
  }

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setErr(t('ppage.fullName')); return }
    setBusy(true); setErr(null)
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== '' && v != null))
      if (editing === 'new') await patientsApi.addFamily({ patient_id: patientId, ...body })
      else await patientsApi.updateFamily(editing.member_id, body)
      setEditing(null)
      load()
    } catch (e2) {
      setErr(e2.message || 'Could not save')
    }
    setBusy(false)
  }

  const remove = async (m) => {
    if (!window.confirm(`Remove ${m.name}?`)) return
    try { await patientsApi.removeFamily(m.member_id); load() } catch (e) { setErr(e.message) }
  }

  const atCap = members.length >= MAX

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-600"><Users className="h-5 w-5" /></span>
          <div className="leading-tight">
            <h3 className="text-[15px] font-bold text-brand-navy">{t('ppage.familyTitle')} <span className="text-slate-400">· {members.length}/{MAX}</span></h3>
            <p className="text-[12px] text-slate-400">{t('ppage.familySubtitle')}</p>
          </div>
        </div>
        {editing == null && (
          <button
            onClick={openNew} disabled={atCap}
            title={atCap ? t('ppage.familyMax') : ''}
            className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-blueDark disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" /> {t('ppage.addMember')}
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <p className="py-4 text-center text-[13px] text-slate-400">…</p>
      ) : members.length === 0 && editing == null ? (
        <p className="py-4 text-center text-[13px] text-slate-400">{t('ppage.noFamily')}</p>
      ) : (
        <ul className="space-y-2">
          {members.map((m) => (
            <li key={m.member_id} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
              <Avatar name={m.name} className="h-9 w-9 text-[11px]" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13.5px] font-bold text-brand-navy">{m.name}</p>
                <p className="truncate text-[11.5px] text-slate-400">{[m.relation, m.gender, m.blood_group].filter(Boolean).join(' · ') || '—'}</p>
              </div>
              <button onClick={() => openEdit(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-blue"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(m)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      )}

      {/* Add / edit form */}
      {editing != null && (
        <form ref={formRef} onSubmit={save} className="mt-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[13px] font-bold text-brand-navy">{editing === 'new' ? t('ppage.addMember') : editing.name}</p>
            <button type="button" onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600"><X className="h-4 w-4" /></button>
          </div>
          {err && <div className="mb-2"><Banner type="error">{err}</Banner></div>}
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <TextInput label={t('ppage.fullName')} value={form.name} onChange={set('name')} />
            <SelectInput label={t('ppage.relation')} value={form.relation} onChange={set('relation')}>
              <option value="">{t('pcommon.select')}</option>
              {RELATIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </SelectInput>
            <SelectInput label={t('ppage.gender')} value={form.gender} onChange={set('gender')}>
              <option value="">{t('pcommon.select')}</option>
              {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
            </SelectInput>
            <TextInput label={t('ppage.dob')} type="date" value={form.dob} onChange={set('dob')} />
            <SelectInput label={t('ppage.bloodGroup')} value={form.blood_group} onChange={set('blood_group')}>
              <option value="">{t('pcommon.select')}</option>
              {BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}
            </SelectInput>
            <TextInput label={t('ppage.phone')} prefix="+91" inputMode="numeric" maxLength={10} value={form.phone} onChange={set('phone')} />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600 hover:bg-slate-50">{t('pcommon.cancel')}</button>
            <button type="submit" disabled={busy} className="rounded-lg bg-brand-blue px-4 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60">{busy ? t('pcommon.saving') : t('ppage.saveChanges')}</button>
          </div>
        </form>
      )}
    </Card>
  )
}
