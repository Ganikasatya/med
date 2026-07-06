import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import PatientSidebar from './PatientSidebar.jsx'
import PatientTopbar from './PatientTopbar.jsx'
import DelayToaster from '../common/DelayToaster.jsx'
import { PatientProvider } from '../../context/PatientContext.jsx'

/**
 * Shared shell for all patient pages: fixed sidebar + topbar; page content
 * swaps via <Outlet/>. Same fluid, edge-to-edge layout as the doctor console.
 *
 * <PatientProvider/> loads the logged-in patient + doctor/clinic lookups once
 * so every nested page can read real data without refetching.
 *
 * On desktop (lg+) the sidebar is a static rail; on smaller screens it slides
 * in as an overlay drawer toggled from the topbar menu button.
 */
function PatientLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)   // desktop sidebar collapsed?
  const [dark, setDark] = useState(() => localStorage.getItem('patient-theme') === 'dark')

  useEffect(() => {
    localStorage.setItem('patient-theme', dark ? 'dark' : 'light')
  }, [dark])

  return (
    <PatientProvider>
      <div className={`theme-reception ${dark ? 'theme-dark' : ''} flex h-screen w-screen flex-col overflow-hidden bg-slate-50`}>
        {/* Full-width topbar across the top (holds the logo) */}
        <PatientTopbar
          onMenu={() => setNavOpen(true)}
          dark={dark}
          onToggleTheme={() => setDark((d) => !d)}
        />
        {/* Sidebar + routed content sit below the topbar */}
        <div className="relative flex min-h-0 flex-1">
          <PatientSidebar open={navOpen} collapsed={collapsed} onClose={() => setNavOpen(false)} />
          {navOpen && (
            <div
              className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
              onClick={() => setNavOpen(false)}
              aria-hidden="true"
            />
          )}
          {/* Open/close toggle — the animated button on the sidebar's right edge,
              vertically centered (desktop) */}
          <div
            className={`absolute top-1/2 z-40 hidden -translate-y-1/2 transition-all duration-300 lg:block ${
              collapsed ? 'left-1' : 'left-60 -translate-x-1/2'
            }`}
          >
            <button
              className={`sidebar-toggle ${collapsed ? 'is-collapsed' : ''}`}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setCollapsed((c) => !c)}
            >
              <span className="sidebar-toggle-box">
                <span className="sidebar-toggle-elem">
                  <svg viewBox="0 0 46 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M46 20.038c0-.7-.3-1.5-.8-2.1l-16-17c-1.1-1-3.2-1.4-4.4-.3-1.2 1.1-1.2 3.1 0 4.2l11.3 11.9H3c-1.7 0-3 1.3-3 3s1.3 3 3 3h33.1l-11.3 11.9c-1 1-1.2 3.1 0 4.2 1.2 1.1 3.3.7 4.4-.3l16-17c.5-.5.8-1.3.8-2.1z" />
                  </svg>
                </span>
                <span className="sidebar-toggle-elem">
                  <svg viewBox="0 0 46 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M46 20.038c0-.7-.3-1.5-.8-2.1l-16-17c-1.1-1-3.2-1.4-4.4-.3-1.2 1.1-1.2 3.1 0 4.2l11.3 11.9H3c-1.7 0-3 1.3-3 3s1.3 3 3 3h33.1l-11.3 11.9c-1 1-1.2 3.1 0 4.2 1.2 1.1 3.3.7 4.4-.3l16-17c.5-.5.8-1.3.8-2.1z" />
                  </svg>
                </span>
              </span>
            </button>
          </div>
          <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-3 sm:p-4">
            <Outlet />
          </main>
        </div>
        {/* Real-time "doctor running late" popup for the patient's own tokens */}
        <DelayToaster channel="sms" />
      </div>
    </PatientProvider>
  )
}

export default PatientLayout
