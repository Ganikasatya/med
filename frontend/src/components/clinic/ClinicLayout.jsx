import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import ClinicSidebar from './ClinicSidebar.jsx'
import ClinicTopbar from './ClinicTopbar.jsx'

/**
 * Shared shell for all clinic pages: fixed sidebar + topbar, page content
 * swaps via <Outlet/>.
 *
 * Fully fluid (no fixed canvas / scaling) so the console fills the entire
 * screen edge-to-edge on any display — same approach as the doctor console.
 * The content area stretches to fill the space; only it scrolls if a page is
 * taller than the viewport.
 *
 * On desktop (lg+) the sidebar is a static rail; on smaller screens it slides
 * in as an overlay drawer toggled from the topbar menu button.
 */
function ClinicLayout() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <ClinicSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <ClinicTopbar onMenu={() => setNavOpen(true)} />
        <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ClinicLayout
