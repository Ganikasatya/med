import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MapPin, IndianRupee, Search, Stethoscope } from 'lucide-react'
import { Card, StatusBadge, Avatar, PageHeading } from '../../components/clinic/ui.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { useI18n } from '../../i18n/index.jsx'

/** Maps the backend doctor status into the badge vocabulary used by the UI. */
function statusLabel(d) {
  if (d.status && d.status !== 'active') return 'On Leave'
  return d.is_available_today ? 'Available' : 'Busy'
}

function Doctors() {
  const { t } = useI18n()
  const [params] = useSearchParams()
  const clinicId = params.get('clinic') || ''
  const [query, setQuery] = useState('')
  const { doctorsById, hospitalsById, loading } = usePatientCtx()

  const clinicName = clinicId ? hospitalsById[clinicId]?.name : ''

  const doctors = useMemo(() => {
    const term = query.trim().toLowerCase()
    return Object.values(doctorsById).filter((doctor) => {
      const matchesClinic = !clinicId || String(doctor.hospital_id) === String(clinicId)
      const hospital = hospitalsById[doctor.hospital_id]?.name || ''
      const matchesSearch =
        !term ||
        [doctor.name, doctor.specialization, hospital].some((v) =>
          String(v).toLowerCase().includes(term),
        )
      return matchesClinic && matchesSearch
    })
  }, [doctorsById, hospitalsById, clinicId, query])

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

      {loading ? (
        <p className="text-sm text-slate-400">{t('ppage.loadingDoctors')}</p>
      ) : doctors.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-[15px] font-bold text-brand-navy">{t('ppage.noDoctorsFound')}</p>
          <p className="mt-1 text-[13px] text-slate-500">{t('ppage.tryAnother')}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          {doctors.map((d) => {
            const hospital = hospitalsById[d.hospital_id]
            const label = statusLabel(d)
            const bookable = label !== 'On Leave'
            return (
              <Card key={d.doctor_id} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <Avatar name={d.name} className="h-14 w-14 text-lg" />
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
    </div>
  )
}

export default Doctors
