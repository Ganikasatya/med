import { IndianRupee, Clock, Pencil } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { FEES } from '../../data/doctorPagesData.js'

function Fees() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Consultation Fees" subtitle="Set fees and durations for each consultation type.">
        <ToolButton icon={Pencil} tone="primary">Edit Fees</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {FEES.map((f) => (
          <Card key={f.type} className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blueLight text-brand-blue">
              <IndianRupee className="h-7 w-7" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-brand-navy">{f.type}</p>
              <p className="text-[12.5px] text-slate-500">{f.follow}</p>
              <p className="mt-1 flex items-center gap-1 text-[12px] text-slate-400"><Clock className="h-3.5 w-3.5" /> {f.duration}</p>
            </div>
            <div className="text-right">
              <p className="text-[26px] font-extrabold leading-none text-brand-navy">₹{f.fee}</p>
              <p className="text-[11px] text-slate-400">per visit</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Fees
