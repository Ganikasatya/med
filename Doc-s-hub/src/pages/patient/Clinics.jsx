import { Building2, MapPin, Clock, Users } from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { CLINICS_LIST } from '../../data/patientDashboardData.js'

function OpenBadge({ status }) {
  const open = status === 'Open'
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
      {status}
    </span>
  )
}

/** Clinics directory — sample listing. */
function Clinics() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Clinics" subtitle="Browse clinics, timings and availability." />

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {CLINICS_LIST.map((c) => (
          <Card key={c.name} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue">
                <Building2 className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[15px] font-bold text-brand-navy">{c.name}</p>
                <p className="flex items-center gap-1 text-[12px] text-slate-500"><MapPin className="h-3.5 w-3.5 text-slate-400" />{c.location}</p>
              </div>
              <OpenBadge status={c.status} />
            </div>

            <div className="mt-3 space-y-1.5 text-[12.5px] text-slate-500">
              <p className="flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-slate-400" />{c.doctors} doctors</p>
              <p className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-slate-400" />{c.timings}</p>
            </div>

            <button className="mt-4 w-full rounded-xl border border-brand-blue py-2 text-[13px] font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight/40">
              View Doctors
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Clinics
