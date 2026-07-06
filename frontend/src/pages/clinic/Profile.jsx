import { useEffect, useState } from 'react'
import {
  Building2, Phone, Mail, MapPin, LocateFixed, Save, Hash, Navigation, Search, Fingerprint,
} from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import PhotoUpload from '../../components/common/PhotoUpload.jsx'
import { TextInput, Banner } from '../../components/common/FormControls.jsx'
import AddressAutocomplete from '../../components/common/AddressAutocomplete.jsx'
import { hospitalsApi } from '../../api'
import { getCurrentPosition, geocodeAddress } from '../../lib/geo.js'

const EMPTY = {
  name: '', phone: '', email: '', address: '',
  city: '', state: '', pincode: '', hfr_id: '', latitude: '', longitude: '',
}

function ClinicProfile() {
  const [clinic, setClinic] = useState(null)   // raw record (for id + short_code)
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [banner, setBanner] = useState(null)    // { type, text }
  const [geo, setGeo] = useState({ loading: false, error: null })

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const list = await hospitalsApi.list()
        const mine = (list || [])[0] || null
        if (!active) return
        setClinic(mine)
        if (mine) {
          setForm({
            name: mine.name || '', phone: mine.phone || '', email: mine.email || '',
            address: mine.address || '', city: mine.city || '', state: mine.state || '',
            pincode: mine.pincode || '', hfr_id: mine.hfr_id || '',
            latitude: mine.latitude ?? '', longitude: mine.longitude ?? '',
          })
        }
      } catch (e) {
        if (active) setBanner({ type: 'error', text: e.message || 'Could not load clinic.' })
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => { active = false }
  }, [])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setBanner(null)
  }

  const useCurrentLocation = async () => {
    setGeo({ loading: true, error: null })
    try {
      const { lat, lng } = await getCurrentPosition()
      setForm((f) => ({ ...f, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))
      setGeo({ loading: false, error: null })
    } catch (err) {
      setGeo({ loading: false, error: err.message })
    }
  }

  // Resolve the typed address to coordinates (explicit button + preview).
  const locateFromAddress = async () => {
    if (!form.address.trim()) {
      setGeo({ loading: false, error: 'Enter the clinic address first.' })
      return
    }
    setGeo({ loading: true, error: null })
    try {
      const g = await geocodeAddress(form)
      if (!g) {
        setGeo({ loading: false, error: 'Could not find that address. Enter coordinates manually.' })
        return
      }
      setForm((f) => ({ ...f, latitude: g.lat.toFixed(6), longitude: g.lng.toFixed(6) }))
      setGeo({ loading: false, error: null })
    } catch (err) {
      setGeo({ loading: false, error: err.message || 'Address lookup failed.' })
    }
  }

  const save = async (e) => {
    e.preventDefault()
    if (!clinic) return
    setSaving(true)
    setBanner(null)
    try {
      let lat = form.latitude
      let lng = form.longitude
      let note = ''
      // No coordinates yet? Derive them from the address before saving.
      if ((lat === '' || lng === '') && form.address.trim()) {
        try {
          const g = await geocodeAddress(form)
          if (g) {
            lat = g.lat.toFixed(6)
            lng = g.lng.toFixed(6)
            setForm((f) => ({ ...f, latitude: lat, longitude: lng }))
          } else {
            note = ' Address couldn’t be located — add Latitude/Longitude for travel estimates.'
          }
        } catch {
          note = ' Address lookup failed — add Latitude/Longitude for travel estimates.'
        }
      }
      const num = (v) => (v === '' || v === null ? null : Number(v))
      await hospitalsApi.update(clinic.hospital_id, {
        name: form.name, phone: form.phone, email: form.email || null,
        address: form.address, city: form.city, state: form.state, pincode: form.pincode,
        hfr_id: form.hfr_id || null,
        latitude: num(lat), longitude: num(lng),
      })
      setBanner({ type: note ? 'error' : 'success', text: 'Clinic profile saved.' + note })
    } catch (err) {
      setBanner({ type: 'error', text: err.message || 'Could not save changes.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>
  if (!clinic) return <Banner type="error">No clinic linked to this account.</Banner>

  const hasLocation = form.latitude !== '' && form.longitude !== ''

  return (
    <form onSubmit={save} className="flex flex-col gap-5">
      <PageHeading title="Clinic Profile" subtitle="Update your clinic's details and map location.">
        <ToolButton type="submit" icon={Save} tone="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </ToolButton>
      </PageHeading>

      {banner && <Banner type={banner.type}>{banner.text}</Banner>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_360px]">
        {/* Details */}
        <Card className="p-5">
          <h3 className="mb-4 text-[16px] font-bold text-brand-navy">Clinic Details</h3>
          <div className="mb-5 flex justify-center">
            <PhotoUpload
              url={clinic.logo_url}
              name={form.name || clinic.name}
              rounded="rounded-2xl"
              label="Tap the camera to add or change your clinic logo"
              onUpload={async (fd) => { const h = await hospitalsApi.uploadLogo(clinic.hospital_id, fd); setClinic(h); return h.logo_url }}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput label="Clinic Name" icon={Building2} value={form.name} onChange={set('name')} />
            <TextInput label="Clinic Code" icon={Hash} value={clinic.short_code || ''} disabled />
            <TextInput label="Phone" icon={Phone} value={form.phone} onChange={set('phone')} />
            <TextInput label="Email" icon={Mail} value={form.email} onChange={set('email')} />
            <div className="md:col-span-2">
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">Address</label>
              <AddressAutocomplete
                value={form.address}
                onChange={(val) => { setForm((f) => ({ ...f, address: val })); setBanner(null) }}
                onSelect={(p) => setForm((f) => ({
                  ...f,
                  address: p.label || f.address,
                  city: p.city || f.city,
                  state: p.state || f.state,
                  pincode: p.pincode || f.pincode,
                  latitude: p.lat != null ? Number(p.lat).toFixed(6) : f.latitude,
                  longitude: p.lng != null ? Number(p.lng).toFixed(6) : f.longitude,
                }))}
                biasLat={Number(form.latitude) || undefined}
                biasLng={Number(form.longitude) || undefined}
                placeholder="Search your clinic on Google Maps…"
                className="flex w-full items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-brand-navy outline-none transition-colors focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
              />
              <p className="mt-1.5 text-[11.5px] text-slate-400">Pick from the suggestions to set an accurate map pin automatically.</p>
            </div>
            <TextInput label="City" value={form.city} onChange={set('city')} />
            <TextInput label="State" value={form.state} onChange={set('state')} />
            <TextInput label="Pincode" value={form.pincode} onChange={set('pincode')} />
            <div className="md:col-span-2">
              <TextInput label="HFR ID — Health Facility Registry (optional)" icon={Fingerprint} value={form.hfr_id} onChange={set('hfr_id')} placeholder="ABDM facility ID, if registered" />
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="h-fit p-5">
          <h3 className="text-[16px] font-bold text-brand-navy">Map Location</h3>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Used to estimate each patient's travel time and when they should leave to reach you on time.
          </p>

          <button
            type="button"
            onClick={locateFromAddress}
            disabled={geo.loading}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-blue px-3 py-2.5 text-[13px] font-bold text-white hover:bg-brand-blueDark disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {geo.loading ? 'Locating…' : 'Find from address'}
          </button>
          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={geo.loading}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-blue/30 bg-white px-3 py-2.5 text-[13px] font-bold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" />
            Use current location
          </button>
          {geo.error && <p className="mt-1 text-xs text-amber-600">{geo.error}</p>}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <TextInput label="Latitude" type="number" value={form.latitude} onChange={set('latitude')} />
            <TextInput label="Longitude" type="number" value={form.longitude} onChange={set('longitude')} />
          </div>

          <div className={`mt-4 flex items-center gap-2 rounded-xl border px-3 py-2 text-[12.5px] font-semibold ${
            hasLocation ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}>
            <Navigation className="h-4 w-4" />
            {hasLocation ? 'Location set — travel estimates enabled.' : 'No location yet — patients won’t get a leave-by time.'}
          </div>
        </Card>
      </div>
    </form>
  )
}

export default ClinicProfile
