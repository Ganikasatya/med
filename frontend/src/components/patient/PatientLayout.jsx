import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import PatientSidebar from './PatientSidebar.jsx'
import PatientTopbar from './PatientTopbar.jsx'
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
  return (
    <PatientProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
        <PatientSidebar open={navOpen} onClose={() => setNavOpen(false)} />
        {navOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <PatientTopbar onMenu={() => setNavOpen(true)} />
          <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </PatientProvider>
  )
}

export default PatientLayout
