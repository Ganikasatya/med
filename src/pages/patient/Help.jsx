import { useState } from 'react'
import { ChevronDown, Phone, Mail, MessageCircle, LifeBuoy } from 'lucide-react'
import { Card, PageHeading } from '../../components/clinic/ui.jsx'
import { FAQS } from '../../data/patientDashboardData.js'

const CONTACTS = [
  { icon: Phone, label: 'Call us', value: '1800-123-4567', tone: 'bg-blue-100 text-brand-blue' },
  { icon: MessageCircle, label: 'WhatsApp', value: '+91 98765 00000', tone: 'bg-green-100 text-green-600' },
  { icon: Mail, label: 'Email', value: 'support@bookmydoctor.in', tone: 'bg-purple-100 text-purple-600' },
]

/** Help & Support — FAQs + contact options. */
function Help() {
  const [open, setOpen] = useState(0)

  return (
    <div className="flex flex-col gap-5">
      <PageHeading title="Help & Support" subtitle="Find answers or reach our support team." />

      {/* Contact options */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CONTACTS.map((c) => (
          <Card key={c.label} className="flex items-center gap-3 p-4">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <p className="text-[12px] font-semibold text-slate-400">{c.label}</p>
              <p className="text-[14px] font-bold text-brand-navy">{c.value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* FAQs */}
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-[16px] font-bold text-brand-navy">
          <LifeBuoy className="h-4 w-4 text-brand-blue" /> Frequently Asked Questions
        </h3>
        <ul className="divide-y divide-slate-100">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <li key={i}>
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-3 py-3.5 text-left"
                >
                  <span className="text-[14px] font-semibold text-brand-navy">{f.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                {isOpen && <p className="pb-4 pr-7 text-[13px] leading-relaxed text-slate-500">{f.a}</p>}
              </li>
            )
          })}
        </ul>
      </Card>
    </div>
  )
}

export default Help
