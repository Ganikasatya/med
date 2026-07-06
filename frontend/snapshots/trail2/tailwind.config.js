/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette driven by CSS variables (RGB channels) so a single
        // console can re-skin itself by overriding the vars on a wrapper (see
        // index.css `.theme-reception`). Defaults = the original royal-blue brand,
        // so every console that doesn't opt in looks exactly as before.
        brand: {
          blue: 'rgb(var(--brand-blue) / <alpha-value>)',
          blueDark: 'rgb(var(--brand-blueDark) / <alpha-value>)',
          blueLight: 'rgb(var(--brand-blueLight) / <alpha-value>)',
          teal: 'rgb(var(--brand-teal) / <alpha-value>)',
          green: 'rgb(var(--brand-green) / <alpha-value>)',
          greenLight: 'rgb(var(--brand-greenLight) / <alpha-value>)',
          navy: 'rgb(var(--brand-navy) / <alpha-value>)',
        },

        // Landing "sweet-looker" layout tokens, tuned to the TapCure brand:
        // teal primary + navy ink + green/amber accents on a soft teal paper.
        // Only the landing page uses these tokens.
        background: '#f6fbfa',
        foreground: '#0f2742',
        border: '#d8e7e4',
        input: '#d8e7e4',
        ring: '#0d9488',
        cream: '#e9f7f4',
        clay: '#16a34a',
        ember: '#ef4444',
        ink: { DEFAULT: '#0f2742', soft: '#475569' },
        sage: { DEFAULT: '#ccfbf1', deep: '#0f766e' },
        card: { DEFAULT: '#ffffff', foreground: '#0f2742' },
        primary: { DEFAULT: '#0d9488', foreground: '#ffffff' },
        muted: { DEFAULT: '#eef5f3', foreground: '#64748b' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Instrument Serif"', 'ui-serif', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(15, 39, 66, 0.06)',
        cardHover: '0 6px 20px rgba(15, 39, 66, 0.10)',
        soft: '0 1px 2px rgba(30, 43, 36, 0.04), 0 8px 24px rgba(30, 43, 36, 0.06)',
        lift: '0 2px 4px rgba(30, 43, 36, 0.05), 0 20px 48px rgba(30, 43, 36, 0.10)',
      },
    },
  },
  plugins: [],
}
