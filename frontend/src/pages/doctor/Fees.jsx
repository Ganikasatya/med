import { IndianRupee, Lock } from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'

/**
 * The consultation fee is set by the clinic, not the doctor — so this page is
 * read-only. The clinic admin manages it from the Doctors page.
 */
function Fees() {
  const { doctor, loading } = useDoctorCtx()

  if (loading) return <p className="text-sm text-slate-400">Loading…</p>
  if (!doctor) return <p className="text-sm text-slate-400">No doctor profile found.</p>

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Consultation Fee" subtitle="Your consultation fee, set by the clinic." />

      <Card className="flex items-center gap-4 md:max-w-md">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blueLight text-brand-blue">
          <IndianRupee className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-brand-navy">Standard Consultation</p>
          <p className="text-[12.5px] text-slate-500">{doctor.specialization}</p>
        </div>
        <div className="text-right">
          <p className="text-[26px] font-extrabold leading-none text-brand-navy">₹{Number(doctor.consultation_fee)}</p>
          <p className="text-[11px] text-slate-400">per visit</p>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-[12.5px] text-slate-500 md:max-w-md">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        This fee is set by your clinic. Contact your clinic admin to change it.
      </div>
    </div>
  )
}

export default Fees
