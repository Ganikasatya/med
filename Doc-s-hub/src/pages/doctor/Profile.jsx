import { Building2, Stethoscope, Mail, Phone, MapPin, BadgeCheck, CalendarDays, Pencil } from 'lucide-react'
import { Card, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { CLINIC_PROFILE } from '../../data/doctorPagesData.js'

function Row({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Icon className="h-[18px] w-[18px]" /></span>
      <div>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="text-[14px] font-medium text-brand-navy">{value}</p>
      </div>
    </div>
  )
}

function Profile() {
  const p = CLINIC_PROFILE
  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Clinic Profile" subtitle="Your clinic and practice details.">
        <ToolButton icon={Pencil} tone="primary">Edit Profile</ToolButton>
      </PageHeading>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        <Card className="flex flex-col items-center text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-brand-blueLight text-brand-blue"><Building2 className="h-10 w-10" /></span>
          <h3 className="mt-3 text-xl font-extrabold text-brand-navy">{p.name}</h3>
          <p className="flex items-center gap-1 text-[13px] text-green-600"><BadgeCheck className="h-4 w-4" /> Verified Clinic</p>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <Avatar name={p.doctor} className="h-11 w-11 text-sm" />
            <div className="text-left">
              <p className="text-[14px] font-bold text-brand-navy">{p.doctor}</p>
              <p className="text-[12px] text-slate-500">{p.specialty}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 text-[15px] font-bold text-brand-navy">Details</h3>
          <div className="grid grid-cols-1 gap-x-8 md:grid-cols-2">
            <Row icon={Stethoscope} label="Specialty" value={p.specialty} />
            <Row icon={BadgeCheck} label="Registration No." value={p.reg} />
            <Row icon={Mail} label="Email" value={p.email} />
            <Row icon={Phone} label="Phone" value={p.phone} />
            <Row icon={CalendarDays} label="Established" value={p.established} />
            <Row icon={MapPin} label="Address" value={p.address} />
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Profile
