import { useMemo, useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin, IndianRupee, Search, Stethoscope, Navigation, LocateFixed, X } from 'lucide-react'
import { Card, StatusBadge, Avatar, PageHeading } from '../../components/clinic/ui.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { fileUrl } from '../../api'
import { useI18n } from '../../i18n/index.jsx'
import { haversineKm, travelMinutesBetween, getCurrentPosition } from '../../lib/geo.js'
import SymptomHelper from '../../components/patient/SymptomHelper.jsx'
import { specialtyLabel, matchesSpecialty } from '../../data/symptomSpecialty.js'

/** A coordinate is usable only if it's a finite, non-zero number. */
const validCoord = (v) => v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) !== 0
const hasCoords = (c) => c && validCoord(c.latitude) && validCoord(c.longitude)

function fmtDistance(km) {
  if (km == null) return null
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

/** Maps the backend doctor status into the badge vocabulary used by the UI. */
function statusLabel(d) {
  if (d.status && d.status !== 'active') return 'On Leave'
  return d.is_available_today ? 'Available' : 'Busy'
}


function Doctors() {
  const { t, lang } = useI18n()
  const [params] = useSearchParams()
  const clinicId = params.get('clinic') || ''
  const [query, setQuery] = useState('')
  const [specialty, setSpecialty] = useState('') // set by the symptom helper
  const [helperOpen, setHelperOpen] = useState(false)
  const { doctorsById, hospitalsById, patient, loading } = usePatientCtx()

  const [origin, setOrigin] = useState(null) // { lat, lng } — the patient's location
  const [locBusy, setLocBusy] = useState(false)
  const [locError, setLocError] = useState(null)
  const [radius, setRadius] = useState('any') // 'any' | '5' | '10' | '25'  (km)

  const clinicName = clinicId ? hospitalsById[clinicId]?.name : ''

  // If the patient already has a saved location, sort by it right away — no click.
  useEffect(() => {
    if (!origin && patient && validCoord(patient.latitude) && validCoord(patient.longitude)) {
      setOrigin({ lat: Number(patient.latitude), lng: Number(patient.longitude) })
    }
  }, [patient]) // eslint-disable-line react-hooks/exhaustive-deps

  const useMyLocation = async () => {
    setLocBusy(true)
    setLocError(null)
    try {
      setOrigin(await getCurrentPosition())
    } catch (e) {
      setLocError(e.message || 'Could not get your location.')
    } finally {
      setLocBusy(false)
    }
  }

  const clearLocation = () => { setOrigin(null); setRadius('any'); setLocError(null) }

  const doctors = useMemo(() => {
    const term = query.trim().toLowerCase()
    let list = Object.values(doctorsById)
      .filter((doctor) => {
        const matchesClinic = !clinicId || String(doctor.hospital_id) === String(clinicId)
        const matchesSpec = !specialty || matchesSpecialty(doctor.specialization, specialty)
        const hospital = hospitalsById[doctor.hospital_id]?.name || ''
        const matchesSearch =
          !term ||
          [doctor.name, doctor.specialization, hospital].some((v) =>
            String(v).toLowerCase().includes(term),
          )
        return matchesClinic && matchesSpec && matchesSearch
      })
      .map((doctor) => {
        // A doctor's distance is the distance to the clinic they practise at.
        const hospital = hospitalsById[doctor.hospital_id]
        const dKm = origin && hasCoords(hospital)
          ? haversineKm(origin.lat, origin.lng, Number(hospital.latitude), Number(hospital.longitude))
          : null
        const eta = origin && hasCoords(hospital) ? travelMinutesBetween(origin, hospital) : null
        return { ...doctor, distanceKm: dKm, etaMin: eta }
      })

    if (origin) {
      if (radius !== 'any') list = list.filter((d) => d.distanceKm != null && d.distanceKm <= Number(radius))
      list = list.slice().sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0
        if (a.distanceKm == null) return 1
        if (b.distanceKm == null) return -1
        return a.distanceKm - b.distanceKm
      })
    }
    return list
  }, [doctorsById, hospitalsById, clinicId, query, specialty, origin, radius])

  return (
    <div className="flex flex-col gap-5">
      <PageHeading
        title={clinicName ? t('ppage.doctorsAt', { clinic: clinicName }) : t('ppage.findDoctors')}
        subtitle={t('ppage.doctorsSubtitle')}
      >
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-48 text-[13px] outline-none placeholder:text-slate-400"
            placeholder={t('ppage.searchNameSpecialty')}
          />
        </div>
      </PageHeading>

      {/* Symptom → specialty helper */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setHelperOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 transition-colors hover:bg-teal-100"
        >
          <Stethoscope className="h-4 w-4" /> {t('symptom.button')}
        </button>
        {specialty && (
          <span className="inline-flex items-center gap-2 rounded-xl bg-brand-blueLight px-3 py-2 text-sm font-semibold text-brand-blue">
            {t('symptom.showing', { specialty: specialtyLabel(specialty, lang) })}
            <button onClick={() => setSpecialty('')} aria-label="Clear specialty" className="text-brand-blue/70 hover:text-brand-blue">
              <X className="h-4 w-4" />
            </button>
          </span>
        )}
      </div>

      {/* Near-me controls */}
      <div className="flex flex-wrap items-center gap-3">
        {!origin ? (
          <button
            onClick={useMyLocation}
            disabled={locBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" /> {locBusy ? 'Locating…' : 'Show doctors near me'}
          </button>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 rounded-xl bg-brand-greenLight px-3 py-2 text-sm font-semibold text-brand-green">
              <Navigation className="h-4 w-4" /> Sorted by nearest
              <button onClick={clearLocation} aria-label="Clear location" className="ml-1 text-brand-green/70 hover:text-brand-green">
                <X className="h-4 w-4" />
              </button>
            </span>
            <label className="inline-flex items-center gap-2 text-sm text-slate-500">
              Within
              <select
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-brand-navy outline-none focus:border-brand-blue"
              >
                <option value="any">Any distance</option>
                <option value="5">5 km</option>
                <option value="10">10 km</option>
                <option value="25">25 km</option>
              </select>
            </label>
          </>
        )}
        {locError && <span className="text-xs text-red-500">{locError}</span>}
      </div>

      {loading ? (
        <p className="text-sm text-slate-400">{t('ppage.loadingDoctors')}</p>
      ) : doctors.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[15px] font-bold text-brand-navy">
            {specialty
              ? origin && radius !== 'any'
                ? t('symptom.noneFoundRadius', { specialty: specialtyLabel(specialty, lang), radius })
                : t('symptom.noneFound', { specialty: specialtyLabel(specialty, lang) })
              : origin && radius !== 'any'
                ? `No doctors within ${radius} km — try a larger radius.`
                : t('ppage.noDoctorsFound')}
          </p>
          {specialty
            ? <button onClick={() => setSpecialty('')} className="mt-1 text-[13px] font-semibold text-teal-700 hover:underline">{t('symptom.clearAll')}</button>
            : !(origin && radius !== 'any') && <p className="mt-1 text-[13px] text-slate-500">{t('ppage.tryAnother')}</p>}
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => {
            const hospital = hospitalsById[d.hospital_id]
            const label = statusLabel(d)
            const bookable = label !== 'On Leave'
            return (
              <Card key={d.doctor_id} className="relative flex flex-col p-5 transition-all duration-300 will-change-transform hover:z-20 hover:-translate-y-3 hover:scale-[1.08] hover:border-brand-blue/50 hover:shadow-[0_30px_65px_-14px_rgba(13,148,136,0.45)]">
                <div className="flex items-start gap-3">
                  {d.profile_photo_url ? (
                    <img src={fileUrl(d.profile_photo_url)} alt={d.name} className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-slate-100" />
                  ) : (
                    <Avatar name={d.name} className="h-14 w-14 text-lg" />
                  )}
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="text-[15px] font-bold text-brand-navy">{d.name}</p>
                    <p className="text-[12.5px] text-slate-500">{d.specialization}</p>
                    {d.qualification && (
                      <p className="mt-0.5 flex items-center gap-1 text-[12px] text-slate-400">
                        <Stethoscope className="h-3.5 w-3.5" />
                        {d.qualification}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={label} />
                </div>

                {d.distanceKm != null && (
                  <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-brand-blueLight px-2.5 py-1 text-[11.5px] font-semibold text-brand-blue">
                    <Navigation className="h-3 w-3" />
                    {fmtDistance(d.distanceKm)}{d.etaMin ? ` · ~${d.etaMin} min` : ''} away
                  </span>
                )}

                <div className="mt-3 space-y-1.5 text-[12.5px] text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {hospital ? `${hospital.name}${hospital.city ? ` - ${hospital.city}` : ''}` : '—'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1 font-semibold text-brand-navy">
                      <IndianRupee className="h-3.5 w-3.5" />
                      {t('ppage.consultation', { fee: Number(d.consultation_fee) })}
                    </span>
                    <span className="text-slate-400">{t('ppage.yrsExp', { n: d.experience_years })}</span>
                  </div>
                </div>

                {bookable ? (
                  <Link
                    to={`/patient-dashboard/appointments/new?doctor=${d.doctor_id}`}
                    className="mt-4 w-full rounded-xl bg-brand-blue py-2 text-center text-[13px] font-semibold text-white transition-colors hover:bg-brand-blueDark"
                  >
                    {t('ppage.bookAppointment')}
                  </Link>
                ) : (
                  <button
                    disabled
                    className="mt-4 w-full cursor-not-allowed rounded-xl bg-brand-blue py-2 text-[13px] font-semibold text-white opacity-40"
                  >
                    {t('ppage.unavailable')}
                  </button>
                )}
              </Card>
            )
          })}
        </div>
      )}

      <SymptomHelper
        open={helperOpen}
        onClose={() => setHelperOpen(false)}
        onPick={(s) => { setSpecialty(s); setQuery('') }}
      />
    </div>
  )
}

export default Doctors
