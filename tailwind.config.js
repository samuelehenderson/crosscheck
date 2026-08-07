/** @type {import('tailwindcss').Config} */
// PuckPayroll design language: blue-black surfaces, hairline white borders,
// neon ice-blue accent, Geist type. The historical "rink"/"ice" token names are
// kept so every component picks up the new palette without edits.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rink: {
          950: '#090e12', // page background
          900: '#0e141a',
          850: '#13191f', // card
          800: '#1b232c', // elevated / hover
          700: '#ffffff1a', // hairline borders + soft fills
          600: '#ffffff26',
        },
        ice: {
          400: '#60d4fe', // neon accent
          300: '#8ee0ff',
        },
        up: '#4ade80',
        down: '#ff6568',
      },
      fontFamily: {
        display: ['"Geist"', 'system-ui', 'sans-serif'],
        mono: ['"Geist Mono"', 'ui-monospace', 'monospace'],
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(.4, 0, .2, 1)',
      },
    },
  },
  plugins: [],
}
