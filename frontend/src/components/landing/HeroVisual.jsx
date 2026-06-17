/**
 * Right-side hero visual.
 *
 * Uses a single ready-made scene image (public/hero-visual.png) that already
 * contains the full family, the green location marker and the hospital building
 * on a light-blue background. A soft left/top fade blends it into the hero so
 * it melts seamlessly toward the headline side.
 */
function HeroVisual() {
  return (
    <div className="relative h-full w-full">
      <img
        src="/hero-visual.png"
        alt="Family booking a doctor appointment near a hospital"
        className="absolute bottom-0 right-0 w-full object-contain object-bottom"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, black 14%, black 100%), linear-gradient(to bottom, transparent 0%, black 16%, black 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0%, black 14%, black 100%), linear-gradient(to bottom, transparent 0%, black 16%, black 100%)',
          WebkitMaskComposite: 'source-in',
          maskComposite: 'intersect',
        }}
      />
    </div>
  )
}

export default HeroVisual
