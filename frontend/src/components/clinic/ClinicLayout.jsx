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
 */
function ClinicLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <ClinicSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ClinicTopbar />
        <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default ClinicLayout
