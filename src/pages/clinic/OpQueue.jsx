import { useState } from 'react'
import { CalendarDays, RefreshCw, BellRing, ArrowRight, Radio, Clock, ChevronDown, Info } from 'lucide-react'
import { Card, StatusBadge } from '../../components/clinic/ui.jsx'
import {
  STATS,
  CURRENT_TOKEN,
  NEXT_TOKENS,
  WAITING,
  ARRIVED,
  ANALYTICS,
  CLINIC,
  GENDERS,
  VISIT_REASONS,
} from '../../data/clinicDashboardData.js'

const TONES = {
  blue: { num: 'text-brand-blue', icon: 'bg-blue-100 text-brand-blue', card: 'border-blue-100 bg-blue-50/50' },
  green: { num: 'text-green-600', icon: 'bg-green-100 text-green-600', card: 'border-green-100 bg-green-50/50' },
  purple: { num: 'text-purple-600', icon: 'bg-purple-100 text-purple-600', card: 'border-purple-100 bg-purple-50/50' },
  teal: { num: 'text-teal-600', icon: 'bg-teal-100 text-teal-600', card: 'border-teal-100 bg-teal-50/50' },
  orange: { num: 'text-orange-500', icon: 'bg-orange-100 text-orange-500', card: 'border-orange-100 bg-orange-50/50' },
}

function LineSpark({ color }) {
  return (
    <svg viewBox="0 0 100 28" className="mt-1 h-7 w-full" preserveAspectRatio="none">
      <polyline points="0,24 18,20 36,22 54,12 72,9 90,4 100,3" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function BarSpark({ color }) {
  const bars = [9, 14, 11, 18, 13, 20, 16, 23]
  return (
    <svg viewBox="0 0 100 28" className="mt-1 h-7 w-full" preserveAspectRatio="none">
      {bars.map((h, i) => <rect key={i} x={i * 12.5 + 2} y={28 - h} width="7" height={h} rx="1.5" fill={color} />)}
    </svg>
  )
}
function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1 block text-[12px] font-semibold text-slate-600">{label}<span className="text-red-500">*</span></label>
      {children}
    </div>
  )
}
function MiniMetric({ tone, label, value, children }) {
  const bg = { blue: 'bg-blue-50', orange: 'bg-orange-50', green: 'bg-green-50' }[tone]
  return (
    <div className={`rounded-xl ${bg} p-3`}>
      <p className="text-[11px] font-semibold leading-tight text-slate-500">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold text-brand-navy">{value}</p>
      {children}
    </div>
  )
}

function OpQueue() {
  const [walkIn, setWalkIn] = useState({ name: '', mobile: '', age: '', gender: '', reason: '' })
  const set = (k) => (e) => setWalkIn((w) => ({ ...w, [k]: e.target.value }))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {/* Title row */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy">OP Queue Management</h1>
          <p className="mt-1 text-sm text-slate-500">Real-time overview of today's OPD queue and performance.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:border-slate-300">
            <CalendarDays className="h-4 w-4 text-brand-blue" /> {CLINIC.date} <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:border-slate-300">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
          <button className="flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50">
            <BellRing className="h-4 w-4" /> Doctor Delay Alert
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {STATS.map(({ value, label, icon: Icon, tone }) => {
          const t = TONES[tone]
          return (
            <div key={label} className={`rounded-2xl border p-3 ${t.card}`}>
              <div className="flex items-start gap-2.5">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${t.icon}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <div className={`text-[23px] font-extrabold leading-none ${t.num}`}>{value}</div>
                  <div className="mt-1 text-[12px] font-medium text-slate-500">{label}</div>
                </div>
              </div>
              <button className="mt-2 flex items-center gap-1 text-[12px] font-semibold text-brand-blue hover:gap-1.5">
                View details <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )
        })}
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1.3fr_1fr]">
        <Card className="flex flex-col">
          <h3 className="text-[15px] font-bold text-brand-navy">Current Running Token</h3>
          <div className="mt-5 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Radio className="h-7 w-7 shrink-0 text-green-500" />
              <span className="whitespace-nowrap text-[34px] font-extrabold leading-none text-green-600">{CURRENT_TOKEN.token}</span>
            </div>
            <div className="text-right">
              <p className="whitespace-nowrap text-[15px] font-bold text-brand-navy">{CURRENT_TOKEN.name}</p>
              <p className="text-[13px] text-slate-500">{CURRENT_TOKEN.age}</p>
              <span className="mt-1.5 inline-block rounded-md bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-700">{CURRENT_TOKEN.type}</span>
            </div>
          </div>
          <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-blue text-sm font-bold text-white">RS</span>
              <div className="leading-tight">
                <p className="text-[13px] font-bold text-brand-navy">{CURRENT_TOKEN.doctor}</p>
                <p className="text-[12px] text-slate-500">{CURRENT_TOKEN.specialty}</p>
              </div>
            </div>
            <div className="space-y-1 text-right text-[12px] text-slate-500">
              <p className="flex items-center justify-end gap-1"><Clock className="h-3.5 w-3.5" /> Since {CURRENT_TOKEN.since}</p>
              <p className="flex items-center justify-end gap-1"><Clock className="h-3.5 w-3.5" /> {CURRENT_TOKEN.elapsed}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Next 5 Tokens</h3>
            <button className="text-[13px] font-semibold text-brand-blue hover:underline">View all</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-400">
                <th className="pb-2 font-semibold">Token No.</th>
                <th className="pb-2 font-semibold">Patient Name</th>
                <th className="pb-2 font-semibold">Age / Gender</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {NEXT_TOKENS.map((r) => (
                <tr key={r.token} className="border-t border-slate-50">
                  <td className="whitespace-nowrap py-2 pr-3 font-semibold text-brand-navy">{r.token}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{r.name}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{r.age}</td>
                  <td className="py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 className="mb-2.5 text-[15px] font-bold text-brand-navy">Walk-in Patient Entry</h3>
          <div className="space-y-2">
            <Field label="Patient Name"><input value={walkIn.name} onChange={set('name')} placeholder="Enter full name" className="field-input" /></Field>
            <Field label="Mobile Number"><input value={walkIn.mobile} onChange={set('mobile')} placeholder="Enter mobile number" className="field-input" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age"><input value={walkIn.age} onChange={set('age')} placeholder="Enter age" className="field-input" /></Field>
              <Field label="Gender">
                <select value={walkIn.gender} onChange={set('gender')} className="field-input">
                  <option value="">Select gender</option>
                  {GENDERS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Reason for Visit">
              <select value={walkIn.reason} onChange={set('reason')} className="field-input">
                <option value="">Select reason</option>
                {VISIT_REASONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </Field>
            <button className="w-full rounded-xl bg-brand-blue py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blueDark">Generate Token</button>
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1.3fr_1fr]">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Waiting Patients</h3>
            <button className="text-[13px] font-semibold text-brand-blue hover:underline">View all</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="whitespace-nowrap text-[11px] font-semibold text-slate-400">
                <th className="pb-2 pr-3 font-semibold">Token No.</th>
                <th className="pb-2 pr-3 font-semibold">Patient Name</th>
                <th className="pb-2 pr-3 font-semibold">Age / Gender</th>
                <th className="pb-2 pr-3 font-semibold">Appointment Time</th>
                <th className="pb-2 pr-3 font-semibold">Waiting Since</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-[12.5px]">
              {WAITING.map((r) => (
                <tr key={r.token} className="border-t border-slate-50">
                  <td className="whitespace-nowrap py-2 pr-3 font-semibold text-brand-navy">{r.token}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{r.name}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{r.age}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{r.appt}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{r.since}</td>
                  <td className="py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Arrived Patients</h3>
            <button className="text-[13px] font-semibold text-brand-blue hover:underline">View all</button>
          </div>
          <table className="w-full text-left">
            <thead>
              <tr className="text-[12px] font-semibold text-slate-400">
                <th className="pb-2 font-semibold">Token No.</th>
                <th className="pb-2 font-semibold">Patient Name</th>
                <th className="pb-2 font-semibold">Age / Gender</th>
                <th className="pb-2 font-semibold">Arrival Time</th>
                <th className="pb-2 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              {ARRIVED.map((r) => (
                <tr key={r.token} className="border-t border-slate-50">
                  <td className="whitespace-nowrap py-2 pr-3 font-semibold text-brand-navy">{r.token}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-600">{r.name}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{r.age}</td>
                  <td className="whitespace-nowrap py-2 pr-3 text-slate-500">{r.arrival}</td>
                  <td className="py-2"><StatusBadge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[15px] font-bold text-brand-navy">Queue Analytics</h3>
            <button className="flex items-center gap-1 text-[12px] font-semibold text-slate-500">Today <ChevronDown className="h-3.5 w-3.5" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <MiniMetric tone="blue" label="Average Waiting Time" value={`${ANALYTICS.avgWait} mins`}><LineSpark color="#2563eb" /></MiniMetric>
            <MiniMetric tone="orange" label="Max Waiting Time" value={`${ANALYTICS.maxWait} mins`}><LineSpark color="#f97316" /></MiniMetric>
            <MiniMetric tone="green" label="Tokens Generated" value={ANALYTICS.tokensGenerated}><BarSpark color="#16a34a" /></MiniMetric>
            <MiniMetric tone="green" label="Consultations Completed" value={ANALYTICS.completed}><BarSpark color="#16a34a" /></MiniMetric>
          </div>
          <div className="mt-4">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[13px] font-semibold text-brand-navy">Queue Load</span>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-700">{ANALYTICS.queueLoadLabel}</span>
              <span className="ml-auto text-[12px] font-semibold text-slate-500">{ANALYTICS.queueLoad}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-amber-400" style={{ width: `${ANALYTICS.queueLoad}%` }} />
            </div>
          </div>
        </Card>
      </div>

      <p className="flex items-center justify-center gap-1.5 text-[12px] text-slate-400">
        <Info className="h-3.5 w-3.5" /> All times are in Asia/Kolkata (IST)
      </p>
    </div>
  )
}

export default OpQueue
