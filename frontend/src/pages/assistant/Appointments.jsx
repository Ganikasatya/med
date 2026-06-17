import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, Ticket, CalendarDays, Clock, CheckCircle2, Hourglass } from 'lucide-react'
import { Card, PageHeading, ToolButton, StatusBadge, Avatar, StatCard } from '../../components/clinic/ui.jsx'
import AnimatedNumber from '../../components/common/AnimatedNumber.jsx'
import { doctorsApi, appointmentsApi, tokensApi } from '../../api'

const STATUS_LABEL = {
  scheduled: 'Pending',
  confirmed: 'Confirmed',
  in_progress: 'In Consultation',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
}

export default function AssistantAppointments() {
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState('')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    doctorsApi.list().then((d) => {
      setDoctors(d)
      if (d.length) setDoctorId(String(d[0].doctor_id))
    })
  }, [])

  const load = async (id = doctorId) => {
    if (!id) return
    setLoading(true)
    setErr(null)
    try {
      setRows(await appointmentsApi.today(id))
    } catch (e) {
      setErr(e.message)
    }
    setLoading(false)
  }
  useEffect(() => {
    if (doctorId) load(doctorId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId])

  const genToken = async (appt) => {
    setBusy(appt.appointment_id)
    setErr(null)
    try {
      await tokensApi.generate(appt.appointment_id)
      await load()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(null)
  }

  const doc = doctors.find((d) => String(d.doctor_id) === String(doctorId))
  const total = rows.length
  const pending = rows.filter((a) => ['scheduled', 'confirmed'].includes(a.status)).length
  const done = rows.filter((a) => a.status === 'completed').length

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Today's Appointments" subtitle="Check in patients and generate their queue tokens.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          {doc && <Avatar name={doc.name} className="h-6 w-6 text-[9px]" />}
          <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="bg-transparent py-2 text-sm font-semibold text-brand-navy outline-none">
            {doctors.map((d) => (
              <option key={d.doctor_id} value={d.doctor_id}>{d.name}</option>
            ))}
          </select>
        </div>
        <ToolButton icon={RefreshCw} onClick={() => load()}>Refresh</ToolButton>
      </PageHeading>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }} className="grid grid-cols-3 gap-3">
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -4 }}>
          <StatCard value={<AnimatedNumber value={total} />} label="Today's Appointments" icon={CalendarDays} tone="blue" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -4 }}>
          <StatCard value={<AnimatedNumber value={pending} />} label="To Check In" icon={Hourglass} tone="orange" />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }} whileHover={{ y: -4 }}>
          <StatCard value={<AnimatedNumber value={done} />} label="Completed" icon={CheckCircle2} tone="green" />
        </motion.div>
      </motion.div>

      {err && <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>}

      <Card className="!p-0">
        <div className="border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[15px] font-bold text-brand-navy">Appointments — {doc?.name || '—'}</h3>
        </div>
        {loading ? (
          <p className="py-12 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-slate-400">No appointments today for this doctor.</p>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-5 py-2.5">Time</th>
                <th className="px-3 py-2.5">Patient</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-5 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-[13px]">
              <AnimatePresence initial={false}>
                {rows.map((a, i) => (
                  <motion.tr
                    key={a.appointment_id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70"
                  >
                    <td className="whitespace-nowrap px-5 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-slate-600"><Clock className="h-3.5 w-3.5 text-slate-300" /> {a.slot_time || '—'}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.patient_name || 'Patient'} className="h-8 w-8 text-[10px]" />
                        <div className="leading-tight">
                          <p className="font-bold text-brand-navy">{a.patient_name || 'Patient'}</p>
                          <p className="text-[11px] text-slate-400">#{a.appointment_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-slate-500">{a.appointment_type}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={STATUS_LABEL[a.status] || a.status} /></td>
                    <td className="px-5 py-2.5 text-right">
                      {a.status === 'scheduled' ? (
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => genToken(a)} disabled={busy === a.appointment_id}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-brand-blueDark disabled:opacity-60"
                        >
                          <Ticket className="h-3.5 w-3.5" /> {busy === a.appointment_id ? 'Issuing…' : 'Generate Token'}
                        </motion.button>
                      ) : ['confirmed', 'in_progress'].includes(a.status) ? (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-green-50 px-2.5 py-1.5 text-[12px] font-semibold text-green-600">
                          <Ticket className="h-3.5 w-3.5" /> Token issued
                        </span>
                      ) : (
                        <span className="text-[12px] text-slate-300">—</span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        )}
      </Card>
    </div>
  )
}
