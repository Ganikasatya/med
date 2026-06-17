import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { CALCULATORS } from '../../lib/calculators.js'
import { useI18n } from '../../i18n/index.jsx'

const TONE = {
  green: 'border-green-200 bg-green-50 text-green-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  red: 'border-red-200 bg-red-50 text-red-600',
  blue: 'border-blue-200 bg-blue-50 text-brand-blue',
}

// Map an option's English value to its translation key (calc.opt.*).
const OPT_KEY = {
  male: 'male',
  female: 'female',
  '1.2': 'sedentary',
  '1.375': 'light',
  '1.55': 'moderate',
  '1.725': 'active',
  '1.9': 'veryActive',
}

/**
 * Pop-over for a single health calculator. `name` is the calculator's label
 * (key into CALCULATORS); result recomputes live as the user types.
 */
function CalculatorModal({ name, onClose }) {
  const { t } = useI18n()
  const calc = name ? CALCULATORS[name] : null
  const [values, setValues] = useState({})

  const result = useMemo(() => {
    if (!calc) return null
    try {
      return calc.compute(values)
    } catch {
      return null
    }
  }, [calc, values])

  if (!name || !calc) return null

  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 grid place-items-center bg-brand-navy/40 p-4 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="text-[18px] font-extrabold text-brand-navy">{t(`calc.label.${name}`)}</h3>
            <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="mb-4 text-[13px] text-slate-500">{t(`calc.blurb.${name}`)}</p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {calc.fields.map((f) => (
              <div key={f.name} className={f.type === 'date' ? 'sm:col-span-2' : ''}>
                <label className="mb-1 block text-[12.5px] font-semibold text-slate-600">
                  {t(`calc.field.${f.name}`)}{f.unit ? ` (${f.unit})` : ''}
                </label>
                {f.type === 'select' ? (
                  <select
                    value={values[f.name] || ''}
                    onChange={set(f.name)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                  >
                    <option value="">{t('calc.selectPlaceholder')}</option>
                    {f.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {OPT_KEY[o.value] ? t(`calc.opt.${OPT_KEY[o.value]}`) : o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    inputMode={f.type === 'number' ? 'decimal' : undefined}
                    value={values[f.name] || ''}
                    onChange={set(f.name)}
                    placeholder={f.type === 'number' ? '0' : undefined}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10"
                  />
                )}
              </div>
            ))}
          </div>

          {/* Result */}
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key={`${result.headline}-${result.label}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 flex items-end justify-between gap-3 rounded-2xl border px-4 py-3.5 ${TONE[result.tone] || TONE.blue}`}
              >
                <div>
                  <p className="text-[12px] font-semibold opacity-80">{result.label}</p>
                  {result.note && <p className="mt-1 text-[11.5px] font-medium opacity-80">{result.note}</p>}
                </div>
                <p className="shrink-0 text-right text-[28px] font-extrabold leading-none">
                  {result.headline}
                  {result.unit && <span className="ml-1 text-[13px] font-bold opacity-80">{result.unit}</span>}
                </p>
              </motion.div>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3.5 text-center text-[12.5px] text-slate-400">
                {t('calc.fillHint')}
              </p>
            )}
          </AnimatePresence>

          <p className="mt-3 text-[11px] text-slate-400">
            {t('calc.disclaimer')}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default CalculatorModal
