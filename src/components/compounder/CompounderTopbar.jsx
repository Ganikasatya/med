import { Bell, ChevronDown, MapPin, Menu } from 'lucide-react'
import { COMPOUNDER } from '../../data/compounderData.js'

function CompounderTopbar() {
  return (
    <header className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-3">
      <button className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-50"><Menu className="h-5 w-5" /></button>
      <div className="ml-auto flex items-center gap-5">
        <button className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-left lg:flex">
          <MapPin className="h-4 w-4 text-brand-blue" />
          <span className="leading-tight"><span className="block text-[12px] font-bold text-brand-navy">{COMPOUNDER.clinic}</span><span className="block text-[10px] text-slate-400">{COMPOUNDER.location}</span></span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
        <button className="relative text-slate-500"><Bell className="h-6 w-6" /><span className="absolute -right-2 -top-2 rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{COMPOUNDER.notifications}</span></button>
        <button className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green text-sm font-bold text-white">{COMPOUNDER.initials}</span>
          <span className="hidden text-left leading-tight sm:block"><span className="block text-[13px] font-bold text-brand-navy">{COMPOUNDER.name}</span><span className="block text-[11px] text-slate-400">{COMPOUNDER.role}</span></span>
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  )
}

export default CompounderTopbar
