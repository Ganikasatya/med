import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays, Clock, MapPin, Stethoscope, UserRound, Phone, Mail,
  IndianRupee, ArrowLeft, CheckCircle2, AlertTriangle, LocateFixed,
  Navigation, Users, Route, User,
} from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { TextInput, SelectInput, Checkbox, Banner } from '../../components/common/FormControls.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { appointmentsApi, doctorsApi } from '../../api'
import { prettyTime, todayISO } from '../../lib/format.js'
import { travelMinutesBetween, travelMinutesFromKm, getCurrentPosition, geocodeAddress } from '../../lib/geo.js'
import { useI18n } from '../../i18n/index.jsx'

const VISIT_TYPES = [
  { value: 'regular', labelKey: 'ppage.visitGeneral' },
  { value: 'walkin', labelKey: 'ppage.visitWalkin' },
  { value: 'emergency', labelKey: 'ppage.visitEmergency' },
]

function textareaClass(error) {
  return `min-h-[104px] w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none transition-colors placeholder:text-slate-400 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 ${
    error ? 'border-red-300' : 'border-slate-200'
  }`
}

function addDaysISO(iso, days) {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function readableDate(iso) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

function BookAppointment() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { patient, doctorsById, affiliationsByDoctor, resolveHospital, loading: ctxLoading } = usePatientCtx()

  const bookableDoctors = useMemo(
    () => Object.values(doctorsById).filter((d) => d.status === 'active' || d.is_available_today),
    [doctorsById],
  )

  const [form, setForm] = useState({
    doctorId: params.get('doctor') || '',
    affiliationId: params.get('affiliation') || '',
    date: '',
    time: '',
    visitType: 'regular',
    reason: '',
    consent: false,
  })
  const [slots, setSlots] = useState([])
  const [doctorAffiliations, setDoctorAffiliations] = useState([])
  const [slotState, setSlotState] = useState({ loading: false, reason: null })
  const [slotSuggestions, setSlotSuggestions] = useState({ sameDate: [], nearbyDates: [] })
  const [errors, setErrors] = useState({})
  const [banner, setBanner] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Travel origin → powers the "leave by" reminder. `for` chooses whose journey
  // we estimate; `lat/lng` come from GPS, `km` is the manual distance fallback.
  const [trip, setTrip] = useState({
    for: 'self', lat: null, lng: null, label: '', km: '', address: '', geoLoading: false, geoError: null,
  })

  // Default to the first bookable doctor once the directory loads.
  useEffect(() => {
    if (!form.doctorId && bookableDoctors.length) {
      setForm((f) => ({ ...f, doctorId: String(bookableDoctors[0].doctor_id) }))
    }
  }, [bookableDoctors, form.doctorId])

  const doctor = doctorsById[form.doctorId]
  const contextAffiliations = form.doctorId ? affiliationsByDoctor[form.doctorId] || [] : []
  const affiliations = doctorAffiliations.length ? doctorAffiliations : contextAffiliations
  const affiliation = affiliations.find((a) => String(a.affiliation_id) === String(form.affiliationId)) || affiliations[0] || null
  const clinic = affiliation?.hospital_id ? resolveHospital(affiliation.hospital_id) : doctor ? resolveHospital(doctor.hospital_id) : null
  const destination = affiliation?.latitude != null && affiliation?.longitude != null
    ? { ...affiliation, latitude: affiliation.latitude, longitude: affiliation.longitude }
    : clinic

  useEffect(() => {
    if (form.doctorId && !form.affiliationId && affiliations.length) {
      setForm((f) => ({ ...f, affiliationId: String(affiliations[0].affiliation_id) }))
    }
  }, [form.doctorId, form.affiliationId, affiliations])

  useEffect(() => {
    if (!form.doctorId) {
      setDoctorAffiliations([])
      return
    }
    let active = true
    doctorsApi.affiliations({ doctor_id: form.doctorId })
      .then((rows) => {
        if (!active) return
        const activeRows = (rows || []).filter((a) => a.is_active !== false)
        setDoctorAffiliations(activeRows)
        if (activeRows.length && !activeRows.some((a) => String(a.affiliation_id) === String(form.affiliationId))) {
          setForm((f) => ({ ...f, affiliationId: String(activeRows[0].affiliation_id) }))
        }
      })
      .catch(() => {
        if (active) setDoctorAffiliations([])
      })
    return () => { active = false }
  }, [form.doctorId, form.affiliationId])

  // Load real available slots whenever doctor or date changes.
  useEffect(() => {
    if (!form.doctorId || !form.affiliationId || !form.date) {
      setSlots([])
      setSlotState({ loading: false, reason: null })
      setSlotSuggestions({ sameDate: [], nearbyDates: [] })
      return
    }
    let active = true
    setSlotState({ loading: true, reason: null })
    setSlotSuggestions({ sameDate: [], nearbyDates: [] })
    setForm((f) => ({ ...f, time: '' }))
    ;(async () => {
      try {
        const res = await appointmentsApi.availableSlots(form.doctorId, form.date, form.affiliationId)
        if (!active) return
        setSlots(res?.slots || [])
        setSlotState({ loading: false, reason: res?.available ? null : res?.reason || t('ppage.noSlots') })
        if (!res?.available) {
          const otherLocations = await Promise.all(
            affiliations
              .filter((a) => String(a.affiliation_id) !== String(form.affiliationId))
              .map(async (a) => {
                try {
                  const alt = await appointmentsApi.availableSlots(form.doctorId, form.date, a.affiliation_id)
                  return alt?.available && alt?.slots?.length ? { affiliation: a, slots: alt.slots } : null
                } catch {
                  return null
                }
              }),
          )
          const nextDates = await Promise.all(
            Array.from({ length: 7 }, (_, i) => addDaysISO(form.date, i + 1)).map(async (date) => {
              try {
                const alt = await appointmentsApi.availableSlots(form.doctorId, date, form.affiliationId)
                return alt?.available && alt?.slots?.length ? { date, slots: alt.slots } : null
              } catch {
                return null
              }
            }),
          )
          if (active) {
            setSlotSuggestions({
              sameDate: otherLocations.filter(Boolean),
              nearbyDates: nextDates.filter(Boolean).slice(0, 3),
            })
          }
        }
      } catch (err) {
        if (!active) return
        setSlots([])
        setSlotState({ loading: false, reason: err.message || t('ppage.couldNotLoadSlots') })
      }
    })()
    return () => {
      active = false
    }
  }, [affiliations, form.doctorId, form.affiliationId, form.date, t])

  const set = (key) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  // Travel minutes: prefer GPS coords + clinic coords; else the manual distance.
  const travelMin = useMemo(() => {
    if (trip.lat != null && trip.lng != null) {
      const m = travelMinutesBetween({ lat: trip.lat, lng: trip.lng }, destination)
      if (m != null) return m
    }
    const km = Number(trip.km)
    if (Number.isFinite(km) && km > 0) return travelMinutesFromKm(km)
    return null
  }, [trip.lat, trip.lng, trip.km, destination])

  const useMyLocation = async () => {
    setTrip((tr) => ({ ...tr, geoLoading: true, geoError: null }))
    try {
      const { lat, lng } = await getCurrentPosition()
      setTrip((tr) => ({
        ...tr, lat, lng, km: '', geoLoading: false, geoError: null,
        label: tr.for === 'self' ? t('ppage.myCurrentLocation') : t('ppage.patientCurrentLocation'),
      }))
    } catch (err) {
      setTrip((tr) => ({ ...tr, geoLoading: false, geoError: err.message }))
    }
  }

  // Resolve a typed address (the patient's home when booking for someone else)
  // into coordinates so the leave-by time is based on *their* journey.
  const locateFromAddress = async () => {
    if (!trip.address.trim()) {
      setTrip((tr) => ({ ...tr, geoError: t('ppage.enterAddressFirst') }))
      return
    }
    setTrip((tr) => ({ ...tr, geoLoading: true, geoError: null }))
    try {
      const g = await geocodeAddress({ address: trip.address })
      if (!g) {
        setTrip((tr) => ({ ...tr, geoLoading: false, geoError: t('ppage.couldNotFindAddress') }))
        return
      }
      setTrip((tr) => ({ ...tr, lat: g.lat, lng: g.lng, km: '', geoLoading: false, geoError: null, label: tr.address.trim() }))
    } catch (err) {
      setTrip((tr) => ({ ...tr, geoLoading: false, geoError: err.message || t('ppage.addressLookupFailed') }))
    }
  }

  const setKm = (event) => {
    const km = event.target.value
    // Switching to a manual distance clears any captured GPS point.
    setTrip((tr) => ({ ...tr, km, lat: null, lng: null, label: km ? t('ppage.kmAway', { km }) : '' }))
  }

  const setTripFor = (who) => () =>
    setTrip((tr) => ({ ...tr, for: who, lat: null, lng: null, km: '', address: '', label: '', geoError: null }))

  const submit = async (event) => {
    event.preventDefault()
    setBanner(null)

    const nextErrors = {}
    if (!form.doctorId) nextErrors.doctorId = t('ppage.valSelectDoctor')
    if (!form.affiliationId) nextErrors.affiliationId = 'Select clinic or practice location'
    if (!form.date) nextErrors.date = t('ppage.valSelectDate')
    if (!form.time) nextErrors.time = t('ppage.valSelectTime')
    if (!form.reason.trim()) nextErrors.reason = t('ppage.valReason')
    if (!form.consent) nextErrors.consent = t('ppage.valConsent')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      await appointmentsApi.book({
        doctor_id: Number(form.doctorId),
        affiliation_id: Number(form.affiliationId),
        patient_id: patient.patient_id,
        appointment_date: form.date,
        slot_time: form.time,
        appointment_type: form.visitType,
        notes: form.reason,
        source: 'app',
        origin_lat: trip.lat,
        origin_lng: trip.lng,
        origin_label: trip.label,
        travel_minutes: travelMin,
      })
      navigate('/patient-dashboard/appointments', {
        replace: true,
        state: { booked: true, appointment: { doctor: doctor?.name } },
      })
    } catch (err) {
      setBanner(err.message || t('ppage.couldNotBook'))
    } finally {
      setSubmitting(false)
    }
  }

  if (ctxLoading) return <p className="text-sm text-slate-400">{t('pcommon.loading')}</p>

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <PageHeading title={t('ppage.bookTitle')} subtitle={t('ppage.bookSubtitle')}>
        <button
          type="button"
          onClick={() => navigate('/patient-dashboard')}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:border-slate-300"
        >
          <ArrowLeft className="h-4 w-4" /> {t('ppage.backToDashboard')}
        </button>
      </PageHeading>

      {banner && <Banner type="error">{banner}</Banner>}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_320px]">
        <Card className="p-5">
          <h3 className="mb-4 text-[17px] font-bold text-brand-navy">{t('ppage.apptDetails')}</h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <TextInput label={t('ppage.patientName')} icon={UserRound} value={patient?.name || ''} disabled />
            <TextInput label={t('ppage.mobileNumber')} icon={Phone} prefix="+91" value={patient?.phone || ''} disabled />
            <TextInput label={t('ppage.email')} icon={Mail} value={patient?.email || ''} disabled />
            <SelectInput label={t('ppage.visitType')} required icon={Stethoscope} value={form.visitType} onChange={set('visitType')}>
              {VISIT_TYPES.map((vt) => <option key={vt.value} value={vt.value}>{t(vt.labelKey)}</option>)}
            </SelectInput>
            <SelectInput label={t('ppage.doctor')} required icon={Stethoscope} value={form.doctorId} onChange={set('doctorId')} error={errors.doctorId}>
              <option value="">{t('ppage.selectDoctor')}</option>
              {bookableDoctors.map((d) => (
                <option key={d.doctor_id} value={d.doctor_id}>{d.name} — {d.specialization}</option>
              ))}
            </SelectInput>
            <SelectInput
              label="Select clinic / practice location"
              required
              icon={MapPin}
              value={form.affiliationId}
              onChange={set('affiliationId')}
              error={errors.affiliationId}
              disabled={!affiliations.length}
            >
              <option value="">{affiliations.length ? 'Select location' : 'No practice found'}</option>
              {affiliations.map((a) => (
                <option key={a.affiliation_id} value={a.affiliation_id}>
                  {a.name || clinic?.name || 'Practice location'}
                </option>
              ))}
            </SelectInput>
            <TextInput label={t('ppage.apptDate')} required icon={CalendarDays} type="date" min={todayISO()} value={form.date} onChange={set('date')} error={errors.date} />
            <SelectInput label={t('ppage.preferredTime')} required icon={Clock} value={form.time} onChange={set('time')} error={errors.time} disabled={slotState.loading || !slots.length}>
              <option value="">{slotState.loading ? t('ppage.loadingSlots') : slots.length ? t('ppage.selectSlotShort') : t('ppage.noSlotsShort')}</option>
              {slots.map((s) => <option key={s.time} value={s.time}>{s.label || prettyTime(s.time)}</option>)}
            </SelectInput>
          </div>

          {form.date && slotState.reason && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[12.5px] font-medium text-amber-700">
              <div className="flex flex-wrap items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {affiliation?.name
                  ? `${doctor?.name || 'This doctor'} is not available at ${affiliation.name} on ${readableDate(form.date)}.`
                  : slotState.reason}
              </div>
              {slotSuggestions.sameDate.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-amber-800">Available at another practice on the same day:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slotSuggestions.sameDate.map((item) => (
                      <button
                        key={item.affiliation.affiliation_id}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, affiliationId: String(item.affiliation.affiliation_id), time: '' }))}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-bold text-amber-800 hover:bg-amber-100"
                      >
                        Book at {item.affiliation.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {slotSuggestions.nearbyDates.length > 0 && (
                <div className="mt-3">
                  <p className="font-semibold text-amber-800">Available at {affiliation?.name || 'this location'} on:</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {slotSuggestions.nearbyDates.map((item) => (
                      <button
                        key={item.date}
                        type="button"
                        onClick={() => setForm((f) => ({ ...f, date: item.date, time: '' }))}
                        className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-bold text-amber-800 hover:bg-amber-100"
                      >
                        {readableDate(item.date)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {!slotSuggestions.sameDate.length && !slotSuggestions.nearbyDates.length && (
                <p className="mt-2 text-[12px]">{slotState.reason}</p>
              )}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-4">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
                {t('ppage.reasonForVisit')} <span className="text-red-500">*</span>
              </label>
              <textarea className={textareaClass(errors.reason)} value={form.reason} onChange={set('reason')} placeholder={t('ppage.reasonPlaceholder')} />
              {errors.reason && <p className="mt-1 text-xs text-red-500">{errors.reason}</p>}
            </div>

            {/* Getting there → drives the "time to leave" reminder. */}
            <div className="rounded-xl border border-brand-blue/15 bg-brand-blueLight/40 p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-brand-blue shadow-sm">
                  <Route className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[14px] font-bold text-brand-navy">{t('ppage.gettingThere')}</p>
                  <p className="text-[12px] text-slate-500">{t('ppage.gettingThereSub')}</p>
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">{t('ppage.whoTravelling')}</p>
                <div className="flex gap-2">
                  {[
                    { key: 'self', label: t('ppage.me'), icon: User },
                    { key: 'other', label: t('ppage.someoneElse'), icon: Users },
                  ].map((opt) => {
                    const active = trip.for === opt.key
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={setTripFor(opt.key)}
                        className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[13px] font-semibold transition-colors ${
                          active
                            ? 'border-brand-blue bg-brand-blue text-white'
                            : 'border-slate-200 bg-white text-brand-navy hover:border-slate-300'
                        }`}
                      >
                        <opt.icon className="h-4 w-4" /> {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="mt-3">
                <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">
                  {trip.for === 'self' ? t('ppage.yourAddress') : t('ppage.patientAddress')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trip.address}
                    onChange={(e) => setTrip((tr) => ({ ...tr, address: e.target.value }))}
                    placeholder={t('ppage.addressPlaceholder')}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                  />
                  <button
                    type="button"
                    onClick={locateFromAddress}
                    disabled={trip.geoLoading}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-blue px-3.5 py-2.5 text-[13px] font-bold text-white hover:bg-brand-blueDark disabled:opacity-60"
                  >
                    <MapPin className="h-4 w-4" /> {t('ppage.find')}
                  </button>
                </div>
                <p className="mt-1 text-[11.5px] text-slate-400">{t('ppage.addressHint')}</p>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">
                    {trip.for === 'self' ? t('ppage.startFromMyLoc') : t('ppage.usePatientPhone')}
                  </p>
                  <button
                    type="button"
                    onClick={useMyLocation}
                    disabled={trip.geoLoading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-brand-blue/30 bg-white px-3 py-2.5 text-[13px] font-bold text-brand-blue hover:bg-brand-blue/5 disabled:opacity-60"
                  >
                    <LocateFixed className="h-4 w-4" />
                    {trip.geoLoading ? t('ppage.locating') : trip.lat != null ? t('ppage.locationCaptured') : t('ppage.useCurrentLocation')}
                  </button>
                  {trip.geoError && <p className="mt-1 text-xs text-amber-600">{trip.geoError}</p>}
                </div>

                <div>
                  <p className="mb-1.5 text-[12.5px] font-semibold text-slate-700">
                    {trip.for === 'self' ? t('ppage.orDistanceToClinic') : t('ppage.distanceToClinic')}
                  </p>
                  <div className="relative">
                    <Navigation className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      inputMode="decimal"
                      value={trip.km}
                      onChange={setKm}
                      placeholder={t('ppage.distancePlaceholder')}
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-12 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-slate-400">km</span>
                  </div>
                </div>
              </div>

              {travelMin != null ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-[12.5px] font-semibold text-green-700">
                  <Navigation className="h-4 w-4" />
                  {t('ppage.aboutMinAway', { n: travelMin, label: trip.label ? ` · ${trip.label}` : '' })}
                </div>
              ) : (
                <p className="mt-3 text-[12px] text-slate-500">
                  {t('ppage.optionalReminder')}
                </p>
              )}
            </div>

            <Checkbox checked={form.consent} onChange={set('consent')} className="rounded-xl bg-slate-50 p-3">
              {t('ppage.bookConsent')}
            </Checkbox>
            {errors.consent && <p className="-mt-3 text-xs text-red-500">{errors.consent}</p>}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/patient-dashboard')}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-brand-navy hover:bg-slate-50"
            >
              {t('pcommon.cancel')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-5 py-2.5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(37,99,235,0.24)] transition-colors hover:bg-brand-blueDark disabled:opacity-60"
            >
              <CheckCircle2 className="h-4 w-4" /> {submitting ? t('ppage.booking') : t('ppage.confirmAppointment')}
            </button>
          </div>
        </Card>

        <Card className="h-fit p-5">
          <h3 className="text-[17px] font-bold text-brand-navy">{t('ppage.bookingSummary')}</h3>
          <div className="mt-4 space-y-3 text-[13px]">
            <div className="rounded-xl bg-brand-blueLight/60 p-3">
              <p className="font-bold text-brand-navy">{doctor?.name || t('ppage.selectDoctor')}</p>
              <p className="text-slate-500">{doctor?.specialization || t('ppage.specialty')}</p>
            </div>
            <p className="flex items-start gap-2 text-slate-600">
              <MapPin className="mt-0.5 h-4 w-4 text-slate-400" />
              {affiliation?.name || clinic?.name || t('ppage.clinicLabel')}
            </p>
            <p className="flex items-start gap-2 text-slate-600">
              <CalendarDays className="mt-0.5 h-4 w-4 text-slate-400" />
              {form.date || t('ppage.selectDate')}{form.time ? t('ppage.atTime', { time: prettyTime(form.time) }) : ''}
            </p>
            <p className="flex items-start gap-2 text-slate-600">
              <IndianRupee className="mt-0.5 h-4 w-4 text-slate-400" />
              {t('ppage.consultationFee', { fee: affiliation?.consultation_fee != null ? Number(affiliation.consultation_fee) : doctor ? Number(doctor.consultation_fee) : 0 })}
            </p>
            {travelMin != null && (
              <p className="flex items-start gap-2 text-slate-600">
                <Navigation className="mt-0.5 h-4 w-4 text-slate-400" />
                {t('ppage.minAwaySummary', { n: travelMin, label: trip.label ? ` (${trip.label})` : '' })}
              </p>
            )}
          </div>
          <div className="mt-4 rounded-xl border border-green-100 bg-green-50 p-3 text-[12.5px] font-medium text-green-700">
            {t('ppage.afterConfirm')}
          </div>
        </Card>
      </div>
    </form>
  )
}

export default BookAppointment
