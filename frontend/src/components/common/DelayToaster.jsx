import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { notificationsApi } from '../../api'

/**
 * Real-time "doctor running late" popup.
 *
 * The app has no websockets, so this polls GET /notification-history for
 * type=delay notifications and pops a toast when a new one appears. The backend
 * records these on POST /doctor-delay:
 *   - one `push` alert to reception  ("Doctor Running Late · N tokens shifted")
 *   - one `sms`  alert per waiting patient ("…revised ETA: 4:30 PM")
 * so each console watches the channel meant for it (the endpoint already scopes
 * rows to the logged-in patient / the staff member's hospital).
 *
 * Dedupe is purely by notification_id, persisted in localStorage per channel —
 * we deliberately do NOT gate on created_at: the backend stores naive-UTC times
 * in a timestamptz column, so timestamps read hours in the past and any recency
 * window would wrongly suppress every alert.
 *
 * On the very first load in a browser we surface the single most-recent delay
 * (so an already-running delay is visible), then only ids newer than that pop.
 *
 * Props:
 *   channel — 'push' for reception, 'sms' for patients.
 *   pollMs  — poll interval (default 12s).
 */
function DelayToaster({ channel = 'sms', pollMs = 12000 }) {
  const [toasts, setToasts] = useState([])
  const storeKey = `delayToastSeen:${channel}`

  const dismiss = (id) => setToasts((list) => list.filter((t) => t.id !== id))

  useEffect(() => {
    let alive = true

    async function poll() {
      try {
        const rows = await notificationsApi.history({ type: 'delay', channel, size: 10 })
        if (!alive || !Array.isArray(rows) || rows.length === 0) return

        const maxId = rows.reduce((m, r) => Math.max(m, r.notification_id), 0)
        const raw = localStorage.getItem(storeKey)
        // First load in this browser: baseline just below the latest so exactly
        // the most-recent delay surfaces once. Afterwards: only genuinely newer.
        const seen = raw === null ? maxId - 1 : Number(raw)

        const fresh = rows
          .filter((r) => r.notification_id > seen)
          .sort((a, b) => a.notification_id - b.notification_id)

        if (maxId > seen) localStorage.setItem(storeKey, String(maxId))

        if (fresh.length) {
          setToasts((list) => [
            ...list,
            ...fresh.map((r) => ({
              id: r.notification_id,
              title: r.title || 'Doctor running late',
              message: r.message,
            })),
          ].slice(-4)) // keep at most 4 stacked
        }
      } catch {
        /* ignore transient poll errors */
      }
    }

    poll()
    const iv = setInterval(poll, pollMs)
    return () => { alive = false; clearInterval(iv) }
  }, [channel, pollMs, storeKey])

  // Auto-dismiss each toast ~10s after it appears.
  useEffect(() => {
    if (!toasts.length) return
    const timers = toasts.map((t) => setTimeout(() => dismiss(t.id), 10000))
    return () => timers.forEach(clearTimeout)
  }, [toasts])

  if (!toasts.length) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex flex-col items-center gap-3 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="delay-toast pointer-events-auto flex w-[min(94vw,40rem)] items-start gap-4 rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 shadow-[0_20px_50px_-10px_rgba(180,120,0,0.55)]"
        >
          <span className="mt-0.5 grid h-12 w-12 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
            <AlertTriangle className="h-7 w-7" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[17px] font-extrabold text-amber-900">{t.title}</p>
            <p className="mt-1 text-[14.5px] leading-snug text-amber-800">{t.message}</p>
          </div>
          <button
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="shrink-0 rounded-lg p-1.5 text-amber-500 transition-colors hover:bg-amber-100 hover:text-amber-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ))}
    </div>
  )
}

export default DelayToaster
