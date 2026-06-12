import { UserPlus } from 'lucide-react'
import { Card, StatusBadge, PageHeading, ToolButton, Avatar } from '../../components/clinic/ui.jsx'
import { STAFF } from '../../data/doctorPagesData.js'

function Staff() {
  return (
    <div className="flex flex-col gap-4">
      <PageHeading title="Staff Users" subtitle="People with access to this clinic console.">
        <ToolButton icon={UserPlus} tone="primary">Invite User</ToolButton>
      </PageHeading>

      <Card>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[12px] font-semibold text-slate-400">
              <th className="pb-3 pr-4">Name</th><th className="pb-3 pr-4">Role</th><th className="pb-3 pr-4">Email</th><th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px]">
            {STAFF.map((s) => (
              <tr key={s.email} className="border-t border-slate-50">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={s.name} className="h-9 w-9 text-xs" />
                    <span className="font-medium text-brand-navy">{s.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-500">{s.role}</td>
                <td className="py-3 pr-4 text-slate-500">{s.email}</td>
                <td className="py-3"><StatusBadge status={s.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export default Staff
