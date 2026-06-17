import { useState } from 'react'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'

/** Shared field shell — label, bordered control wrapper, error text. */
function FieldShell({ label, required, error, children }) {
  return (
    <div>
      {label && (
        <label className="mb-1.5 block text-[13px] font-semibold text-slate-700">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
      )}
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

const baseWrap = (error) =>
  `flex items-center gap-2.5 rounded-xl border bg-white px-3.5 transition-colors focus-within:border-brand-blue focus-within:ring-2 focus-within:ring-brand-blue/10 ${
    error ? 'border-red-300' : 'border-slate-200'
  }`

export function TextInput({ label, required, error, icon: Icon, prefix, ...props }) {
  return (
    <FieldShell label={label} required={required} error={error}>
      <div className={baseWrap(error)}>
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400" />}
        {prefix && (
          <span className="shrink-0 border-r border-slate-200 pr-2.5 text-sm font-medium text-slate-500">
            {prefix}
          </span>
        )}
        <input
          {...props}
          className="w-full bg-transparent py-2.5 text-sm text-brand-navy outline-none placeholder:text-slate-400"
        />
      </div>
    </FieldShell>
  )
}

export function PasswordInput({ label, required, error, icon: Icon, ...props }) {
  const [show, setShow] = useState(false)
  return (
    <FieldShell label={label} required={required} error={error}>
      <div className={baseWrap(error)}>
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400" />}
        <input
          {...props}
          type={show ? 'text' : 'password'}
          className="w-full bg-transparent py-2.5 text-sm text-brand-navy outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="shrink-0 text-slate-400 hover:text-slate-600"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
        </button>
      </div>
    </FieldShell>
  )
}

export function SelectInput({ label, required, error, icon: Icon, children, ...props }) {
  return (
    <FieldShell label={label} required={required} error={error}>
      <div className={`${baseWrap(error)} relative`}>
        {Icon && <Icon className="h-[18px] w-[18px] shrink-0 text-slate-400" />}
        <select
          {...props}
          className="w-full appearance-none bg-transparent py-2.5 text-sm text-brand-navy outline-none"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none h-4 w-4 shrink-0 text-slate-400" />
      </div>
    </FieldShell>
  )
}

export function Checkbox({ checked, onChange, children, className = '' }) {
  return (
    <label className={`flex cursor-pointer items-start gap-2.5 ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
      />
      <span className="text-[13px] leading-snug text-slate-600">{children}</span>
    </label>
  )
}

/** Inline success / error banner used across the auth screens. */
export function Banner({ type = 'success', children }) {
  const styles =
    type === 'success'
      ? 'border-green-200 bg-green-50 text-green-700'
      : 'border-red-200 bg-red-50 text-red-600'
  return (
    <div className={`rounded-xl border px-3.5 py-2.5 text-[13px] font-medium ${styles}`}>
      {children}
    </div>
  )
}
