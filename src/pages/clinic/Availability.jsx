import { useState } from 'react'
import { Save, Check, Sunrise, Sun, Sunset } from 'lucide-react'
import { Card, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { AVAILABILITY, WEEK_DAYS, SLOTS } from '../../data/clinicPagesData.js'

const SLOT_ICON = { Morning: Sunrise, Afternoon: Sun, Evening: Sunset }
const SLOT_TIME = { Morning: '9 AM – 12 PM', Afternoon: '12 PM – 4 PM', Evening: '4 PM – 9 PM' }

function Availability() {
  const doctors = Object.keys(AVAILABILITY)
  const [doctor, setDoctor] = useState(doctors[0])
  const [avail, setAvail] = useState(AVAILABILITY)

  const selectDoctor = (d) => setDoctor(d)
  const toggle = (day, slot) =>
    setAvail((a) => {
      const list = a[doctor][day]
      const next = list.includes(slot) ? list.filter((s) => s !== slot) : [...list, slot]
      return { ...a, [doctor]: { ...a[doctor], [day]: next } }
    })

  const docAvail = avail[doctor]
  const totalSlots = WEEK_DAYS.reduce((n, d) => n + docAvail[d].length, 0)

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Doctor Availability" subtitle="Set weekly working slots for each doctor.">
        <ToolButton icon={Save} tone="primary">Save Changes</ToolButton>
      </PageHeading>

      {/* Doctor selector */}
      <div className="flex flex-wrap gap-2">
        {doctors.map((d) => (
          <button
            key={d}
            onClick={() => selectDoctor(d)}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
              doctor === d ? 'border-brand-blue bg-brand-blueLight text-brand-blue' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
            }`}
          >
            <Avatar name={d} className="h-7 w-7 text-[10px]" />
            {d}
          </button>
        ))}
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[15px] font-bold text-brand-navy">Weekly Schedule — {doctor}</h3>
          <span className="rounded-full bg-brand-greenLight px-2.5 py-0.5 text-[11px] font-semibold text-brand-green">{totalSlots} active slots / week</span>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          <div className="grid grid-cols-[110px_repeat(3,1fr)] gap-2.5">
            {/* header */}
            <div />
            {SLOTS.map((s) => {
              const Icon = SLOT_ICON[s]
              return (
                <div key={s} className="flex flex-col items-center rounded-xl bg-slate-50 py-2">
                  <Icon className="h-4 w-4 text-slate-400" />
                  <span className="mt-1 text-[13px] font-bold text-brand-navy">{s}</span>
                  <span className="text-[10px] text-slate-400">{SLOT_TIME[s]}</span>
                </div>
              )
            })}

            {/* rows */}
            {WEEK_DAYS.map((day) => (
              <Fragmentish key={day} day={day}>
                {SLOTS.map((slot) => {
                  const on = docAvail[day].includes(slot)
                  return (
                    <button
                      key={slot}
                      onClick={() => toggle(day, slot)}
                      className={`flex items-center justify-center rounded-xl border py-3 text-[13px] font-semibold transition-colors ${
                        on ? 'border-brand-green bg-brand-greenLight text-brand-green' : 'border-dashed border-slate-200 text-slate-300 hover:border-brand-blue hover:text-brand-blue'
                      }`}
                    >
                      {on ? <span className="flex items-center gap-1"><Check className="h-4 w-4" /> Available</span> : 'Off'}
                    </button>
                  )
                })}
              </Fragmentish>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

/** A day label cell + its slot buttons, laid out into the grid. */
function Fragmentish({ day, children }) {
  return (
    <>
      <div className="flex items-center rounded-xl bg-slate-50 px-3 text-[13px] font-bold text-brand-navy">{day}</div>
      {children}
    </>
  )
}

export default Availability
