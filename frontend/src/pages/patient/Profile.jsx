import { useState } from 'react'
import { Pencil, Phone, Mail, Cake, User2, Droplet, MapPin, Globe, ShieldAlert, Fingerprint, X, Camera } from 'lucide-react'
import { Card, Avatar, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { TextInput, SelectInput, Banner } from '../../components/common/FormControls.jsx'
import FamilyMembers from '../../components/patient/FamilyMembers.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { patientsApi, fileUrl } from '../../api'
import { useI18n } from '../../i18n/index.jsx'

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[11.5px] font-semibold text-slate-400">{label}</p>
        <p className="text-[13.5px] font-semibold text-brand-navy">{value || '—'}</p>
      </div>
    </div>
  )
}

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Marathi']
const GENDERS = ['male', 'female', 'other']
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

/** Display a stored 14-digit ABHA number as XX-XXXX-XXXX-XXXX. */
const formatAbha = (v) => {
  if (!v) return ''
  const d = String(v).replace(/\D/g, '')
  if (d.length !== 14) return v
  return `${d.slice(0, 2)}-${d.slice(2, 6)}-${d.slice(6, 10)}-${d.slice(10, 14)}`
}

/** Edit modal — updates the patient's own record via PUT /patients/{id}. */
const GENDER_KEYS = { male: 'ppage.genderMale', female: 'ppage.genderFemale', other: 'ppage.genderOther' }

function EditProfileModal({ patient, onClose, onSaved }) {
  const { t } = useI18n()
  const [form, setForm] = useState({
    name: patient.name || '',
    email: patient.email || '',
    dob: patient.dob || '',
    gender: patient.gender || '',
    blood_group: patient.blood_group || '',
    address: patient.address || '',
    city: patient.city || '',
    pincode: patient.pincode || '',
    emergency_contact_name: patient.emergency_contact_name || '',
    emergency_contact_phone: patient.emergency_contact_phone || '',
    preferred_language: patient.preferred_language || 'English',
    abha_number: patient.abha_number || '',
    abha_address: patient.abha_address || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [photoUrl, setPhotoUrl] = useState(patient.photo_url || null)
  const [photoBusy, setPhotoBusy] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  // Photo uploads persist immediately (separate from the Save button).
  const onPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const updated = await patientsApi.uploadPhoto(patient.patient_id, fd)
      setPhotoUrl(updated.photo_url)
      onSaved(updated)
    } catch (err) {
      setError(err.message || 'Could not upload photo')
    } finally {
      setPhotoBusy(false)
    }
  }

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      // Only send filled values; leave the rest untouched server-side.
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v !== ''))
      const updated = await patientsApi.update(patient.patient_id, body)
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err.message || t('ppage.couldNotSaveProfile'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={save}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-brand-navy">{t('ppage.editProfileTitle')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && <div className="mb-4"><Banner type="error">{error}</Banner></div>}

        {/* Profile photo */}
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="relative">
            {photoUrl ? (
              <img src={fileUrl(photoUrl)} alt={patient.name} className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100" />
            ) : (
              <Avatar name={patient.name} className="h-24 w-24 text-2xl" />
            )}
            <label className={`absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-brand-blue text-white shadow-md hover:bg-brand-blueDark ${photoBusy ? 'opacity-60' : 'cursor-pointer'}`}>
              <Camera className="h-4 w-4" />
              <input type="file" accept="image/*" className="hidden" onChange={onPhoto} disabled={photoBusy} />
            </label>
          </div>
          <p className="text-[12px] text-slate-400">{photoBusy ? 'Uploading…' : 'Tap the camera to add or change your photo'}</p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput label={t('ppage.fullName')} value={form.name} onChange={set('name')} />
          <TextInput label={t('ppage.email')} type="email" value={form.email} onChange={set('email')} />
          <TextInput label={t('ppage.dob')} type="date" value={form.dob} onChange={set('dob')} />
          <SelectInput label={t('ppage.gender')} value={form.gender} onChange={set('gender')}>
            <option value="">{t('pcommon.select')}</option>
            {GENDERS.map((g) => <option key={g} value={g}>{t(GENDER_KEYS[g])}</option>)}
          </SelectInput>
          <SelectInput label={t('ppage.bloodGroup')} value={form.blood_group} onChange={set('blood_group')}>
            <option value="">{t('pcommon.select')}</option>
            {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
          </SelectInput>
          <SelectInput label={t('ppage.preferredLanguage')} value={form.preferred_language} onChange={set('preferred_language')}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </SelectInput>
          <div className="sm:col-span-2">
            <TextInput label={t('ppage.address')} value={form.address} onChange={set('address')} />
          </div>
          <TextInput label={t('ppage.city')} value={form.city} onChange={set('city')} />
          <TextInput label={t('ppage.pincode')} value={form.pincode} onChange={set('pincode')} />
          <TextInput label={t('ppage.emergencyName')} value={form.emergency_contact_name} onChange={set('emergency_contact_name')} />
          <TextInput label={t('ppage.emergencyPhone')} value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} />

          <div className="mt-1 flex items-center gap-2 sm:col-span-2">
            <Fingerprint className="h-4 w-4 text-brand-green" />
            <span className="text-[13px] font-bold text-brand-navy">{t('ppage.abhaSection')}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-semibold text-slate-500">{t('ppage.abhaOptional')}</span>
          </div>
          <TextInput
            label={t('ppage.abhaNumber')}
            value={form.abha_number}
            onChange={set('abha_number')}
            placeholder={t('ppage.abhaNumberHint')}
            inputMode="numeric"
            maxLength={20}
          />
          <TextInput
            label={t('ppage.abhaAddress')}
            value={form.abha_address}
            onChange={set('abha_address')}
            placeholder={t('ppage.abhaAddressHint')}
          />
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <ToolButton type="button" onClick={onClose}>{t('pcommon.cancel')}</ToolButton>
          <ToolButton type="submit" tone="primary" disabled={saving}>
            {saving ? t('pcommon.saving') : t('ppage.saveChanges')}
          </ToolButton>
        </div>
      </form>
    </div>
  )
}

/** Patient profile & settings, backed by the logged-in patient's record. */
function Profile() {
  const { t } = useI18n()
  const { patient, loading, setPatient } = usePatientCtx()
  const [editing, setEditing] = useState(false)

  if (loading) return <p className="text-sm text-slate-400">{t('ppage.loadingProfile')}</p>
  if (!patient) return <p className="text-sm text-slate-400">{t('ppage.noProfile')}</p>

  const dobDisplay = patient.dob
    ? new Date(patient.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : ''

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={t('ppage.profileTitle')} subtitle={t('ppage.profileSubtitle')}>
        <ToolButton icon={Pencil} tone="primary" onClick={() => setEditing(true)}>{t('ppage.editProfile')}</ToolButton>
      </PageHeading>

      {/* Identity header */}
      <Card className="flex flex-wrap items-center gap-4 p-5">
        {patient.photo_url ? (
          <img src={fileUrl(patient.photo_url)} alt={patient.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-100" />
        ) : (
          <Avatar name={patient.name} className="h-16 w-16 text-xl" />
        )}
        <div className="leading-tight">
          <p className="text-[18px] font-extrabold text-brand-navy">{patient.name}</p>
          <p className="text-[13px] text-slate-500">{patient.email || '—'}</p>
          <p className="text-[12.5px] text-slate-400">{patient.phone}</p>
        </div>
        <span className={`ml-auto rounded-full px-3 py-1 text-[12px] font-semibold ${patient.is_registered ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
          {patient.is_registered ? t('ppage.verifiedPatient') : t('ppage.unverified')}
        </span>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-bold text-brand-navy">{t('ppage.personalInfo')}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field icon={Phone} label={t('ppage.phone')} value={patient.phone} />
            <Field icon={Mail} label={t('ppage.email')} value={patient.email} />
            <Field icon={Cake} label={t('ppage.dob')} value={dobDisplay} />
            <Field icon={User2} label={t('ppage.gender')} value={GENDER_KEYS[patient.gender] ? t(GENDER_KEYS[patient.gender]) : patient.gender ? patient.gender[0].toUpperCase() + patient.gender.slice(1) : ''} />
            <Field icon={Droplet} label={t('ppage.bloodGroup')} value={patient.blood_group} />
            <Field icon={Globe} label={t('ppage.preferredLanguage')} value={patient.preferred_language} />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field icon={MapPin} label={t('ppage.address')} value={[patient.address, patient.city, patient.pincode].filter(Boolean).join(', ')} />
            </div>
            <Field icon={Fingerprint} label={t('ppage.abhaNumber')} value={formatAbha(patient.abha_number)} />
            <Field icon={Fingerprint} label={t('ppage.abhaAddress')} value={patient.abha_address} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
            <ShieldAlert className="h-4 w-4 text-red-500" /> {t('ppage.emergencyContact')}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Field icon={User2} label={t('ppage.name')} value={patient.emergency_contact_name} />
            <Field icon={Phone} label={t('ppage.phone')} value={patient.emergency_contact_phone} />
          </div>

          <h3 className="mb-3 mt-6 text-[15px] font-bold text-brand-navy">{t('ppage.preferences')}</h3>
          <div className="space-y-2.5">
            {[t('ppage.prefSms'), t('ppage.prefEmail'), t('ppage.prefQueue')].map((p) => (
              <label key={p} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-[13px] text-slate-600">
                {p}
                <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-brand-green">
                  <span className="absolute right-0.5 h-4 w-4 rounded-full bg-white" />
                </span>
              </label>
            ))}
          </div>
        </Card>
      </div>

      <FamilyMembers patientId={patient.patient_id} />

      {editing && (
        <EditProfileModal patient={patient} onClose={() => setEditing(false)} onSaved={setPatient} />
      )}
    </div>
  )
}

export default Profile
