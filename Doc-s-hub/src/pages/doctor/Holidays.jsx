import { CalendarOff, Plus } from 'lucide-react'
import { Card, StatusBadge, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { HOLIDAYS } from '../../data/doctorPagesData.js'

function Holidays() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Holidays & Leave" subtitle="Mark days the clinic is closed or you're unavailable.">
        <ToolButton icon={Plus} tone="primary">Add Holiday</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {HOLIDAYS.map((h, i) => (
          <Card key={i} className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500"><CalendarOff className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-brand-navy">{h.name}</p>
              <p className="text-[12.5px] text-slate-500">{h.date} · {h.type}</p>
              <div className="mt-2"><StatusBadge status={h.status} /></div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Holidays
