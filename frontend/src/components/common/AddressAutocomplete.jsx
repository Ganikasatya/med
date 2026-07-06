import { useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MapPin, Loader2 } from 'lucide-react'
import { searchPlaces, resolvePlaceCoords } from '../../lib/places.js'

/**
 * Type-ahead address input backed by the free Photon geocoder (no API key).
 *
 * Controlled by `value` / `onChange` (the text) and `onSelect` which fires with
 * `{ lat, lng, label }` when the user picks a suggestion — the caller stores the
 * coordinates to compute travel time / leave-by. `biasLat`/`biasLng` nudge
 * results toward a region (pass the clinic so nearby places rank first).
 *
 * Keyboard: ArrowUp/Down to move, Enter to pick, Escape to dismiss.
 */
export default function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Search address…',
  biasLat,
  biasLng,
  className = '',
}) {
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const boxRef = useRef(null)
  const abortRef = useRef(null)
  // Text of the suggestion the user last picked. While the input still holds
  // that exact text we must NOT reopen the dropdown — otherwise selecting a
  // place (which updates the caller's coords, and thus biasLat/biasLng) would
  // retrigger this effect and pop the suggestions straight back up.
  const lastPicked = useRef(value ?? '')
  const listId = useId()

  // Debounced search whenever the text changes.
  useEffect(() => {
    const q = (value || '').trim()
    if (q && q === (lastPicked.current || '').trim()) {
      setOpen(false); setLoading(false); return
    }
    if (q.length < 3) { setResults([]); setOpen(false); setLoading(false); return }
    setLoading(true)
    const id = setTimeout(async () => {
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl
      const found = await searchPlaces(q, { lat: biasLat, lng: biasLng, signal: ctrl.signal })
      setResults(found)
      setActive(-1)
      setOpen(found.length > 0)
      setLoading(false)
    }, 300)
    return () => clearTimeout(id)
  }, [value, biasLat, biasLng])

  // Close the dropdown on an outside click.
  useEffect(() => {
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const choose = async (place) => {
    lastPicked.current = place.label
    onChange?.(place.label)
    setOpen(false)
    setResults([])
    setActive(-1)
    // Google predictions carry a placeId but no coords — resolve them now.
    let resolved = place
    if ((place.lat == null || place.lng == null) && place.placeId) {
      const coords = await resolvePlaceCoords(place.placeId)
      if (coords) resolved = { ...place, ...coords }
    }
    onSelect?.(resolved)
  }

  const onKeyDown = (e) => {
    if (!open || !results.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((i) => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((i) => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(results[active]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange?.(e.target.value)}
          onFocus={() => results.length && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className={className || 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-9 text-sm text-brand-navy outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10'}
        />
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
        </span>
      </div>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.ul
            id={listId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute z-[1100] mt-1 max-h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
          >
            {results.map((place, i) => (
              <li key={`${place.lat},${place.lng},${i}`} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(place)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                    i === active ? 'bg-brand-blue/10 text-brand-navy' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-blue" />
                  <span className="leading-snug">{place.label}</span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  )
}
