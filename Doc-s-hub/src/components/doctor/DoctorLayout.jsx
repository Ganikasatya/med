import { Outlet } from 'react-router-dom'
import DoctorSidebar from './DoctorSidebar.jsx'
import DoctorTopbar from './DoctorTopbar.jsx'

/**
 * Shared shell for all doctor pages: fixed sidebar + topbar; page content
 * swaps via <Outlet/>.
 *
 * Fully fluid (no fixed canvas / scaling) so the console fills the entire
 * screen edge-to-edge on any display. The content area stretches to 100%
 * width and height; only it scrolls if a page is taller than the viewport.
 */
function DoctorLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <DoctorSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <DoctorTopbar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DoctorLayout
