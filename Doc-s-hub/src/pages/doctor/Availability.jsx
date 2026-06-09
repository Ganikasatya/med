import { useState } from 'react'
import { Save, Check, Sunrise, Sun, Sunset } from 'lucide-react'
import { Card, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { MY_AVAILABILITY, WEEK_DAYS, SLOTS, SLOT_TIME } from '../../data/doctorPagesData.js'

const SLOT_ICON = { Morning: Sunrise, Afternoon: Sun, Evening: Sunset }

function Availability() {
  const [avail, setAvail] = useState(MY_AVAILABILITY)
  const toggle = (day, slot) =>
    setAvail((a) => {
      const list = a[day]
      const next = list.includes(slot) ? list.filter((s) => s !== slot) : [...list, slot]
      return { ...a, [day]: next }
    })
  const total = WEEK_DAYS.reduce((n, d) => n + avail[d].length, 0)

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="My Availability" subtitle={`Set your weekly working slots — ${total} slots active.`}>
        <ToolButton icon={Save} tone="primary">Save Changes</ToolButton>
      </PageHeading>

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="rounded-2xl border border-slate-100 p-4">
              <h3 className="mb-3 text-[15px] font-bold text-brand-navy">{day}</h3>
              <div className="space-y-2">
                {SLOTS.map((slot) => {
                  const on = avail[day].includes(slot)
                  const Icon = SLOT_ICON[slot]
                  return (
                    <button key={slot} onClick={() => toggle(day, slot)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${on ? 'border-brand-blue bg-brand-blueLight/50' : 'border-slate-200 hover:border-slate-300'}`}>
                      <Icon className={`h-5 w-5 ${on ? 'text-brand-blue' : 'text-slate-400'}`} />
                      <div className="flex-1">
                        <p className={`text-[13.5px] font-semibold ${on ? 'text-brand-navy' : 'text-slate-500'}`}>{slot}</p>
                        <p className="text-[11px] text-slate-400">{SLOT_TIME[slot]}</p>
                      </div>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-md ${on ? 'bg-brand-blue text-white' : 'border border-slate-300'}`}>
                        {on && <Check className="h-3.5 w-3.5" />}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default Availability
