import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import DoctorSidebar from './DoctorSidebar.jsx'
import DoctorTopbar from './DoctorTopbar.jsx'
import { DoctorProvider } from '../../context/DoctorContext.jsx'

/**
 * Shared shell for all doctor pages: fixed sidebar + topbar; page content
 * swaps via <Outlet/>.
 *
 * <DoctorProvider/> loads the logged-in doctor + tenant lookups once so every
 * nested page can read real data without refetching.
 *
 * On desktop (lg+) the sidebar is a static rail; on smaller screens it slides
 * in as an overlay drawer toggled from the topbar menu button.
 */
function DoctorLayout() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <DoctorProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
        <DoctorSidebar open={navOpen} onClose={() => setNavOpen(false)} />
        {navOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            onClick={() => setNavOpen(false)}
            aria-hidden="true"
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <DoctorTopbar onMenu={() => setNavOpen(true)} />
          <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </DoctorProvider>
  )
}

export default DoctorLayout
