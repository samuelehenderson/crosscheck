/** @type {import('tailwindcss').Config} */
// PuckPayroll design language: blue-black surfaces, hairline borders, neon
// ice-blue accent, Geist type. All colors resolve to CSS variables defined in
// index.css so the [data-theme="light"] override restyles everything at once.
// Triplet vars keep Tailwind alpha modifiers (e.g. bg-ice-400/15) working.
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        rink: {
          950: v('rink-950'), // page background
          900: v('rink-900'),
          850: v('rink-850'), // card
          800: v('rink-800'), // elevated / hover
          700: v('rink-700'), // hairline borders + chips
          600: v('rink-600'),
        },
        ice: {
          400: v('ice-400'), // accent
          300: v('ice-300'),
        },
        up: v('up'),
        down: v('down'),
        white: v('ink'),
        slate: {
          100: 'var(--slate-100)',
          200: 'var(--slate-200)',
          300: 'var(--slate-300)',
          400: 'var(--slate-400)',
          500: 'var(--slate-500)',
          600: 'var(--slate-600)',
        },
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
