import { Link } from 'react-router-dom'
import { LayoutDashboard } from 'lucide-react'
import PageHeader from '../components/common/PageHeader.jsx'
import { useAuth } from '../context/AuthContext.jsx'

/**
 * Temporary placeholder dashboard. The full patient / doctor / clinic
 * dashboards are planned as the next step — this just keeps the post-login
 * routes working and on-theme.
 */
function DashboardStub({ title, subtitle, cards = [] }) {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blueLight via-white to-blue-50">
      <PageHeader />
      <main className="mx-auto max-w-[1100px] px-6 py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue text-white">
            <LayoutDashboard className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-extrabold text-brand-navy">{title}</h1>
            <p className="text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>

        {user?.email && (
          <p className="mt-3 text-[13px] text-slate-400">Signed in as {user.email}</p>
        )}

        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ icon: Icon, label }) => (
            <div key={label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blueLight text-brand-blue">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-[15px] font-bold text-brand-navy">{label}</h3>
              <p className="mt-1 text-xs text-slate-400">Coming soon</p>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-center text-sm text-slate-500">
          🚧 This dashboard is a placeholder — we’ll design it in the next step.
          <div className="mt-3">
            <Link to="/" className="font-semibold text-brand-blue hover:underline">← Back to Home</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardStub
