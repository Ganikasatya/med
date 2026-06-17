import { useState, useEffect } from 'react'

/**
 * Returns the scale factor needed to fit a fixed `baseW x baseH` design
 * entirely inside the current window, preserving aspect ratio.
 *
 * Used to render the landing page at its true reference proportions and then
 * scale it down to fit ANY laptop/monitor — no clipping, no scroll.
 */
export default function useFitScale(baseW, baseH) {
  const compute = () =>
    Math.min(window.innerWidth / baseW, window.innerHeight / baseH)

  const [scale, setScale] = useState(compute)

  useEffect(() => {
    const onResize = () => setScale(compute())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseW, baseH])

  return scale
}
