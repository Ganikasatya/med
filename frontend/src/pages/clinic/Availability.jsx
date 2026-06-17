import { useEffect, useState } from 'react'
import { Clock, RefreshCw } from 'lucide-react'
import { Card, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { doctorsApi } from '../../api'
import { prettyTime } from '../../lib/format.js'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function Availability() {
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [loadingSched, setLoadingSched] = useState(false)
  const [err, setErr] = useState(null)

  // Load the clinic's doctors once.
  useEffect(() => {
    let active = true
    ;(async () => {
      setLoadingDocs(true)
      setErr(null)
      try {
        const docs = await doctorsApi.list()
        if (!active) return
        setDoctors(docs)
        if (docs.length) setDoctorId(docs[0].doctor_id)
      } catch (e) {
        if (active) setErr(e.message)
      } finally {
        if (active) setLoadingDocs(false)
      }
    })()
    return () => { active = false }
  }, [])

  // Load the selected doctor's real schedule whenever the selection changes.
  const loadSchedule = async (id) => {
    if (!id) return
    setLoadingSched(true)
    setErr(null)
    try {
      setSchedules((await doctorsApi.schedule(id)) || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoadingSched(false)
    }
  }
  useEffect(() => { loadSchedule(doctorId) }, [doctorId])

  const selectedDoctor = doctors.find((d) => d.doctor_id === doctorId)
  const byDay = (day) => schedules.filter((s) => s.day_of_week === day)
  const total = schedules.length

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <PageHeading title="Doctor Availability" subtitle="Weekly consulting sessions each doctor has set in their own dashboard.">
        <ToolButton icon={RefreshCw} onClick={() => loadSchedule(doctorId)}>Refresh</ToolButton>
      </PageHeading>

      {err && <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>}

      {loadingDocs ? (
        <p className="py-10 text-center text-sm text-slate-400">Loading doctors…</p>
      ) : doctors.length === 0 ? (
        <Card className="py-10 text-center text-sm text-slate-400">
          No doctors yet. Add doctors first, then they can set their availability.
        </Card>
      ) : (
        <>
          {/* Doctor selector */}
          <div className="flex flex-wrap gap-2">
            {doctors.map((d) => (
              <button
                key={d.doctor_id}
                onClick={() => setDoctorId(d.doctor_id)}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${
                  doctorId === d.doctor_id ? 'border-brand-blue bg-brand-blueLight text-brand-blue' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <Avatar name={d.name || 'Doctor'} className="h-7 w-7 text-[10px]" />
                {d.name}
              </button>
            ))}
          </div>

          <Card className="flex min-h-0 flex-1 flex-col">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-[15px] font-bold text-brand-navy">Weekly Schedule — {selectedDoctor?.name || '—'}</h3>
              <span className="rounded-full bg-brand-greenLight px-2.5 py-0.5 text-[11px] font-semibold text-brand-green">{total} sessions / week</span>
            </div>

            {loadingSched ? (
              <p className="py-10 text-center text-sm text-slate-400">Loading schedule…</p>
            ) : total === 0 ? (
              <Card className="border-dashed py-10 text-center text-sm text-slate-400">
                This doctor hasn't set any availability yet. They can add sessions from their own dashboard under <span className="font-semibold text-brand-blue">Availability</span>.
              </Card>
            ) : (
              <div className="min-h-0 flex-1 overflow-auto">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {WEEK_DAYS.map((day) => (
                    <div key={day} className="rounded-2xl border border-slate-100 p-4">
                      <h4 className="mb-3 text-[15px] font-bold text-brand-navy">{day}</h4>
                      <div className="space-y-2">
                        {byDay(day).map((s) => (
                          <div key={s.schedule_id} className="flex items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-blueLight/40 px-3 py-2">
                            <Clock className="h-4 w-4 text-brand-blue" />
                            <div className="flex-1 leading-tight">
                              <p className="text-[13px] font-semibold text-brand-navy">{prettyTime(s.start_time)} – {prettyTime(s.end_time)}</p>
                              <p className="text-[11px] text-slate-400">Max {s.max_tokens} · {s.consultation_mins} min/consult</p>
                            </div>
                          </div>
                        ))}
                        {byDay(day).length === 0 && <p className="text-[12px] text-slate-400">No sessions.</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  )
}

export default Availability
