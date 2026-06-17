import { Outlet } from 'react-router-dom'
import AssistantSidebar from './AssistantSidebar.jsx'
import AssistantTopbar from './AssistantTopbar.jsx'

/** Shared shell for the Assistant console: sidebar + topbar + routed content. */
function AssistantLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <AssistantSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AssistantTopbar />
        <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AssistantLayout
