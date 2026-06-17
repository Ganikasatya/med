import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, CheckCircle2, XCircle, LogOut, MapPin, Phone, Mail, RefreshCw } from 'lucide-react'
import Logo from '../../components/common/Logo.jsx'
import { hospitalsApi } from '../../api'
import { useAuth } from '../../context/AuthContext.jsx'

/** Super-Admin screen to review and approve/reject pending clinic registrations. */
export default function Approvals() {
  const { logout, user } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      setRows(await hospitalsApi.pending())
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    }
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const decide = async (h, approve) => {
    setBusy(h.hospital_id)
    setMsg(null)
    try {
      if (approve) await hospitalsApi.approve(h.hospital_id)
      else await hospitalsApi.reject(h.hospital_id, 'Details could not be verified')
      setMsg({ type: 'success', text: `${approve ? 'Approved' : 'Rejected'} ${h.name}` })
      await load()
    } catch (e) {
      setMsg({ type: 'error', text: e.message })
    }
    setBusy(null)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="rounded-full bg-brand-blueLight px-2.5 py-0.5 text-[11px] font-bold text-brand-blue">SUPER ADMIN</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-semibold text-brand-navy">{user?.name}</span>
          <button onClick={() => { logout(); navigate('/') }} className="flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-red-600">
            <LogOut className="h-4 w-4" /> Log out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-[900px] px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-brand-navy">Clinic Approvals</h1>
            <p className="mt-1 text-sm text-slate-500">Review and approve clinics that have registered.</p>
          </div>
          <button onClick={load} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-brand-navy hover:border-slate-300">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>

        {msg && (
          <div className={`mb-4 rounded-xl px-4 py-2.5 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {msg.text}
          </div>
        )}

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white p-10 text-center shadow-card">
            <CheckCircle2 className="mx-auto h-10 w-10 text-brand-green" />
            <p className="mt-3 text-sm font-semibold text-brand-navy">No pending registrations</p>
            <p className="text-[13px] text-slate-400">New clinic sign-ups will appear here for approval.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map((h) => (
              <div key={h.hospital_id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue">
                    <Building2 className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="text-[15px] font-bold text-brand-navy">{h.name}</p>
                    <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[12px] text-slate-500">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {h.city || '—'}</span>
                      <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {h.phone || '—'}</span>
                      <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" /> {h.email || '—'}</span>
                      <span className="font-semibold text-brand-blue">code: {h.short_code}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button disabled={busy === h.hospital_id} onClick={() => decide(h, false)} className="flex items-center gap-1.5 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 hover:bg-red-50 disabled:opacity-60">
                    <XCircle className="h-4 w-4" /> Reject
                  </button>
                  <button disabled={busy === h.hospital_id} onClick={() => decide(h, true)} className="flex items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60">
                    <CheckCircle2 className="h-4 w-4" /> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
