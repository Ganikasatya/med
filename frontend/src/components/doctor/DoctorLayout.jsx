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
 */
function DoctorLayout() {
  return (
    <DoctorProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
        <DoctorSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <DoctorTopbar />
          <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </DoctorProvider>
  )
}

export default DoctorLayout
