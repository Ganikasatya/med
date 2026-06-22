import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import AssistantSidebar from './AssistantSidebar.jsx'
import AssistantTopbar from './AssistantTopbar.jsx'

/**
 * Shared shell for the Assistant console: sidebar + topbar + routed content.
 *
 * On desktop (lg+) the sidebar is a static rail; on smaller screens it slides
 * in as an overlay drawer toggled from the topbar menu button.
 */
function AssistantLayout() {
  const [navOpen, setNavOpen] = useState(false)
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <AssistantSidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <AssistantTopbar onMenu={() => setNavOpen(true)} />
        <main className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AssistantLayout
