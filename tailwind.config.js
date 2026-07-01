/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rink: {
          950: '#0a0e17',
          900: '#0e1420',
          850: '#131b2b',
          800: '#18202f',
          700: '#1f2937',
          600: '#2a3547',
        },
        ice: {
          400: '#7fb0e6',
          300: '#a7cbf0',
        },
        up: '#3fbf6f',
        down: '#e5484d',
      },
      fontFamily: {
        display: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
