import { useEffect, useState } from 'react'
import { Building2, Stethoscope, Mail, Phone, MapPin, BadgeCheck, Award, Pencil, X, IndianRupee, Languages, Plus, Trash2, Fingerprint } from 'lucide-react'
import { Card, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { TextInput, SelectInput, Banner } from '../../components/common/FormControls.jsx'
import AddressAutocomplete from '../../components/common/AddressAutocomplete.jsx'
import PhotoUpload from '../../components/common/PhotoUpload.jsx'
import { fileUrl } from '../../api'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { doctorsApi } from '../../api'
import { geocodeAddress } from '../../lib/geo.js'

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-[18px] w-[18px]" /></span>
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-[14px] font-medium text-brand-navy">{value || '—'}</p>
      </div>
    </div>
  )
}

function EditModal({ doctor, onClose, onSaved }) {
  const [form, setForm] = useState({
    specialization: doctor.specialization || '',
    qualification: doctor.qualification || '',
    registration_number: doctor.registration_number || '',
    hpr_id: doctor.hpr_id || '',
    experience_years: doctor.experience_years ?? '',
    consultation_fee: Number(doctor.consultation_fee) || '',
    languages: doctor.languages || '',
    bio: doctor.bio || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const updated = await doctorsApi.update(doctor.doctor_id, {
        ...form,
        experience_years: Number(form.experience_years) || 0,
        consultation_fee: Number(form.consultation_fee) || 0,
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-brand-navy">Edit Profile</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="mb-4"><Banner type="error">{error}</Banner></div>}
        <div className="mb-5">
          <PhotoUpload
            url={doctor.profile_photo_url}
            name={doctor.name}
            onUpload={async (fd) => { const d = await doctorsApi.uploadPhoto(doctor.doctor_id, fd); onSaved(d); return d.profile_photo_url }}
          />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TextInput label="Specialization" value={form.specialization} onChange={set('specialization')} />
          <TextInput label="Qualification" value={form.qualification} onChange={set('qualification')} />
          <TextInput label="Medical Registration No." value={form.registration_number} onChange={set('registration_number')} />
          <TextInput label="HPR ID (optional)" value={form.hpr_id} onChange={set('hpr_id')} placeholder="ABDM Healthcare Professionals Registry ID" />
          <TextInput label="Experience (years)" type="number" value={form.experience_years} onChange={set('experience_years')} />
          <TextInput label="Consultation Fee (₹)" type="number" value={form.consultation_fee} onChange={set('consultation_fee')} />
          <div className="sm:col-span-2"><TextInput label="Languages" value={form.languages} onChange={set('languages')} placeholder="e.g. English, Hindi, Telugu" /></div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Bio</label>
            <textarea value={form.bio} onChange={set('bio')} className="min-h-[90px] w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-brand-blue" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <ToolButton type="button" onClick={onClose}>Cancel</ToolButton>
          <ToolButton type="submit" tone="primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</ToolButton>
        </div>
      </form>
    </div>
  )
}

const PRACTICE_TYPES = [
  { value: 'home', label: 'Home practice' },
  { value: 'personal_clinic', label: 'Personal clinic' },
  { value: 'clinic', label: 'Another clinic' },
  { value: 'online', label: 'Online consultation' },
]

function typeLabel(value) {
  return PRACTICE_TYPES.find((t) => t.value === value)?.label || value
}

function PracticeModal({ doctor, onClose, onSaved }) {
  const [form, setForm] = useState({
    practice_type: 'home',
    name: 'Home clinic',
    address: '',
    city: '',
    latitude: null,
    longitude: null,
    consultation_fee: Number(doctor.consultation_fee) || 0,
  })
  const [saving, setSaving] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState(null)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('Practice name is required.')
      return
    }
    if (form.practice_type !== 'online' && !form.address.trim()) {
      setError('Address is required for clinic, home, and personal practice.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let coords = null
      if (form.practice_type !== 'online') {
        // Coordinates picked from the Google suggestion are the most accurate;
        // only geocode the typed text when the user didn't pick a suggestion.
        if (form.latitude != null && form.longitude != null) {
          coords = { lat: Number(form.latitude), lng: Number(form.longitude) }
        } else {
          setLocating(true)
          coords = await geocodeAddress({ address: form.address, city: form.city })
          setLocating(false)
        }
        if (!coords) {
          setError('Could not locate this address. Please pick it from the map suggestions, or enter a more complete address with area and city.')
          setSaving(false)
          return
        }
      }
      const created = await doctorsApi.addAffiliation({
        doctor_id: doctor.doctor_id,
        practice_type: form.practice_type,
        name: form.name.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        latitude: coords?.lat ?? null,
        longitude: coords?.lng ?? null,
        consultation_fee: Number(form.consultation_fee) || 0,
        mode: 'slot',
        is_active: true,
        managed_by_hospital: form.practice_type === 'clinic',
      })
      onSaved(created)
      onClose()
    } catch (err) {
      setError(err.message || 'Could not add practice location.')
    } finally {
      setLocating(false)
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-brand-navy">Add Practice Location</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="mb-4"><Banner type="error">{error}</Banner></div>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <SelectInput label="Practice type" value={form.practice_type} onChange={set('practice_type')}>
            {PRACTICE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
          </SelectInput>
          <TextInput label="Practice name" value={form.name} onChange={set('name')} placeholder="e.g. Dr Janesh Home Clinic" />
          <TextInput label="City" value={form.city} onChange={set('city')} />
          <TextInput label="Consultation fee" type="number" min="0" value={form.consultation_fee} onChange={set('consultation_fee')} />
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Address</label>
            <AddressAutocomplete
              value={form.address}
              onChange={(val) => setForm((f) => ({ ...f, address: val, latitude: null, longitude: null }))}
              onSelect={(p) => setForm((f) => ({
                ...f,
                address: p.label || f.address,
                city: p.city || f.city,
                latitude: p.lat ?? null,
                longitude: p.lng ?? null,
              }))}
              biasLat={Number(form.latitude) || undefined}
              biasLng={Number(form.longitude) || undefined}
              placeholder={form.practice_type === 'online' ? 'Optional for online consultation' : 'Search this practice on Google Maps…'}
              className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-brand-navy outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <ToolButton type="button" onClick={onClose}>Cancel</ToolButton>
          <ToolButton type="submit" tone="primary" disabled={saving || locating}>{locating ? 'Checking address...' : saving ? 'Saving...' : 'Save Practice'}</ToolButton>
        </div>
      </form>
    </div>
  )
}

function Profile() {
  const { doctor, hospital, setDoctor, loading } = useDoctorCtx()
  const [editing, setEditing] = useState(false)
  const [addingPractice, setAddingPractice] = useState(false)
  const [practices, setPractices] = useState([])
  const [practiceError, setPracticeError] = useState(null)

  useEffect(() => {
    if (!doctor?.doctor_id) return
    let active = true
    doctorsApi.affiliations({ doctor_id: doctor.doctor_id })
      .then((rows) => { if (active) setPractices((rows || []).filter((p) => p.is_active !== false)) })
      .catch((err) => { if (active) setPracticeError(err.message || 'Could not load practice locations.') })
    return () => { active = false }
  }, [doctor?.doctor_id])

  const removePractice = async (practice) => {
    if (!window.confirm(`Remove ${practice.name}? Existing appointments remain unchanged.`)) return
    setPracticeError(null)
    try {
      await doctorsApi.updateAffiliation(practice.affiliation_id, { is_active: false })
      setPractices((current) => current.filter((p) => p.affiliation_id !== practice.affiliation_id))
    } catch (err) {
      setPracticeError(err.message || 'Could not remove practice location.')
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>
  if (!doctor) return <p className="text-sm text-slate-400">No doctor profile found.</p>

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="My Profile" subtitle="Your practice and clinic details.">
        <ToolButton icon={Pencil} tone="primary" onClick={() => setEditing(true)}>Edit Profile</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="flex flex-col items-center text-center">
          {doctor.profile_photo_url ? (
            <img src={fileUrl(doctor.profile_photo_url)} alt={doctor.name} className="h-20 w-20 rounded-full object-cover ring-2 ring-slate-100" />
          ) : (
            <Avatar name={doctor.name} className="h-20 w-20 text-2xl" />
          )}
          <h3 className="mt-3 text-xl font-extrabold text-brand-navy">{doctor.name}</h3>
          <p className="text-[13px] text-slate-500">{doctor.specialization}</p>
          {doctor.status === 'active' && <p className="mt-1 flex items-center gap-1 text-[13px] text-green-600"><BadgeCheck className="h-4 w-4" /> Active</p>}
          {hospital && (
            <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue"><Building2 className="h-5 w-5" /></span>
              <div className="text-left">
                <p className="text-[14px] font-bold text-brand-navy">{hospital.name}</p>
                <p className="text-[12px] text-slate-500">{[hospital.city, hospital.state].filter(Boolean).join(', ')}</p>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="mb-2 text-[15px] font-bold text-brand-navy">Details</h3>
          <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            <Row icon={Stethoscope} label="Specialty" value={doctor.specialization} />
            <Row icon={Award} label="Qualification" value={doctor.qualification} />
            <Row icon={BadgeCheck} label="Registration No." value={doctor.registration_number} />
            <Row icon={Fingerprint} label="HPR ID (ABDM)" value={doctor.hpr_id} />
            <Row icon={Award} label="Experience" value={doctor.experience_years != null ? `${doctor.experience_years} years` : ''} />
            <Row icon={IndianRupee} label="Consultation Fee" value={`₹${Number(doctor.consultation_fee)}`} />
            <Row icon={Languages} label="Languages" value={doctor.languages} />
            {hospital && <Row icon={Mail} label="Clinic Email" value={hospital.email} />}
            {hospital && <Row icon={Phone} label="Clinic Phone" value={hospital.phone} />}
            {hospital && <Row icon={MapPin} label="Clinic Address" value={[hospital.address, hospital.city, hospital.state].filter(Boolean).join(', ')} />}
          </div>
          {doctor.bio && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">About</p>
              <p className="mt-1 text-[13.5px] text-slate-600">{doctor.bio}</p>
            </div>
          )}
        </Card>
      </div>

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[16px] font-bold text-brand-navy">My Practice Locations</h3>
            <p className="text-[12.5px] text-slate-500">Add home, personal clinic, other clinic, or online practice here. Add timings for each location in My Availability.</p>
          </div>
          <ToolButton icon={Plus} tone="primary" onClick={() => setAddingPractice(true)}>Add Personal / Other Clinic</ToolButton>
        </div>
        {practiceError && <div className="mb-3"><Banner type="error">{practiceError}</Banner></div>}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {practices.map((practice) => (
            <div key={practice.affiliation_id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-blue shadow-sm">
                  <MapPin className="h-5 w-5" />
                </span>
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold uppercase text-slate-500">
                  {typeLabel(practice.practice_type)}
                </span>
              </div>
              <h4 className="mt-3 text-[15px] font-bold text-brand-navy">{practice.name}</h4>
              <p className="mt-1 text-[12.5px] text-slate-500">{[practice.address, practice.city].filter(Boolean).join(', ') || 'No address added'}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-slate-600">Fee: Rs {Number(practice.consultation_fee || 0)}</p>
                {!practice.managed_by_hospital && (
                  <button
                    type="button"
                    onClick={() => removePractice(practice)}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-semibold text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
              {practice.latitude != null && practice.longitude != null && (
                <p className="mt-1 text-[11.5px] font-medium text-green-600">Location tracked for patient travel time</p>
              )}
            </div>
          ))}
          {!practiceError && practices.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 p-5 text-sm text-slate-500">
              No practice locations found yet.
            </div>
          )}
        </div>
      </Card>

      {editing && <EditModal doctor={doctor} onClose={() => setEditing(false)} onSaved={(d) => setDoctor((prev) => ({ ...prev, ...d }))} />}
      {addingPractice && (
        <PracticeModal
          doctor={doctor}
          onClose={() => setAddingPractice(false)}
          onSaved={(created) => setPractices((current) => [...current.filter((p) => p.affiliation_id !== created.affiliation_id), created])}
        />
      )}
    </div>
  )
}

export default Profile
