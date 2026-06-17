/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Brand palette — royal blue + medical green + navy
        brand: {
          blue: '#2563eb',
          blueDark: '#1d4ed8',
          blueLight: '#eff6ff',
          green: '#16a34a',
          greenLight: '#ecfdf5',
          navy: '#0f2742',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 10px rgba(15, 39, 66, 0.06)',
        cardHover: '0 6px 20px rgba(15, 39, 66, 0.10)',
      },
    },
  },
  plugins: [],
}
