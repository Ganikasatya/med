/**
 * A compact 7-day strip showing where a doctor consults each day.
 *
 *  • Patient mode  (no clinicId)  — clinic days (blue) vs private days (purple).
 *  • Clinic mode   (clinicId set) — THIS clinic's days (blue) vs off-site days
 *    (amber, no patient/fee detail — privacy-safe).
 *
 * Reads the practice model only through src/lib/practice.js helpers.
 */
import { weeklyPlan, clinicPlan, fmtTime } from '../../lib/practice.js'

function Cell({ day, tone, title }) {
  const tones = {
    clinic: 'border-blue-200 bg-blue-50 text-brand-blue',
    private: 'border-purple-200 bg-purple-50 text-purple-600',
    offsite: 'border-amber-200 bg-amber-50 text-amber-600',
    off: 'border-dashed border-slate-200 bg-white text-slate-300',
  }
  const label = { clinic: 'Clinic', private: 'Private', offsite: 'Off-site', off: '·' }
  return (
    <div className="flex flex-col items-center gap-1" title={title}>
      <span className="text-[10px] font-semibold text-slate-400">{day}</span>
      <span className={`w-full rounded-md border py-1 text-center text-[9px] font-bold ${tones[tone]}`}>
        {label[tone]}
      </span>
    </div>
  )
}

/** Patient-facing: shows clinic vs private per day. */
export function WeekPlan({ profile }) {
  const plan = weeklyPlan(profile)
  return (
    <div className="grid grid-cols-7 gap-1">
      {plan.map(({ day, items }) => {
        const hasClinic = items.some((i) => i.affiliation?.type === 'clinic')
        const hasPrivate = items.some((i) => i.affiliation?.type === 'private')
        const tone = !items.length ? 'off' : hasClinic ? 'clinic' : hasPrivate ? 'private' : 'off'
        const title = items.length
          ? items.map((i) => `${i.affiliation?.name} ${fmtTime(i.start)}–${fmtTime(i.end)}`).join(' · ')
          : `${day}: off`
        return <Cell key={day} day={day} tone={hasClinic && hasPrivate ? 'clinic' : tone} title={title} />
      })}
    </div>
  )
}

/** Clinic-admin facing: shows THIS clinic's days vs off-site (private) days. */
export function ClinicWeekPlan({ profile, clinicId }) {
  const plan = clinicPlan(profile, clinicId)
  return (
    <div className="grid grid-cols-7 gap-1">
      {plan.map(({ day, here, offsite }) => {
        const tone = here.length ? 'clinic' : offsite.length ? 'offsite' : 'off'
        const title = here.length
          ? `${day}: here ${here.map((i) => `${fmtTime(i.start)}–${fmtTime(i.end)}`).join(', ')}`
          : offsite.length
            ? `${day}: off-site (unavailable here)`
            : `${day}: off`
        return <Cell key={day} day={day} tone={tone} title={title} />
      })}
    </div>
  )
}

/** Small legend row. */
export function WeekPlanLegend({ clinic = false }) {
  const items = clinic
    ? [['bg-blue-100 text-brand-blue', 'At this clinic'], ['bg-amber-100 text-amber-600', 'Off-site'], ['bg-slate-100 text-slate-400', 'Off']]
    : [['bg-blue-100 text-brand-blue', 'Clinic'], ['bg-purple-100 text-purple-600', 'Private'], ['bg-slate-100 text-slate-400', 'Off']]
  return (
    <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold text-slate-400">
      {items.map(([cls, label]) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`h-2.5 w-2.5 rounded-sm ${cls.split(' ')[0]}`} />
          {label}
        </span>
      ))}
    </div>
  )
}
