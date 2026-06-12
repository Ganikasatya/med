import { Star, MapPin, IndianRupee, Search } from 'lucide-react'
import { Card, StatusBadge, Avatar, PageHeading } from '../../components/clinic/ui.jsx'
import { DOCTORS_LIST } from '../../data/patientDashboardData.js'

/** Doctors directory — sample listing with book action. */
function Doctors() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Find Doctors" subtitle="Search and book trusted doctors near you.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input className="w-48 text-[13px] outline-none placeholder:text-slate-400" placeholder="Search by name or specialty…" />
        </div>
      </PageHeading>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {DOCTORS_LIST.map((d) => (
          <Card key={d.name} className="flex flex-col p-5">
            <div className="flex items-start gap-3">
              <Avatar name={d.name} className="h-14 w-14 text-lg" />
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[15px] font-bold text-brand-navy">{d.name}</p>
                <p className="text-[12.5px] text-slate-500">{d.specialty}</p>
                <p className="mt-0.5 flex items-center gap-1 text-[12px] text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-brand-navy">{d.rating}</span>
                  <span className="text-slate-400">({d.reviews})</span>
                </p>
              </div>
              <StatusBadge status={d.status} />
            </div>

            <div className="mt-3 space-y-1.5 text-[12.5px] text-slate-500">
              <p className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{d.clinic} · {d.location}</p>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 font-semibold text-brand-navy"><IndianRupee className="h-3.5 w-3.5" />{d.fee} consultation</span>
                <span className="text-slate-400">{d.experience} exp.</span>
              </div>
            </div>

            <button
              disabled={d.status === 'On Leave'}
              className="mt-4 w-full rounded-xl bg-brand-blue py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-blueDark disabled:cursor-not-allowed disabled:opacity-40"
            >
              {d.status === 'On Leave' ? 'Unavailable' : 'Book Appointment'}
            </button>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Doctors
