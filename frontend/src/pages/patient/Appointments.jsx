import { useEffect, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import { Clock, MapPin, IndianRupee, X, CalendarClock, Navigation, Timer, Footprints } from 'lucide-react'
import { Card, StatusBadge, Avatar, PageHeading, ToolButton } from '../../components/clinic/ui.jsx'
import { SelectInput, TextInput, Banner } from '../../components/common/FormControls.jsx'
import { usePatientCtx } from '../../context/PatientContext.jsx'
import { appointmentsApi, patientsApi, tokensApi } from '../../api'
import { dateChip, prettyTime, prettyDate, statusLabel, todayISO, clockIST } from '../../lib/format.js'
import { useI18n } from '../../i18n/index.jsx'

const ACTIVE_STATUSES = ['scheduled', 'booked', 'confirmed', 'pending', 'checked_in', 'in_progress']

/** Small reschedule modal: pick a new date, load that doctor's free slots, submit. */
function RescheduleModal({ appt, onClose, onDone }) {
  const { t } = useI18n()
  const [date, setDate] = useState(appt.appointment_date || todayISO())
  const [slots, setSlots] = useState([])
  const [slot, setSlot] = useState('')
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    setLoadingSlots(true)
    setSlot('')
    appointmentsApi
      .availableSlots(appt.doctor_id, date, appt.affiliation_id)
      .then((res) => {
        if (!active) return
        // Endpoint may return an array of times or an object with `slots`.
        const list = Array.isArray(res) ? res : res?.slots || []
        setSlots(list)
      })
      .catch(() => active && setSlots([]))
      .finally(() => active && setLoadingSlots(false))
    return () => {
      active = false
    }
  }, [appt.doctor_id, date])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await appointmentsApi.reschedule({
        appointment_id: appt.appointment_id,
        new_date: date,
        new_time: slot || null,
        reason: 'Patient requested',
      })
      onDone()
      onClose()
    } catch (err) {
      setError(err.message || t('ppage.couldNotReschedule'))
    } finally {
      setSaving(false)
    }
  }

  const slotValue = (s) => (typeof s === 'string' ? s : s.time || s.slot_time || s.value)
  const slotLabel = (s) => (typeof s === 'string' ? prettyTime(s) : s.label || prettyTime(slotValue(s)))

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-brand-navy">{t('ppage.rescheduleAppt')}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="mb-4"><Banner type="error">{error}</Banner></div>}
        <div className="space-y-3">
          <TextInput label={t('ppage.newDate')} type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} />
          <SelectInput label={t('ppage.availableSlot')} value={slot} onChange={(e) => setSlot(e.target.value)} disabled={loadingSlots}>
            <option value="">{loadingSlots ? t('ppage.loadingSlots') : slots.length ? t('ppage.selectSlot') : t('ppage.noSlots')}</option>
            {slots.map((s, i) => (
              <option key={i} value={slotValue(s)}>{slotLabel(s)}</option>
            ))}
          </SelectInput>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <ToolButton type="button" onClick={onClose}>{t('pcommon.cancel')}</ToolButton>
          <ToolButton type="submit" tone="primary" disabled={saving}>{saving ? t('pcommon.saving') : t('pcommon.confirm')}</ToolButton>
        </div>
      </form>
    </div>
  )
}

function ApptRow({ appt, doctor, clinic, onCancel, onReschedule, canManage }) {
  const { t } = useI18n()
  const chip = dateChip(appt.appointment_date)
  const doctorName = doctor?.name || `Doctor #${appt.doctor_id}`
  return (
    <li className="flex flex-wrap items-center gap-4 py-4">
      <Avatar name={doctorName} className="h-12 w-12" />
      <div className="min-w-[160px] leading-tight">
        <p className="text-[15px] font-bold text-brand-navy">{doctorName}</p>
        <p className="text-[12.5px] text-slate-500">{doctor?.specialization || appt.appointment_type}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-brand-blueLight px-3 py-1.5 text-center">
          <p className="text-[18px] font-extrabold leading-none text-brand-blue">{chip.day}</p>
          <p className="text-[10px] text-slate-500">{chip.month}</p>
        </div>
        {appt.slot_time && (
          <span className="flex items-center gap-1 text-[13px] font-semibold text-slate-600">
            <Clock className="h-4 w-4 text-slate-400" />{prettyTime(appt.slot_time)}
          </span>
        )}
      </div>
      <div className="min-w-[170px] leading-tight">
        <p className="text-[13.5px] font-semibold text-brand-navy">{clinic?.name || '—'}</p>
        {clinic && (
          <p className="flex items-center gap-1 text-[12px] text-slate-400">
            <MapPin className="h-3.5 w-3.5" />{[clinic.city, clinic.state].filter(Boolean).join(', ')}
          </p>
        )}
      </div>
      <div className="ml-auto flex flex-col items-end gap-1.5 text-right leading-tight">
        <span className="flex items-center gap-1 text-[13px] font-semibold text-slate-500">
          <IndianRupee className="h-3.5 w-3.5" />{Number(appt.consultation_fee)}
        </span>
        <StatusBadge status={statusLabel(appt.status)} />
        {canManage && (
          <div className="mt-1 flex gap-2">
            <button onClick={() => onReschedule(appt)} className="flex items-center gap-1 text-[12px] font-semibold text-brand-blue hover:underline">
              <CalendarClock className="h-3.5 w-3.5" />{t('ppage.reschedule')}
            </button>
            <button onClick={() => onCancel(appt)} className="text-[12px] font-semibold text-red-500 hover:underline">{t('ppage.cancel')}</button>
          </div>
        )}
      </div>
    </li>
  )
}

/**
 * Live "time to leave" card for a today's appointment. Polls the token estimate
 * and works backwards from the call ETA to a leave-by time, flipping to a
 * "Leave now" alert once that moment arrives.
 */
function TravelPlanCard({ appt, doctor, clinic }) {
  const { t } = useI18n()
  const [est, setEst] = useState(null)
  const [phase, setPhase] = useState('loading') // loading | pending | ready

  useEffect(() => {
    let active = true
    let timer
    const poll = async () => {
      try {
        const res = await tokensApi.estimate({ appointment_id: appt.appointment_id })
        if (!active) return
        setEst(res)
        setPhase('ready')
      } catch {
        // 404 = clinic hasn't issued the token yet; keep waiting quietly.
        if (active) setPhase((p) => (p === 'ready' ? 'ready' : 'pending'))
      } finally {
        if (active) timer = setTimeout(poll, 30000)
      }
    }
    poll()
    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [appt.appointment_id])

  const doctorName = doctor?.name || `Doctor #${appt.doctor_id}`
  const leaveNow = phase === 'ready' && est?.should_leave_now
  const hasLeaveBy = phase === 'ready' && est?.leave_by

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        leaveNow ? 'border-amber-300 bg-amber-50' : 'border-brand-blue/15 bg-brand-blueLight/40'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${leaveNow ? 'bg-amber-500' : 'bg-brand-blue'}`}>
            {leaveNow ? <Footprints className="h-5 w-5" /> : <Timer className="h-5 w-5" />}
          </span>
          <div className="leading-tight">
            <p className="text-[14px] font-bold text-brand-navy">{doctorName}</p>
            <p className="text-[12px] text-slate-500">{clinic?.name || t('ppage.clinic')}{appt.slot_time ? ` · ${t('ppage.slot', { time: prettyTime(appt.slot_time) })}` : ''}</p>
          </div>
        </div>
        {phase === 'ready' && est?.queue_position > 0 && (
          <span className="rounded-full bg-white px-3 py-1 text-[12px] font-bold text-brand-navy shadow-sm">
            {t('ppage.inQueue', { n: est.queue_position })}
          </span>
        )}
      </div>

      {phase === 'pending' && (
        <p className="mt-3 text-[12.5px] text-slate-500">
          {t('ppage.waitingForClinic')}
        </p>
      )}

      {phase === 'ready' && (
        <div className="mt-3">
          {leaveNow ? (
            <div className="flex items-center gap-2 text-[14px] font-extrabold text-amber-700">
              <Footprints className="h-5 w-5" /> {t('ppage.leaveNowTurn', { n: est.wait_min })}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 text-[13px]">
              <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{t('ppage.tokenExpected')}</p>
                <p className="flex items-center gap-1.5 text-[15px] font-extrabold text-brand-navy">
                  <Clock className="h-4 w-4 text-brand-blue" />{clockIST(est.estimated_time)}
                </p>
              </div>
              <div className="rounded-xl bg-white px-3 py-2 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {hasLeaveBy ? t('ppage.leaveBy') : t('ppage.waitTime')}
                </p>
                <p className="flex items-center gap-1.5 text-[15px] font-extrabold text-brand-navy">
                  <Navigation className="h-4 w-4 text-brand-green" />
                  {hasLeaveBy ? clockIST(est.leave_by) : `~${est.wait_min} min`}
                </p>
              </div>
            </div>
          )}
          {hasLeaveBy && !leaveNow && (
            <p className="mt-2 text-[12px] text-slate-500">
              {t('ppage.travelRemind', { n: est.travel_min, from: est.origin_label ? t('ppage.travelFrom', { place: est.origin_label }) : '' })}
            </p>
          )}
          {!est?.travel_min && (
            <p className="mt-2 text-[12px] text-slate-400">
              {t('ppage.addStartLocation')}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

/** Patient's appointments — upcoming + past, backed by the API. */
function Appointments() {
  const { t } = useI18n()
  const { state } = useLocation()
  const { patient, resolveDoctor, resolveHospital, resolveAffiliation } = usePatientCtx()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [rescheduling, setRescheduling] = useState(null)

  const load = useCallback(async () => {
    if (!patient) return
    setLoading(true)
    setError(null)
    try {
      const list = await patientsApi.appointments(patient.patient_id)
      // Newest first.
      list.sort((a, b) => (a.appointment_date < b.appointment_date ? 1 : -1))
      setAppts(list)
    } catch (e) {
      setError(e.message || t('ppage.couldNotLoadAppts'))
    } finally {
      setLoading(false)
    }
  }, [patient])

  useEffect(() => {
    load()
  }, [load])

  const cancel = async (appt) => {
    if (!window.confirm(t('ppage.confirmCancel'))) return
    try {
      await appointmentsApi.cancel({ appointment_id: appt.appointment_id, reason: 'Patient cancelled' })
      load()
    } catch (e) {
      alert(e.message || t('ppage.couldNotCancel'))
    }
  }

  const today = todayISO()
  const upcoming = appts.filter((a) => ACTIVE_STATUSES.includes(a.status) && a.appointment_date >= today)
  const past = appts.filter((a) => !ACTIVE_STATUSES.includes(a.status) || a.appointment_date < today)
  const todays = upcoming.filter((a) => a.appointment_date === today)

  // Show the practice location the patient actually booked (e.g. a personal
  // clinic or home practice), not just the parent hospital. Falls back to the
  // hospital for older bookings with no affiliation.
  const clinicFor = (appt) =>
    resolveAffiliation(appt.affiliation_id) ||
    resolveHospital(appt.hospital_id) ||
    resolveHospital(resolveDoctor(appt.doctor_id)?.hospital_id)

  const renderRow = (a, canManage) => (
    <ApptRow
      key={a.appointment_id}
      appt={a}
      doctor={resolveDoctor(a.doctor_id)}
      clinic={clinicFor(a)}
      onCancel={cancel}
      onReschedule={setRescheduling}
      canManage={canManage}
    />
  )

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title={t('ppage.apptsTitle')} subtitle={t('ppage.apptsSubtitle')} />

      {state?.booked && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[13.5px] font-semibold text-green-700">
          {state.appointment?.doctor ? t('ppage.apptBookedWithDoc', { doctor: state.appointment.doctor }) : t('ppage.apptBookedNoDoc')}
        </div>
      )}

      {error && <Banner type="error">{error}</Banner>}

      {todays.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-brand-navy">
            <Footprints className="h-4 w-4 text-brand-blue" /> {t('ppage.todayWhenToLeave')}
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {todays.map((a) => (
              <TravelPlanCard
                key={a.appointment_id}
                appt={a}
                doctor={resolveDoctor(a.doctor_id)}
                clinic={clinicFor(a)}
              />
            ))}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h3 className="mb-3 text-[16px] font-bold text-brand-navy">{t('ppage.upcoming')}</h3>
        {loading ? (
          <p className="text-sm text-slate-400">{t('pcommon.loading')}</p>
        ) : upcoming.length === 0 ? (
          <p className="py-4 text-[13.5px] text-slate-400">{t('pdash.noUpcomingAppts')}</p>
        ) : (
          <ul className="divide-y divide-slate-50">{upcoming.map((a) => renderRow(a, true))}</ul>
        )}
      </Card>

      {past.length > 0 && (
        <Card className="p-5">
          <h3 className="mb-3 text-[16px] font-bold text-brand-navy">{t('ppage.pastCancelled')}</h3>
          <ul className="divide-y divide-slate-50">{past.map((a) => renderRow(a, false))}</ul>
        </Card>
      )}

      {rescheduling && (
        <RescheduleModal appt={rescheduling} onClose={() => setRescheduling(null)} onDone={load} />
      )}
    </div>
  )
}

export default Appointments
