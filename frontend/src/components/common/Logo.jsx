/**
 * TapCure app icon — the full official lockup (heart/tap icon, the "TapCure"
 * script wordmark, and the "One tap to cure" tagline below). Transparent PNG,
 * so it sits cleanly on any background.
 *
 * Height is driven via className (e.g. "h-24"); defaults to h-16 when none given.
 */
function Logo({ className = '' }) {
  const hasHeight = /\bh-/.test(className)
  return (
    <img
      src="/tapcure-icon.png"
      alt="TapCure"
      className={`${hasHeight ? '' : 'h-16'} w-auto object-contain ${className}`}
    />
  )
}

export default Logo
