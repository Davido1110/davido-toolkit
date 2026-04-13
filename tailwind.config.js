/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: false,
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'Sodo Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        pike: ['Pike', 'ui-serif', 'serif'],
        anton: ['Anton', 'sans-serif'],
      },
      colors: {
        oat: {
          black:  '#0A0A0A',
          white:  '#F5F2EC',
          cream:  '#FAF7F2',
          yellow: '#F5C926',
          red:    '#D0302A',
          green:  '#2D6A3F',
          blue:   '#3B82C4',
        },
        brand: {
          50:  '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
}
