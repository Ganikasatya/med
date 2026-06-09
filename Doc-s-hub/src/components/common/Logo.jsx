/**
 * Doctor Mitra brand logo — a medical map-pin (royal blue) with a green
 * location dot, paired with the wordmark. Pure SVG so it needs no assets.
 */
function Logo({ className = '' }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        viewBox="0 0 40 40"
        className="h-9 w-9 shrink-0"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M20 3.5c-6.6 0-12 5.2-12 11.7C8 23.7 20 36 20 36s12-12.3 12-20.8C32 8.7 26.6 3.5 20 3.5z"
          fill="#2563eb"
        />
        <path
          d="M20 10v9M15.5 14.5h9"
          stroke="#fff"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
        <circle cx="20" cy="33" r="3" fill="#16a34a" />
      </svg>
      <span className="text-[26px] font-extrabold leading-none tracking-tight">
        <span className="text-brand-blue">Doctor</span>
        <span className="text-brand-green">Mitra</span>
      </span>
    </div>
  )
}

export default Logo
