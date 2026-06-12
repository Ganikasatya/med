import { useMemo, useState } from 'react'
import { Bell, Download, Filter, FlaskConical, HeartPulse, MessageSquare, PackageCheck, Plus, Search, Send } from 'lucide-react'
import { Avatar, Card, PageHeading, StatusBadge, ToolButton } from '../../components/clinic/ui.jsx'
import {
  APPOINTMENTS, MEDICINES, NOTIFICATIONS, PATIENTS, PRESCRIPTIONS, QUEUE,
  VITAL_HISTORY, VITALS,
} from '../../data/compounderData.js'

function PatientCell({ row }) {
  const name = row.patient || 'Ravi Kumar'
  return <div className="flex items-center gap-2.5"><Avatar name={name} className="h-9 w-9 text-xs" /><div><p className="font-semibold text-brand-navy">{name}</p>{row.pid && <p className="text-[10px] text-slate-400">PID: {row.pid}</p>}</div></div>
}

function Filters({ q, setQ }) {
  return (
    <Card className="flex flex-wrap items-end gap-3">
      <label className="min-w-[240px] flex-1"><span className="mb-1 block text-[11px] font-semibold text-slate-500">Search Patients</span><span className="flex items-center gap-2 rounded-xl border border-slate-200 px-3"><Search className="h-4 w-4 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or mobile number" className="w-full bg-transparent py-2 text-sm outline-none" /></span></label>
      {['All Ages', 'All Genders', 'All Status'].map((x) => <button key={x} className="rounded-xl border border-slate-200 px-4 py-2 text-[12px] font-semibold text-slate-600">{x}</button>)}
      <ToolButton icon={Filter} tone="primary">Filter</ToolButton>
    </Card>
  )
}

function QueueTable({ appointments = false }) {
  const rows = appointments ? APPOINTMENTS : QUEUE
  return (
    <Card>
      <table className="w-full text-left">
        <thead><tr className="text-[11px] font-semibold text-slate-400">{appointments && <th className="pb-3">Time</th>}<th className="pb-3">Token</th><th className="pb-3">Patient Details</th><th className="pb-3">Age / Gender</th>{appointments && <th className="pb-3">Type</th>}<th className="pb-3">Status</th><th className="pb-3">Doctor</th><th className="pb-3">Action</th></tr></thead>
        <tbody className="text-[13px]">{rows.map((r) => <tr key={r.token} className="border-t border-slate-50">
          {appointments && <td className="py-3 font-semibold text-slate-500">{r.time}</td>}<td className="py-3 text-lg font-extrabold text-brand-navy">{r.token}</td><td className="py-3"><PatientCell row={r} /></td><td className="py-3 text-slate-500">{r.age}</td>
          {appointments && <td className="py-3 text-slate-500">{r.type}</td>}<td className="py-3"><StatusBadge status={r.status} /></td><td className="py-3 text-slate-500">{r.doctor}</td><td className="py-3"><button className="rounded-lg border border-brand-blue px-3 py-1.5 text-[11px] font-semibold text-brand-blue">{r.status === 'Waiting' && !appointments ? 'Call Next' : 'View Details'}</button></td>
        </tr>)}</tbody>
      </table>
    </Card>
  )
}

function PatientsView({ searchOnly = false }) {
  const [q, setQ] = useState('')
  const rows = useMemo(() => PATIENTS.filter((p) => p.patient.toLowerCase().includes(q.toLowerCase())), [q])
  return <><Filters q={q} setQ={setQ} /><Card>
    <div className="mb-3 flex items-center justify-between"><h3 className="text-[16px] font-bold text-brand-navy">{searchOnly ? 'Search Results (128 Patients)' : 'All Patients (256)'}</h3><div className="flex gap-2"><ToolButton icon={Download}>Export</ToolButton>{!searchOnly && <ToolButton icon={Plus} tone="primary">Add Patient</ToolButton>}</div></div>
    <table className="w-full text-left"><thead><tr className="text-[11px] font-semibold text-slate-400"><th className="pb-3">Patient Details</th><th className="pb-3">Age / Gender</th><th className="pb-3">Mobile</th>{!searchOnly && <th className="pb-3">Blood Group</th>}<th className="pb-3">Last Visit</th><th className="pb-3">Visits</th><th className="pb-3">Action</th></tr></thead>
    <tbody className="text-[13px]">{rows.map((r) => <tr key={r.pid} className="border-t border-slate-50"><td className="py-3"><PatientCell row={r} /></td><td className="py-3 text-slate-500">{r.age}</td><td className="py-3 text-slate-500">{r.mobile}</td>{!searchOnly && <td className="py-3 font-semibold text-brand-navy">{r.blood}</td>}<td className="py-3 text-slate-500">{r.lastVisit}</td><td className="py-3 font-bold text-brand-blue">{r.visits}</td><td className="py-3"><button className="rounded-lg border border-brand-blue px-3 py-1.5 text-[11px] font-semibold text-brand-blue">View Profile</button></td></tr>)}</tbody></table>
  </Card></>
}

function VitalsView() {
  const tone = { rose: 'bg-rose-50 text-rose-600', red: 'bg-red-50 text-red-600', blue: 'bg-blue-50 text-brand-blue', purple: 'bg-purple-50 text-purple-600', green: 'bg-green-50 text-green-600', orange: 'bg-orange-50 text-orange-500', cyan: 'bg-cyan-50 text-cyan-600' }
  return <><Card className="flex items-center gap-4"><Avatar name="Ravi Kumar" className="h-14 w-14 text-lg" /><div><h2 className="text-xl font-extrabold text-brand-navy">Ravi Kumar</h2><p className="text-[12px] text-slate-500">PID: P123456 · 45 Y · Male · 98765XXXXXX</p></div><div className="ml-auto"><ToolButton icon={Plus} tone="primary">Record New Vitals</ToolButton></div></Card>
    <Card><h3 className="mb-3 text-[16px] font-bold text-brand-navy">Latest Vitals</h3><div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">{VITALS.map((v) => <div key={v.label} className={`rounded-xl p-4 text-center ${tone[v.tone]}`}><HeartPulse className="mx-auto h-5 w-5" /><p className="mt-2 text-[10px] font-semibold">{v.label}</p><p className="mt-1 text-xl font-extrabold text-brand-navy">{v.value}</p><p className="text-[10px] text-slate-500">{v.unit}</p></div>)}</div></Card>
    <Card><h3 className="mb-3 text-[16px] font-bold text-brand-navy">Vitals History</h3><table className="w-full text-left"><thead><tr className="text-[11px] text-slate-400"><th>Date & Time</th><th>Blood Pressure</th><th>Heart Rate</th><th>SpO2</th><th>Temperature</th><th>Respiratory</th><th>Weight</th><th>BMI</th></tr></thead><tbody className="text-[13px]">{VITAL_HISTORY.map((r) => <tr key={r.date} className="border-t border-slate-50"><td className="py-3 font-semibold text-brand-navy">{r.date}</td><td>{r.bp}</td><td>{r.heart}</td><td>{r.spo2}</td><td>{r.temp}</td><td>{r.respiratory}</td><td>{r.weight}</td><td>{r.bmi}</td></tr>)}</tbody></table></Card></>
}

function ClinicalTable({ type }) {
  const isMedicine = type === 'medicines'
  const rows = isMedicine ? MEDICINES : PRESCRIPTIONS
  return <><Filters q="" setQ={() => {}} /><Card><div className="mb-3 flex justify-between"><h3 className="text-[16px] font-bold text-brand-navy">{isMedicine ? 'Medicine Dispensed (15)' : 'Prescriptions (15)'}</h3><ToolButton icon={Download}>Export</ToolButton></div>
    <table className="w-full text-left"><thead><tr className="text-[11px] text-slate-400"><th className="pb-3">Date & Time</th>{isMedicine && <th className="pb-3">Patient</th>}<th className="pb-3">Prescribed By</th>{!isMedicine && <th className="pb-3">Visit Type</th>}<th className="pb-3">{isMedicine ? 'Medications' : 'Diagnosis'}</th><th className="pb-3">{isMedicine ? 'Total Items' : 'Medicines'}</th><th className="pb-3">Status</th><th className="pb-3">Action</th></tr></thead>
    <tbody className="text-[13px]">{rows.map((r, i) => <tr key={`${r.date}-${i}`} className="border-t border-slate-50"><td className="py-3 font-semibold text-brand-navy">{r.date}</td>{isMedicine && <td className="py-3"><PatientCell row={r} /></td>}<td className="py-3 text-slate-500">{r.doctor}</td>{!isMedicine && <td className="py-3 text-slate-500">{r.type}</td>}<td className="py-3 text-slate-500">{isMedicine ? r.medicines : r.diagnosis}</td><td className="py-3 font-semibold text-brand-blue">{isMedicine ? r.items : r.medicines}</td><td className="py-3"><StatusBadge status={r.status} /></td><td className="py-3"><button className="rounded-lg border border-brand-blue px-3 py-1.5 text-[11px] font-semibold text-brand-blue">View Details</button></td></tr>)}</tbody></table>
  </Card></>
}

function MessagesView() {
  return <div className="grid min-h-[600px] grid-cols-[320px_1fr] gap-4"><Card className="p-0"><div className="flex gap-2 border-b p-3"><Search className="h-4 w-4 text-slate-400" /><input placeholder="Search messages" className="w-full outline-none" /></div>{['Dr. Ramesh Kumar', 'Dr. Ajay Sharma', 'Lab Department', 'Pharmacy', 'Admin'].map((n, i) => <div key={n} className={`flex items-center gap-3 border-b border-slate-50 p-3 ${i === 0 ? 'bg-blue-50' : ''}`}><Avatar name={n} className="h-9 w-9 text-xs" /><div><p className="text-[13px] font-bold text-brand-navy">{n}</p><p className="text-[11px] text-slate-400">Please check the lab report...</p></div></div>)}</Card><Card className="flex flex-col"><div className="flex items-center gap-3 border-b pb-3"><Avatar name="Dr. Ramesh Kumar" className="h-10 w-10" /><p className="font-bold text-brand-navy">Dr. Ramesh Kumar</p></div><div className="flex-1 space-y-3 py-5"><p className="max-w-md rounded-xl bg-slate-100 p-3 text-[13px]">Please check the lab report of Ravi Kumar and update me.</p><p className="ml-auto max-w-md rounded-xl bg-green-100 p-3 text-[13px]">Okay doctor, I will check and update you shortly.</p></div><div className="flex gap-2 border-t pt-3"><input placeholder="Type a message..." className="field-input flex-1" /><button className="rounded-xl bg-brand-blue px-4 text-white"><Send className="h-4 w-4" /></button></div></Card></div>
}

function NotificationsView() {
  return <Card><div className="mb-3 flex justify-between"><h3 className="text-[16px] font-bold text-brand-navy">All Notifications (12)</h3><button className="text-[12px] font-semibold text-brand-blue">Mark all as read</button></div>{NOTIFICATIONS.map((n) => <div key={n.title} className="flex items-center gap-3 border-t border-slate-50 py-4"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-brand-blue"><Bell className="h-5 w-5" /></span><div className="flex-1"><p className="text-[13px] font-bold text-brand-navy">{n.title}</p><p className="text-[12px] text-slate-500">{n.desc}</p></div><span className="text-[11px] text-slate-400">{n.time}</span></div>)}</Card>
}

const META = {
  queue: ["Today's Queue", "Manage and monitor today's patient queue"],
  appointments: ['Upcoming Appointments', 'View and manage all upcoming appointments'],
  'patient-search': ['Patient Search', 'Search and view patient details and history'],
  patients: ['Patient List', 'View and manage all registered patients'],
  vitals: ['Vitals & Measurements', 'View and record patient vitals history'],
  'lab-orders': ['Lab Test Orders', 'Create and track diagnostic test requests'],
  prescriptions: ['Prescriptions (History)', 'View and manage patient prescription history'],
  medicines: ['Medicine Dispensed', 'View and manage dispensed medicines'],
  messages: ['Messages', 'Secure communication with doctors and staff'],
  notifications: ['Notifications', 'Clinic alerts, reminders and system updates'],
}

function Workspace({ type }) {
  const [title, subtitle] = META[type]
  let content
  if (type === 'queue') content = <QueueTable />
  else if (type === 'appointments') content = <QueueTable appointments />
  else if (type === 'patient-search') content = <PatientsView searchOnly />
  else if (type === 'patients') content = <PatientsView />
  else if (type === 'vitals') content = <VitalsView />
  else if (type === 'prescriptions' || type === 'medicines') content = <ClinicalTable type={type} />
  else if (type === 'messages') content = <MessagesView />
  else if (type === 'notifications') content = <NotificationsView />
  else content = <Card className="flex min-h-[420px] flex-col items-center justify-center text-center"><FlaskConical className="h-12 w-12 text-purple-500" /><h3 className="mt-3 text-lg font-bold text-brand-navy">Lab Test Orders</h3><p className="mt-1 text-sm text-slate-500">Create, track and update patient lab orders.</p><div className="mt-4"><ToolButton icon={Plus} tone="primary">New Lab Order</ToolButton></div></Card>

  return <div className="flex flex-col gap-4"><PageHeading title={title} subtitle={subtitle}>{type !== 'messages' && type !== 'notifications' && <ToolButton icon={Download}>Export</ToolButton>}</PageHeading>{content}</div>
}

export default Workspace
