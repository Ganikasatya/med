import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Building2, MapPin, Phone, Users } from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { useI18n } from '../../i18n/index.jsx'

function OpenBadge({ active }) {
  const { t } = useI18n()
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {active ? t('ppage.open') : t('ppage.closed')}
    </span>
  )
}

/** Clinics directory — backed by GET /hospitals, with live doctor counts. */
function Clinics() {
  const { t } = useI18n()
  const { hospitalsById, doctorsById, loading } = usePatientCtx()

  const clinics = useMemo(() => {
    const counts = {}
    Object.values(doctorsById).forEach((d) => {
      counts[d.hospital_id] = (counts[d.hospital_id] || 0) + 1
    })
    return Object.values(hospitalsById).map((h) => ({ ...h, doctorCount: counts[h.hospital_id] || 0 }))
  }, [hospitalsById, doctorsById])

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={t('ppage.clinicsTitle')} subtitle={t('ppage.clinicsSubtitle')} />

      {loading ? (
        <p className="text-sm text-slate-400">{t('ppage.loadingClinics')}</p>
      ) : clinics.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[15px] font-bold text-brand-navy">{t('ppage.noClinics')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {clinics.map((c) => (
            <Card key={c.hospital_id} className="flex flex-col p-5">
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

              <div className="mt-3 space-y-1.5 text-[12.5px] text-slate-500">
                <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{t('ppage.nDoctors', { n: c.doctorCount })}</p>
                {c.phone && <p className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-slate-400" />{c.phone}</p>}
              </div>

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
