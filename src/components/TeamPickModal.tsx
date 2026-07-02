// Generic searchable team picker, used by the free-agent signing flow.

import { useMemo, useState } from 'react'
import type { Team } from '../types'
import { TeamBadge } from './TeamBadge'

interface Props {
  title: string
  subtitle?: string
  teams: Team[]
  onPick: (teamId: string) => void
  onClose: () => void
}

export function TeamPickModal({ title, subtitle, teams, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')

  const options = useMemo(() => {
    const q = query.trim().toLowerCase()
    return teams
      .filter((t) => !q || `${t.city} ${t.name} ${t.id}`.toLowerCase().includes(q))
      .sort((a, b) => a.city.localeCompare(b.city))
  }, [teams, query])

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-rink-700 bg-rink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-rink-700 p-4">
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-white">{title}</div>
            {subtitle && <div className="truncate text-xs text-slate-400">{subtitle}</div>}
          </div>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-rink-700 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search teams…"
            className="mb-3 w-full rounded-lg border border-rink-700 bg-rink-850 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-ice-400/50"
          />
          <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
            {options.map((t) => (
              <button
                key={t.id}
                onClick={() => onPick(t.id)}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-rink-700 hover:bg-rink-800"
              >
                <TeamBadge team={t} size={30} />
                <span className="flex-1 text-sm font-medium text-slate-200">
                  {t.city} {t.name}
                </span>
                <span className="text-[11px] uppercase tracking-wider text-slate-500">{t.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
