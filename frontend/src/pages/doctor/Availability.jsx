import { useEffect, useState, useCallback } from 'react'
import { Plus, Trash2, Clock, MapPin } from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { Banner } from '../../components/common/FormControls.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { doctorsApi } from '../../api'
import { prettyTime } from '../../lib/format.js'

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// A practice the hospital doesn't manage is the doctor's own (personal/home).
// The clinic console never sees these — only the doctor does.
const isPersonal = (a) => a?.managed_by_hospital === false

/** Clinic (blue) vs Personal (purple) chip for a practice location. */
function PracticeTag({ aff, className = '' }) {
  const personal = isPersonal(aff)
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide ${
        personal ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-brand-blue'
      } ${className}`}
    >
      {personal ? 'Personal' : 'Clinic'}
    </span>
  )
}

/** Inline "add a session" row inside a weekday card. */
function AddSession({ onAdd }) {
  const [open, setOpen] = useState(false)
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('12:00')
  const [maxTokens, setMaxTokens] = useState(40)

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2 text-[12.5px] font-semibold text-brand-blue hover:bg-brand-blueLight/30">
        <Plus className="h-4 w-4" /> Add session
      </button>
    )
  }
  return (
    <div className="space-y-2 rounded-xl border border-slate-200 p-2.5">
      <div className="flex items-center gap-2 text-[12px]">
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-2 py-1" />
        <span className="text-slate-400">–</span>
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="flex-1 rounded-lg border border-slate-200 px-2 py-1" />
      </div>
      <div className="flex items-center gap-2 text-[12px]">
        <label className="text-slate-500">Max tokens</label>
        <input type="number" min="1" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} className="w-20 rounded-lg border border-slate-200 px-2 py-1" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => { onAdd({ start_time: start, end_time: end, max_tokens: Number(maxTokens) }); setOpen(false) }}
          className="flex-1 rounded-lg bg-brand-blue py-1.5 text-[12px] font-semibold text-white hover:bg-brand-blueDark">Add</button>
        <button onClick={() => setOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-[12px] font-semibold text-slate-600">Cancel</button>
      </div>
    </div>
  )
}

function Availability() {
  const { doctorId, loading: doctorLoading } = useDoctorCtx()
  const [affiliations, setAffiliations] = useState([])
  const [affiliationId, setAffiliationId] = useState('')
  const [schedules, setSchedules] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      const affs = ((await doctorsApi.affiliations({ doctor_id: doctorId })) || []).filter((a) => a.is_active !== false)
      const selectedId =
        affiliationId && affs.some((a) => String(a.affiliation_id) === String(affiliationId))
          ? affiliationId
          : affs[0] ? String(affs[0].affiliation_id) : ''
      setAffiliations(affs)
      if (!affiliationId && selectedId) setAffiliationId(selectedId)
      setSchedules((await doctorsApi.schedule(doctorId, selectedId)) || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [affiliationId, doctorId])

  useEffect(() => { load() }, [load])

  const add = async (day, partial) => {
    setError(null)
    if (!affiliationId) {
      setError('Create or select a practice location before adding sessions.')
      return
    }
    try {
      await doctorsApi.addSchedule({ doctor_id: doctorId, affiliation_id: Number(affiliationId), day_of_week: day, consultation_mins: 10, ...partial })
      load()
    } catch (e) {
      setError(e.message || 'Could not add session.')
    }
  }
  const remove = async (id) => {
    if (!window.confirm('Remove this session?')) return
    try {
      await doctorsApi.removeSchedule(id)
      load()
    } catch (e) {
      setError(e.message || 'Could not remove session.')
    }
  }

  const byDay = (day) => schedules.filter((s) => s.day_of_week === day)
  const total = schedules.length
  const selectedPractice = affiliations.find((a) => String(a.affiliation_id) === String(affiliationId))

  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="My Availability" subtitle={loading ? 'Loading…' : `Your weekly consulting sessions — ${total} active.`} />
      {error && <Banner type="error">{error}</Banner>}
      {!doctorLoading && !doctorId && (
        <Banner type="error">Your doctor profile is not linked to this login yet. Please ask clinic admin to link this user to the doctor.</Banner>
      )}

      <Card>
        <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-bold text-brand-navy">Select practice location</h3>
              <p className="text-[12px] font-medium text-slate-500">
                Add or edit practice locations from My Profile. This page is only for weekly timings.
              </p>
            </div>
            {!loading && affiliations.length === 0 && (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] font-semibold text-amber-700">
                No practice location found. Open My Profile to add one.
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {affiliations.map((a) => (
              <button
                key={a.affiliation_id}
                onClick={() => setAffiliationId(String(a.affiliation_id))}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] font-semibold ${
                  String(affiliationId) === String(a.affiliation_id)
                    ? 'border-brand-blue bg-brand-blueLight text-brand-blue'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                }`}
              >
                <MapPin className="h-4 w-4" /> {a.name}
                <PracticeTag aff={a} />
              </button>
            ))}
          </div>
          {selectedPractice && (
            <p className="flex flex-wrap items-center gap-1.5 text-[12px] font-medium text-slate-500">
              <PracticeTag aff={selectedPractice} />
              Sessions below apply only to {selectedPractice.name}
              {isPersonal(selectedPractice)
                ? ' — your personal practice, not visible to the clinic.'
                : ' — managed by the clinic.'}
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="rounded-2xl border border-slate-100 p-4">
              <h3 className="mb-3 text-[15px] font-bold text-brand-navy">{day}</h3>
              <div className="space-y-2">
                {byDay(day).map((s) => (
                  <div key={s.schedule_id} className="flex items-center gap-3 rounded-xl border border-brand-blue/30 bg-brand-blueLight/40 px-3 py-2">
                    <Clock className="h-4 w-4 text-brand-blue" />
                    <div className="flex-1 leading-tight">
                      <p className="text-[13px] font-semibold text-brand-navy">{prettyTime(s.start_time)} – {prettyTime(s.end_time)}</p>
                      <p className="text-[11px] text-slate-400">Max {s.max_tokens} · {s.consultation_mins} min/consult</p>
                    </div>
                    <button onClick={() => remove(s.schedule_id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                  </div>
                ))}
                {byDay(day).length === 0 && <p className="text-[12px] text-slate-400">No sessions.</p>}
                <AddSession onAdd={(partial) => add(day, partial)} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

export default Availability
