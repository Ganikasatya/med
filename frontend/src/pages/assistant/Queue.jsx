import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Radio, SkipForward, Megaphone, XCircle, CheckCircle2, PlayCircle, RefreshCw, Hash, Users, CheckCheck, Clock } from 'lucide-react'
import { Card, PageHeading, ToolButton, StatCard, Avatar } from '../../components/clinic/ui.jsx'
import AnimatedNumber from '../../components/common/AnimatedNumber.jsx'
import { doctorsApi, tokensApi } from '../../api'

const PRIORITY_PILL = {
  urgent: 'bg-amber-100 text-amber-700',
  emergency: 'bg-red-100 text-red-600',
}

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 320, damping: 26 } } }

export default function AssistantQueue() {
  const [params, setParams] = useSearchParams()
  const [doctors, setDoctors] = useState([])
  const [doctorId, setDoctorId] = useState(params.get('doctor') || '')
  const [queue, setQueue] = useState(null)
  const [stats, setStats] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  useEffect(() => {
    doctorsApi.list().then((d) => {
      setDoctors(d)
      if (!doctorId && d.length) setDoctorId(String(d[0].doctor_id))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadQueue = async (id = doctorId) => {
    if (!id) return
    setErr(null)
    try {
      const [q, s] = await Promise.all([tokensApi.queue(id), tokensApi.stats(id)])
      setQueue(q)
      setStats(s)
    } catch (e) {
      setErr(e.message)
    }
  }
  useEffect(() => {
    if (doctorId) {
      setParams({ doctor: doctorId })
      loadQueue(doctorId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorId])

  const act = async (fn) => {
    setBusy(true)
    setErr(null)
    try {
      await fn()
      await loadQueue()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  const current = queue?.current
  const waiting = queue?.waiting || []
  const doctor = doctors.find((d) => String(d.doctor_id) === String(doctorId))

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Live Queue" subtitle="Call, serve and clear tokens in real time.">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3">
          <Avatar name={doctor?.name || 'Dr'} className="h-6 w-6 text-[9px]" />
          <select
            value={doctorId}
            onChange={(e) => setDoctorId(e.target.value)}
            className="bg-transparent py-2 text-sm font-semibold text-brand-navy outline-none"
          >
            {doctors.map((d) => (
              <option key={d.doctor_id} value={d.doctor_id}>{d.name}</option>
            ))}
          </select>
        </div>
        <ToolButton icon={RefreshCw} onClick={() => loadQueue()}>Refresh</ToolButton>
      </PageHeading>

      <AnimatePresence>
        {err && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-red-100 bg-red-50 text-sm text-red-600">{err}</Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI stats — staggered count-up */}
      <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <motion.div variants={item} whileHover={{ y: -4 }}>
          <StatCard value={<AnimatedNumber value={stats?.total ?? 0} />} label="Total Today" icon={Hash} tone="blue" />
        </motion.div>
        <motion.div variants={item} whileHover={{ y: -4 }}>
          <StatCard value={current ? 1 : 0} label="In Consultation" icon={Radio} tone="green" />
        </motion.div>
        <motion.div variants={item} whileHover={{ y: -4 }}>
          <StatCard value={<AnimatedNumber value={stats?.waiting ?? waiting.length} />} label="Waiting" icon={Users} tone="orange" />
        </motion.div>
        <motion.div variants={item} whileHover={{ y: -4 }}>
          <StatCard value={<AnimatedNumber value={stats?.served ?? 0} />} label="Completed" icon={CheckCheck} tone="teal" />
        </motion.div>
      </motion.div>

      {/* Now serving — hero */}
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-blue to-brand-blueDark shadow-card"
      >
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
          <AnimatePresence mode="wait">
            {current ? (
              <motion.div
                key={current.token_id}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -28 }}
                transition={{ type: 'spring', stiffness: 300, damping: 26 }}
                className="flex items-center gap-5"
              >
                <div className="relative flex flex-col items-center justify-center rounded-2xl bg-white/15 px-5 py-3 backdrop-blur">
                  <span className="absolute right-2.5 top-2.5 flex h-2 w-2">
                    <motion.span
                      className="absolute inline-flex h-full w-full rounded-full bg-green-300"
                      animate={{ scale: [1, 2.4, 1], opacity: [0.8, 0, 0.8] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                    />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
                  </span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">Now Serving</span>
                  <span className="text-[40px] font-extrabold leading-none text-white">{current.display_code}</span>
                </div>
                <div className="flex items-center gap-2.5 text-white">
                  <Avatar name={current.patient_name || 'Patient'} tone="bg-white/20" className="h-11 w-11 text-base" />
                  <div className="leading-tight">
                    <p className="text-[18px] font-bold">{current.patient_name || 'Patient'}</p>
                    <p className="text-[13px] text-white/70">
                      {[current.patient_age && `${current.patient_age}y`, current.patient_gender].filter(Boolean).join(' · ') || 'In consultation'}
                    </p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-white"
              >
                <Radio className="h-9 w-9 text-white/50" />
                <div>
                  <p className="text-[17px] font-bold">No patient in consultation</p>
                  <p className="text-[13px] text-white/70">{waiting.length ? 'Click Call Next to start the queue.' : 'No one is waiting yet.'}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2.5">
            {current && (
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => act(() => tokensApi.recall(current.token_id))}
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur hover:bg-white/25 disabled:opacity-50"
              >
                <Megaphone className="h-4 w-4" /> Recall
              </motion.button>
            )}
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => act(() => (current ? tokensApi.complete(current.token_id) : tokensApi.next(doctorId)))}
              disabled={busy || (!current && waiting.length === 0)}
              className="flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-brand-blue shadow-sm hover:bg-blue-50 disabled:opacity-50"
            >
              {current ? <><CheckCircle2 className="h-4 w-4" /> Complete</> : <><PlayCircle className="h-4 w-4" /> Call Next</>}
            </motion.button>
          </div>
        </div>
        {current && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => act(() => tokensApi.next(doctorId))}
            disabled={busy || waiting.length === 0}
            className="flex w-full items-center justify-center gap-2 border-t border-white/15 bg-white/5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40"
          >
            <PlayCircle className="h-4 w-4" /> Complete &amp; Call Next ({waiting.length} waiting)
          </motion.button>
        )}
      </motion.div>

      {/* Up next */}
      <Card className="!p-0">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
          <h3 className="text-[15px] font-bold text-brand-navy">Up Next</h3>
          <motion.span
            key={waiting.length}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="rounded-full bg-orange-50 px-2.5 py-0.5 text-[11px] font-semibold text-orange-600"
          >
            {waiting.length} waiting
          </motion.span>
        </div>
        {waiting.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
            <Clock className="h-8 w-8 text-slate-300" />
            <p className="text-sm">The waiting queue is empty.</p>
          </motion.div>
        ) : (
          <ul className="divide-y divide-slate-50">
            <AnimatePresence initial={false}>
              {waiting.map((t) => (
                <motion.li
                  key={t.token_id}
                  layout
                  initial={{ opacity: 0, x: -24, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 28, height: 0 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-slate-50/70"
                >
                  <div className="flex min-w-0 items-center gap-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-blueLight text-[13px] font-extrabold text-brand-blue">
                      {t.queue_position}
                    </span>
                    <Avatar name={t.patient_name || 'Patient'} className="h-9 w-9 text-[11px]" />
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-[14px] font-bold text-brand-navy">{t.patient_name || 'Patient'}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="text-[12px] font-semibold text-slate-500">{t.display_code}</span>
                        {t.priority !== 'normal' && (
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${PRIORITY_PILL[t.priority] || 'bg-slate-100 text-slate-500'}`}>{t.priority}</span>
                        )}
                        {t.is_walkin && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">walk-in</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {[
                      { icon: Megaphone, title: 'Recall', fn: () => tokensApi.recall(t.token_id), cls: 'border-slate-200 text-slate-500 hover:bg-slate-50' },
                      { icon: SkipForward, title: 'Skip', fn: () => tokensApi.skip(t.token_id), cls: 'border-slate-200 text-slate-500 hover:bg-slate-50' },
                      { icon: XCircle, title: 'No-show', fn: () => tokensApi.missed(t.token_id), cls: 'border-red-200 text-red-500 hover:bg-red-50' },
                    ].map(({ icon: Icon, title, fn, cls }) => (
                      <motion.button
                        key={title}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => act(fn)}
                        disabled={busy}
                        title={title}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-50 ${cls}`}
                      >
                        <Icon className="h-4 w-4" />
                      </motion.button>
                    ))}
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </Card>
    </div>
  )
}
