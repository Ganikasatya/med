import { Outlet } from 'react-router-dom'
import PatientSidebar from './PatientSidebar.jsx'
import PatientTopbar from './PatientTopbar.jsx'

/**
 * Shared shell for all patient pages: fixed sidebar + topbar; page content
 * swaps via <Outlet/>. Same fluid, edge-to-edge layout as the doctor console.
 */
function PatientLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <PatientSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <PatientTopbar />
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default PatientLayout
