import { useEffect, useState, useCallback } from 'react'
import { CalendarOff, Plus, Trash2, X } from 'lucide-react'
import { Card, StatusBadge, ToolButton } from '../../components/clinic/ui.jsx'
import { TextInput, Banner } from '../../components/common/FormControls.jsx'
import { useDoctorCtx } from '../../context/DoctorContext.jsx'
import { doctorsApi } from '../../api'
import { prettyDate, todayISO } from '../../lib/format.js'

function AddHolidayModal({ onClose, onSave }) {
  const [date, setDate] = useState(todayISO())
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const save = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({ holiday_date: date, reason, is_full_day: true })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not add holiday.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={save} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[17px] font-bold text-brand-navy">Add Holiday / Leave</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        {error && <div className="mb-4"><Banner type="error">{error}</Banner></div>}
        <div className="space-y-3">
          <TextInput label="Date" type="date" min={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} required />
          <TextInput label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Personal leave, Public holiday" />
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <ToolButton type="button" onClick={onClose}>Cancel</ToolButton>
          <ToolButton type="submit" tone="primary" disabled={saving}>{saving ? 'Saving…' : 'Add'}</ToolButton>
        </div>
      </form>
    </div>
  )
}

export function HolidaysPanel() {
  const { doctorId } = useDoctorCtx()
  const [holidays, setHolidays] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    if (!doctorId) return
    setLoading(true)
    try {
      setHolidays((await doctorsApi.holidays(doctorId)) || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [doctorId])

  useEffect(() => { load() }, [load])

  const add = async (body) => {
    await doctorsApi.addHoliday({ doctor_id: doctorId, ...body })
    load()
  }
  const remove = async (id) => {
    if (!window.confirm('Remove this holiday?')) return
    try {
      await doctorsApi.removeHoliday(id)
      load()
    } catch (e) {
      setError(e.message || 'Could not remove holiday.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-[15px] font-bold text-brand-navy">Holidays &amp; Leave</h3>
          <p className="text-[12px] font-medium text-slate-500">Mark days you&apos;re unavailable.</p>
        </div>
        <ToolButton icon={Plus} tone="primary" onClick={() => setAdding(true)}>Add Holiday</ToolButton>
      </div>

      {error && <Banner type="error">{error}</Banner>}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : holidays.length === 0 ? (
        <Card className="p-8 text-center"><p className="text-[14px] font-semibold text-brand-navy">No holidays scheduled.</p></Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {holidays.map((h) => (
            <Card key={h.holiday_id} className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-500"><CalendarOff className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-bold text-brand-navy">{h.reason || 'Holiday'}</p>
                <p className="text-[12.5px] text-slate-500">{prettyDate(h.holiday_date)}</p>
                <div className="mt-2"><StatusBadge status={h.is_full_day ? 'Unavailable' : 'Partial'} /></div>
              </div>
              <button onClick={() => remove(h.holiday_id)} className="text-slate-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
            </Card>
          ))}
        </div>
      )}

      {adding && <AddHolidayModal onClose={() => setAdding(false)} onSave={add} />}
    </div>
  )
}

/** Standalone page wrapper (route kept for direct access, no longer in sidebar). */
function Holidays() {
  return (
    <div className="flex flex-col gap-4">
      <HolidaysPanel />
    </div>
  )
}

export default Holidays
