// Light/dark switch. The choice lives in localStorage and is applied before
// first paint by an inline script in index.html; this button just flips the
// data-theme attribute (and the PWA theme-color) at runtime.

import { useState } from 'react'

export const THEME_KEY = 'pp.theme'
const META_COLOR = { dark: '#090e12', light: '#eef2f6' } as const

type Theme = 'dark' | 'light'

function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

function applyTheme(theme: Theme) {
  if (theme === 'light') document.documentElement.dataset.theme = 'light'
  else delete document.documentElement.dataset.theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META_COLOR[theme])
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // Private mode etc. — the toggle still works for the session.
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(currentTheme)

  const flip = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
  }

  return (
    <button
      onClick={flip}
      className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 ring-1 ring-rink-700 transition hover:text-white"
      aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
    >
      {theme === 'dark' ? (
        // Sun
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" width="18" height="18" fill="none">
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M19.2 4.8l-1.8 1.8M6.6 17.4l-1.8 1.8" />
          </g>
        </svg>
      ) : (
        // Moon
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path
            d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  )
}
