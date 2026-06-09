import { Pencil, Phone, Mail, Cake, User2, Droplet, MapPin, Globe, ShieldAlert } from 'lucide-react'
import { Card, Avatar, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { PROFILE } from '../../data/patientDashboardData.js'

function Field({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className="text-[11.5px] font-semibold text-slate-400">{label}</p>
        <p className="text-[13.5px] font-semibold text-brand-navy">{value}</p>
      </div>
    </div>
  )
}

/** Patient profile & settings (read-only sample). */
function Profile() {
  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Profile Settings" subtitle="Manage your personal details and preferences.">
        <ToolButton icon={Pencil} tone="primary">Edit Profile</ToolButton>
      </PageHeading>

      {/* Identity header */}
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Avatar name={PROFILE.name} className="h-16 w-16 text-xl" />
        <div className="leading-tight">
          <p className="text-[18px] font-extrabold text-brand-navy">{PROFILE.name}</p>
          <p className="text-[13px] text-slate-500">{PROFILE.email}</p>
          <p className="text-[12.5px] text-slate-400">{PROFILE.phone}</p>
        </div>
        <span className="ml-auto rounded-full bg-green-100 px-3 py-1 text-[12px] font-semibold text-green-700">Verified Patient</span>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 text-[15px] font-bold text-brand-navy">Personal Information</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field icon={Phone} label="Phone" value={PROFILE.phone} />
            <Field icon={Mail} label="Email" value={PROFILE.email} />
            <Field icon={Cake} label="Date of Birth" value={PROFILE.dob} />
            <Field icon={User2} label="Gender" value={PROFILE.gender} />
            <Field icon={Droplet} label="Blood Group" value={PROFILE.bloodGroup} />
            <Field icon={Globe} label="Preferred Language" value={PROFILE.language} />
          </div>
          <div className="mt-3">
            <Field icon={MapPin} label="Address" value={PROFILE.address} />
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[15px] font-bold text-brand-navy">
            <ShieldAlert className="h-4 w-4 text-red-500" /> Emergency Contact
          </h3>
          <div className="grid grid-cols-1 gap-3">
            <Field icon={User2} label="Name" value={PROFILE.emergencyName} />
            <Field icon={Phone} label="Phone" value={PROFILE.emergencyPhone} />
          </div>

          <h3 className="mb-3 mt-6 text-[15px] font-bold text-brand-navy">Preferences</h3>
          <div className="space-y-2.5">
            {['SMS & WhatsApp reminders', 'Email notifications', 'Live queue alerts'].map((p) => (
              <label key={p} className="flex items-center justify-between rounded-xl border border-slate-100 px-3 py-2.5 text-[13px] text-slate-600">
                {p}
                <span className="relative inline-flex h-5 w-9 items-center rounded-full bg-brand-green">
                  <span className="absolute right-0.5 h-4 w-4 rounded-full bg-white" />
                </span>
              </label>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default Profile
