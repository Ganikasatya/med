import { useMemo, useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, Phone, Users, Navigation, LocateFixed, X } from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import ClinicMap from '../../components/common/ClinicMap.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { useI18n } from '../../i18n/index.jsx'
import { haversineKm, travelMinutesBetween, getCurrentPosition } from '../../lib/geo.js'

/** A coordinate is usable only if it's a finite, non-zero number. */
const validCoord = (v) => v != null && v !== '' && Number.isFinite(Number(v)) && Number(v) !== 0
const hasCoords = (c) => validCoord(c.latitude) && validCoord(c.longitude)

function fmtDistance(km) {
  if (km == null) return null
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`
}

function OpenBadge({ active }) {
  const { t } = useI18n()
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {active ? t('ppage.open') : t('ppage.closed')}
    </span>
  )
}

/** Clinics directory — backed by GET /hospitals, with live doctor counts and an
 *  optional "near me" sort (browser geolocation → haversine distance). */
function Clinics() {
  const { t } = useI18n()
  const { hospitalsById, doctorsById, patient, loading } = usePatientCtx()

  const [origin, setOrigin] = useState(null) // { lat, lng } — the patient's location
  const [locBusy, setLocBusy] = useState(false)
  const [locError, setLocError] = useState(null)
  const [radius, setRadius] = useState('any') // 'any' | '5' | '10' | '25'  (km)

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

  const clinics = useMemo(() => {
    const counts = {}
    Object.values(doctorsById).forEach((d) => { counts[d.hospital_id] = (counts[d.hospital_id] || 0) + 1 })

    let list = Object.values(hospitalsById).map((h) => {
      const dKm = origin && hasCoords(h) ? haversineKm(origin.lat, origin.lng, Number(h.latitude), Number(h.longitude)) : null
      const eta = origin && hasCoords(h) ? travelMinutesBetween(origin, h) : null
      return { ...h, doctorCount: counts[h.hospital_id] || 0, distanceKm: dKm, etaMin: eta }
    })

    if (origin) {
      if (radius !== 'any') list = list.filter((c) => c.distanceKm != null && c.distanceKm <= Number(radius))
      list = list.slice().sort((a, b) => {
        if (a.distanceKm == null && b.distanceKm == null) return 0
        if (a.distanceKm == null) return 1
        if (b.distanceKm == null) return -1
        return a.distanceKm - b.distanceKm
      })
    }
    return list
  }, [hospitalsById, doctorsById, origin, radius])

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={t('ppage.clinicsTitle')} subtitle={t('ppage.clinicsSubtitle')} />

      {/* Near-me controls */}
      <div className="flex flex-wrap items-center gap-3">
        {!origin ? (
          <button
            onClick={useMyLocation}
            disabled={locBusy}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:opacity-60"
          >
            <LocateFixed className="h-4 w-4" /> {locBusy ? 'Locating…' : 'Show clinics near me'}
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
        <p className="text-sm text-slate-400">{t('ppage.loadingClinics')}</p>
      ) : clinics.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[15px] font-bold text-brand-navy">
            {origin && radius !== 'any' ? `No clinics within ${radius} km — try a larger radius.` : t('ppage.noClinics')}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {clinics.map((c) => (
            <Card key={c.hospital_id} className="relative flex flex-col p-5 transition-all duration-300 will-change-transform hover:z-20 hover:-translate-y-3 hover:scale-[1.08] hover:border-brand-blue/50 hover:shadow-[0_30px_65px_-14px_rgba(13,148,136,0.45)]">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue">
                  <Building2 className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1 leading-tight">
                  <p className="text-[15px] font-bold text-brand-navy">{c.name}</p>
                  <p className="flex items-center gap-1 text-[12px] text-slate-500">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {[c.city, c.state].filter(Boolean).join(', ') || c.address || '—'}
                  </p>
                </div>
                <OpenBadge active={c.is_active} />
              </div>

              {c.distanceKm != null && (
                <span className="mt-3 inline-flex w-fit items-center gap-1 rounded-full bg-brand-blueLight px-2.5 py-1 text-[11.5px] font-semibold text-brand-blue">
                  <Navigation className="h-3 w-3" />
                  {fmtDistance(c.distanceKm)}{c.etaMin ? ` · ~${c.etaMin} min` : ''} away
                </span>
              )}

              <div className="mt-3 space-y-1.5 text-[12.5px] text-slate-500">
                <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{t('ppage.nDoctors', { n: c.doctorCount })}</p>
                {c.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{c.phone}</p>}
              </div>

              {c.latitude != null && c.longitude != null && (
                <ClinicMap clinic={c} clinicLabel={c.name} height={150} className="mt-3" />
              )}

              <Link
                to={`/patient-dashboard/doctors?clinic=${c.hospital_id}`}
                className="mt-4 w-full rounded-xl border border-brand-blue py-2 text-center text-[13px] font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight/40"
              >
                {t('ppage.viewDoctors')}
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default Clinics
