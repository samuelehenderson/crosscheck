// In-app notifications: banners driven by src/data/announcements.json.
// Each item shows until its optional "until" date passes or the user
// dismisses it (per-id, remembered in localStorage). Editing that JSON —
// today via GitHub, later via the admin portal — is how announcements ship.

import { useState } from 'react'
import announcements from '../data/announcements.json'

interface Item {
  id: string
  /** info (neutral) | hot (accent) | alert (red) */
  level?: string
  text: string
  /** ISO date; the banner hides itself after this day. */
  until?: string
}

const DISMISS_KEY = 'im.dismissed.v1'

function loadDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

const LEVEL_CLS: Record<string, string> = {
  info: 'border-rink-700 bg-rink-850 text-slate-300',
  hot: 'border-ice-400/40 bg-ice-400/10 text-ice-300',
  alert: 'border-down/40 bg-down/10 text-down',
}

export function AnnouncementBar() {
  const [dismissed, setDismissed] = useState<Set<string>>(loadDismissed)

  const items = ((announcements as { items: Item[] }).items ?? []).filter((it) => {
    if (dismissed.has(it.id)) return false
    if (it.until && new Date(`${it.until}T23:59:59`) < new Date()) return false
    return Boolean(it.text)
  })
  if (items.length === 0) return null

  const dismiss = (id: string) => {
    const next = new Set(dismissed)
    next.add(id)
    setDismissed(next)
    try {
      localStorage.setItem(DISMISS_KEY, JSON.stringify([...next]))
    } catch {
      // Private mode — dismissal just lasts the session.
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-2 px-4 pt-3">
      {items.map((it) => (
        <div
          key={it.id}
          className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-sm ${
            LEVEL_CLS[it.level ?? 'info'] ?? LEVEL_CLS.info
          }`}
        >
          <span className="min-w-0 flex-1 leading-relaxed">{it.text}</span>
          <button
            onClick={() => dismiss(it.id)}
            className="shrink-0 opacity-60 transition hover:opacity-100"
            aria-label="Dismiss announcement"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  )
}
