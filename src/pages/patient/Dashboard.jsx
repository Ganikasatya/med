import { Link } from 'react-router-dom'
import {
  ArrowRight, MapPin, Navigation, RefreshCw, Clock, Bell, Heart, ShieldCheck,
  Ticket, AlertTriangle, FileText, FlaskConical, Eye, Download, Stethoscope,
} from 'lucide-react'
import { Card, StatusBadge, Avatar } from '../../components/clinic/ui.jsx'
import {
  PATIENT, KPIS, TODAY_TOKEN, SMART_TRAVEL, LIVE_QUEUE, UPCOMING_APPTS,
  QUICK_ACTIONS, NOTIFICATIONS, PRESCRIPTIONS, TRUST,
} from '../../data/patientDashboardData.js'

const KPI_TONE = {
  blue: 'bg-blue-100 text-brand-blue',
  green: 'bg-green-100 text-green-600',
  purple: 'bg-purple-100 text-purple-600',
  orange: 'bg-orange-100 text-orange-500',
}

function KpiCard({ value, label, action, to, icon: Icon, tone }) {
  return (
    <Card className="flex items-start justify-between p-4">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-slate-500">{label}</p>
        <p className="mt-2 text-[30px] font-extrabold leading-none text-brand-navy">{value}</p>
        <Link to={to} className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-brand-blue hover:gap-1.5">
          {action} <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${KPI_TONE[tone]}`}>
        <Icon className="h-[22px] w-[22px]" />
      </span>
    </Card>
  )
}

/* Progress bar used by the token / live-queue cards. */
function Progress({ pct }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-brand-green" style={{ width: `${pct}%` }} />
    </div>
  )
}

const NOTIF_META = {
  token: { icon: Ticket, tone: 'bg-blue-100 text-brand-blue' },
  delay: { icon: AlertTriangle, tone: 'bg-red-100 text-red-500' },
  reminder: { icon: Bell, tone: 'bg-green-100 text-green-600' },
}

const TRUST_ICONS = { ShieldCheck, Clock, Bell, Heart }

function QueueBadge({ status }) {
  if (status === 'Your Turn')
    return <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-bold text-green-700">Your Turn</span>
  return <StatusBadge status={status} />
}

function Dashboard() {
  return (
    <div className="flex flex-col gap-4">
      {/* Greeting */}
      <div>
        <h1 className="text-[22px] font-extrabold text-brand-navy">
          {PATIENT.greeting}, {PATIENT.name} <span className="align-middle">👋</span>
        </h1>
        <p className="text-[13.5px] text-slate-500">Take charge of your health today.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_360px]">
        {/* ============ MAIN COLUMN ============ */}
        <div className="flex flex-col gap-5">
          {/* KPI strip */}
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {KPIS.map((k) => <KpiCard key={k.label} {...k} />)}
          </div>

          {/* Today's Token Status + Smart Travel */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
            {/* Token status */}
            <Card className="p-5">
              <div className="mb-4 flex items-center gap-2.5">
                <h3 className="text-[17px] font-bold text-brand-navy">Today's Token Status</h3>
                <span className="flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-[11px] font-semibold text-green-700">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Live
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* clinic + doctor */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
                  <p className="text-[12px] font-semibold text-slate-400">Clinic</p>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <Avatar name={TODAY_TOKEN.doctor} className="h-9 w-9" />
                    <div className="leading-tight">
                      <p className="text-[14px] font-bold text-brand-navy">{TODAY_TOKEN.clinic}</p>
                      <p className="text-[12px] text-slate-500">{TODAY_TOKEN.doctor}</p>
                      <p className="text-[11px] text-slate-400">{TODAY_TOKEN.specialty}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-400">Your Token Number</p>
                      <p className="text-[26px] font-extrabold leading-none text-brand-green">{TODAY_TOKEN.tokenNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold text-slate-400">Estimated Time</p>
                      <p className="text-[16px] font-extrabold text-brand-navy">{TODAY_TOKEN.estimatedTime}</p>
                    </div>
                  </div>
                  <p className="mt-2 text-[12px] text-slate-500">
                    You are <span className="font-bold text-brand-green">{TODAY_TOKEN.queuePosition}th in queue</span>
                  </p>
                </div>

                {/* live queue progress */}
                <div className="flex flex-col">
                  <p className="text-[13px] font-bold text-brand-navy">Live Queue Progress</p>
                  <p className="mt-0.5 text-[12px] text-slate-500">Total Tokens for Today: {TODAY_TOKEN.totalTokens}</p>
                  <div className="mt-3 flex items-center justify-between text-[12px]">
                    <span className="text-slate-500">Completed</span>
                    <span className="text-slate-500">In Queue</span>
                  </div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[20px] font-extrabold text-brand-navy">{TODAY_TOKEN.completed}</span>
                    <span className="text-[20px] font-extrabold text-brand-navy">{TODAY_TOKEN.inQueue}</span>
                  </div>
                  <div className="mt-auto">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Progress</span><span>{TODAY_TOKEN.progressPct}%</span>
                    </div>
                    <Progress pct={TODAY_TOKEN.progressPct} />
                    <Link to="tokens" className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-blue py-2 text-[13px] font-semibold text-brand-blue transition-colors hover:bg-brand-blueLight/40">
                      View Live Queue
                    </Link>
                  </div>
                </div>
              </div>
            </Card>

            {/* Smart travel */}
            <Card className="flex flex-col p-5">
              <h3 className="text-[17px] font-bold text-brand-navy">Smart Travel &amp; Reach on Time</h3>
              <p className="mt-1 text-[12.5px] text-slate-500">{SMART_TRAVEL.trafficText}</p>
              <div className="mt-3 flex items-center gap-4">
                <div>
                  <p className="text-[28px] font-extrabold leading-none text-brand-green">{SMART_TRAVEL.travelMins} mins</p>
                  <p className="mt-2 text-[12px] text-slate-400">Recommended Start Time</p>
                  <p className="text-[16px] font-extrabold text-brand-navy">{SMART_TRAVEL.recommendedStart}</p>
                </div>
                {/* faux map */}
                <div className="relative h-24 flex-1 overflow-hidden rounded-xl bg-brand-blueLight/60">
                  <span className="absolute left-3 top-12 h-px w-24 -rotate-12 bg-brand-blue/40" />
                  <span className="absolute left-12 top-3 h-16 w-px rotate-12 bg-brand-blue/30" />
                  <span className="absolute left-4 top-10 h-2 w-2 rounded-full bg-brand-green ring-2 ring-white" />
                  <MapPin className="absolute right-4 top-3 h-5 w-5 text-brand-blue" />
                </div>
              </div>
              <button className="mt-auto flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-blue py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-blueDark">
                <Navigation className="h-4 w-4" /> Get Directions
              </button>
            </Card>
          </div>

          {/* Upcoming appointments */}
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-brand-navy">Upcoming Appointments</h3>
              <Link to="appointments" className="text-[13px] font-semibold text-brand-blue hover:underline">View All</Link>
            </div>
            <ul className="divide-y divide-slate-50">
              {UPCOMING_APPTS.map((a) => (
                <li key={a.token} className="flex flex-wrap items-center gap-4 py-3">
                  <Avatar name={a.doctor} className="h-11 w-11" />
                  <div className="min-w-[150px] leading-tight">
                    <p className="text-[14px] font-bold text-brand-navy">{a.doctor}</p>
                    <p className="text-[12px] text-slate-500">{a.specialty}</p>
                  </div>
                  <div className="flex items-center gap-2 text-center">
                    <div className="rounded-lg bg-brand-blueLight px-2.5 py-1">
                      <p className="text-[16px] font-extrabold leading-none text-brand-blue">{a.date}</p>
                      <p className="text-[10px] text-slate-500">{a.month}</p>
                    </div>
                    <span className="text-[13px] font-semibold text-slate-600">{a.time}</span>
                  </div>
                  <div className="min-w-[150px] leading-tight">
                    <p className="text-[13px] font-semibold text-brand-navy">{a.clinic}</p>
                    <p className="text-[12px] text-slate-400">{a.location}</p>
                  </div>
                  <div className="ml-auto text-right leading-tight">
                    <p className="text-[12.5px] font-semibold text-slate-500">Token: <span className="font-bold text-brand-navy">{String(a.token).padStart(2, '0')}</span></p>
                    <div className="mt-1"><StatusBadge status={a.status} /></div>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Quick actions + recent notifications */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <h3 className="mb-3 text-[17px] font-bold text-brand-navy">Quick Actions</h3>
              <div className="grid grid-cols-3 gap-3">
                {QUICK_ACTIONS.map(({ label, icon: Icon, to }) => (
                  <Link
                    key={label}
                    to={to}
                    className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-100 px-2 py-4 text-center transition-colors hover:border-brand-blue hover:bg-brand-blueLight/40"
                  >
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blueLight text-brand-blue">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="text-[12px] font-semibold leading-tight text-brand-navy">{label}</span>
                  </Link>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[17px] font-bold text-brand-navy">Recent Notifications</h3>
                <Link to="notifications" className="text-[13px] font-semibold text-brand-blue hover:underline">View All</Link>
              </div>
              <ul className="space-y-3.5">
                {NOTIFICATIONS.map((n, i) => {
                  const meta = NOTIF_META[n.kind]
                  const Icon = meta.icon
                  return (
                    <li key={i} className="flex gap-3">
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.tone}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[13px] text-slate-600">{n.title}</p>
                        <p className="text-[11px] text-slate-400">{n.time}</p>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </Card>
          </div>
        </div>

        {/* ============ RIGHT RAIL ============ */}
        <div className="flex flex-col gap-6">
          {/* My Tokens / Live Queue */}
          <Card className="p-0">
            <div className="flex items-center justify-center rounded-t-2xl bg-brand-blue py-2">
              <span className="text-[13px] font-bold text-white">My Tokens / Live Queue</span>
            </div>
            <div className="p-5">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <h3 className="text-[15px] font-bold text-brand-navy">Live Queue – {LIVE_QUEUE.clinic}</h3>
                  <p className="text-[12px] text-slate-500">Total Tokens for Today: {LIVE_QUEUE.totalTokens}</p>
                </div>
                <button className="flex items-center gap-1 text-[12px] font-semibold text-brand-blue hover:underline">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>

              <div className="mb-3 flex gap-3">
                <div className="flex flex-1 flex-col items-center rounded-xl border border-green-100 bg-green-50/60 py-3">
                  <p className="text-[11px] font-semibold text-slate-500">Your Token</p>
                  <p className="text-[30px] font-extrabold leading-none text-brand-green">{LIVE_QUEUE.yourToken}</p>
                  <p className="mt-1 text-[11px] text-slate-500">You are {LIVE_QUEUE.queuePosition}th in queue</p>
                  <p className="mt-1 text-[11px] text-slate-400">Estimated Time</p>
                  <p className="text-[14px] font-extrabold text-brand-navy">{LIVE_QUEUE.estimatedTime}</p>
                </div>
                <div className="flex flex-1 flex-col justify-center rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold text-slate-500">Queue Progress</p>
                  <p className="text-[20px] font-extrabold text-brand-navy">{LIVE_QUEUE.progressPct}%</p>
                  <Progress pct={LIVE_QUEUE.progressPct} />
                  <div className="mt-2 flex justify-between text-[10.5px] text-slate-400">
                    <span><span className="font-bold text-green-600">{LIVE_QUEUE.completed}</span> Completed</span>
                    <span><span className="font-bold text-brand-navy">{LIVE_QUEUE.inQueue}</span> In Queue</span>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-[11px] font-semibold text-slate-400">
                      <th className="px-3 py-2">Token No.</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Time</th>
                    </tr>
                  </thead>
                  <tbody className="text-[12px]">
                    {LIVE_QUEUE.rows.map((r) => (
                      <tr key={r.token} className={`border-t border-slate-50 ${r.status === 'Your Turn' ? 'bg-green-50/60' : ''}`}>
                        <td className="px-3 py-2 font-bold text-brand-navy">{r.token}</td>
                        <td className="px-3 py-2"><QueueBadge status={r.status} /></td>
                        <td className="px-3 py-2 tabular-nums text-slate-500">{r.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-center text-[11.5px] text-slate-400">Please check-in at the clinic and wait for your turn.</p>
            </div>
          </Card>

          {/* Health Records & Prescriptions */}
          <Card className="p-0">
            <div className="flex items-center justify-center rounded-t-2xl bg-brand-navy py-2">
              <span className="text-[13px] font-bold text-white">Health Records &amp; Prescriptions</span>
            </div>
            <div className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-brand-navy">My Prescriptions</h3>
                <Link to="prescriptions" className="rounded-lg bg-brand-blue px-3 py-1 text-[12px] font-semibold text-white hover:bg-brand-blueDark">
                  Upload New
                </Link>
              </div>
              <ul className="space-y-2.5">
                {PRESCRIPTIONS.map((p, i) => {
                  const Icon = p.kind === 'lab' ? FlaskConical : FileText
                  return (
                    <li key={i} className="flex items-center gap-3 rounded-xl border border-slate-100 p-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-blueLight text-brand-blue">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <div className="min-w-0 flex-1 leading-tight">
                        <p className="truncate text-[13px] font-bold text-brand-navy">{p.title}</p>
                        <p className="truncate text-[11px] text-slate-400">{p.sub}</p>
                      </div>
                      <span className="text-[11px] text-slate-400">{p.date}</span>
                      <div className="flex items-center gap-1.5">
                        <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-brand-blue hover:bg-brand-blueLight/40">
                          <Eye className="h-3.5 w-3.5" /> View
                        </button>
                        <button className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50">
                          <Download className="h-3.5 w-3.5" /> Download
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-green-50 px-3 py-2 text-[11.5px] text-green-700">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Your health data is secure and private. Only you can access your records.
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Trust strip */}
      <div className="mt-2 grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:grid-cols-2 lg:grid-cols-4">
        {TRUST.map((t) => {
          const Icon = TRUST_ICONS[t.icon]
          return (
            <div key={t.title} className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-greenLight text-brand-green">
                <Icon className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-[13.5px] font-bold text-brand-navy">{t.title}</p>
                <p className="text-[12px] text-slate-500">{t.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11.5px] text-slate-400">
        <span className="flex items-center gap-1.5"><Stethoscope className="h-3.5 w-3.5" /> Doctor Mitra · Patient Console · Version 1.0.0</span>
        <span>© 2025 Doctor Mitra. All rights reserved.</span>
      </div>
    </div>
  )
}

export default Dashboard
