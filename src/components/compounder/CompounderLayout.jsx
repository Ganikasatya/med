import { Outlet } from 'react-router-dom'
import CompounderSidebar from './CompounderSidebar.jsx'
import CompounderTopbar from './CompounderTopbar.jsx'

function CompounderLayout() {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      <CompounderSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <CompounderTopbar />
        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default CompounderLayout
