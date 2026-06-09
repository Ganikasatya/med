import { Stethoscope, UserCheck, UserX, Plus, Search, Star, Users, DoorOpen, Briefcase } from 'lucide-react'
import { Card, StatusBadge, StatCard, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { DOCTOR_STATS, DOCTORS } from '../../data/clinicPagesData.js'

const STAT_ICONS = [Stethoscope, UserCheck, UserX]

function Doctors() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Doctors" subtitle="Your clinic's medical team and today's activity.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
          <Search className="h-4 w-4 text-slate-400" />
          <input placeholder="Search doctor…" className="w-40 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" />
        </div>
        <ToolButton icon={Plus} tone="primary">Add Doctor</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-3 gap-3">
        {DOCTOR_STATS.map((s, i) => <StatCard key={s.label} {...s} icon={STAT_ICONS[i]} />)}
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto sm:grid-cols-2 xl:grid-cols-3">
        {DOCTORS.map((d) => (
          <Card key={d.name} className="flex flex-col">
            <div className="flex items-start gap-3">
              <Avatar name={d.name} className="h-12 w-12 text-base" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-bold text-brand-navy">{d.name}</p>
                <p className="text-[12px] text-slate-500">{d.specialty}</p>
              </div>
              <StatusBadge status={d.status} />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2.5 text-[12px]">
              <Info icon={Users} label="Patients today" value={d.patients} />
              <Info icon={Star} label="Rating" value={d.rating} />
              <Info icon={DoorOpen} label="Room" value={d.room} />
              <Info icon={Briefcase} label="Experience" value={d.exp} />
            </div>

            <div className="mt-4 flex gap-2">
              <button className="flex-1 rounded-xl border border-slate-200 py-2 text-[13px] font-semibold text-brand-navy hover:border-brand-blue hover:text-brand-blue">View Profile</button>
              <button className="flex-1 rounded-xl bg-brand-blue py-2 text-[13px] font-semibold text-white hover:bg-brand-blueDark">Schedule</button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2">
      <Icon className="h-4 w-4 text-slate-400" />
      <div className="leading-tight">
        <p className="font-bold text-brand-navy">{value}</p>
        <p className="text-[10px] text-slate-400">{label}</p>
      </div>
    </div>
  )
}

export default Doctors
