// League-wide player search in the top bar. Type any player (or team) name to
// find rostered players — and free agents — and jump to them. Keyboard
// friendly: ↑/↓ to move, Enter to open, Esc to close.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { FREE_AGENTS } from '../data'
import { TeamBadge } from './TeamBadge'
import { initials } from '../lib/format'
import type { Team } from '../types'

interface Hit {
  key: string
  name: string
  position: string
  overall: number
  /** Present for rostered players; undefined for free agents. */
  team?: Team
  /** True when a pending trade moved a rostered player. */
  moved?: boolean
  /** Where selecting the result navigates to. */
  navTo: string
}

export function PlayerSearch() {
  const { baseTeams, afterTeams, originOf, signedNames } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Flat index: every rostered player (mapped to their current team) plus every
  // free agent (linking to the Free Agents page).
  const index = useMemo<Hit[]>(() => {
    const teamById = new Map(afterTeams.map((t) => [t.id, t]))
    const rostered: Hit[] = baseTeams.flatMap((t) =>
      t.roster.map((player) => {
        const currentTeamId = originOf.has(player.id)
          ? afterTeams.find((at) => at.roster.some((p) => p.id === player.id))?.id ?? t.id
          : t.id
        const team = teamById.get(currentTeamId) ?? t
        return {
          key: player.id,
          name: player.name,
          position: player.position,
          overall: player.overall,
          team,
          moved: originOf.has(player.id),
          navTo: `/team/${team.id}`,
        }
      }),
    )
    // Signed free agents already appear as rostered players above.
    const freeAgents: Hit[] = [...FREE_AGENTS.skaters, ...FREE_AGENTS.goalies]
      .filter((fa) => !signedNames.has(fa.name))
      .map((fa) => ({
        key: `fa-${fa.name}`,
        name: fa.name,
        position: fa.position,
        overall: fa.overall,
        navTo: '/free-agents',
      }))
    return [...rostered, ...freeAgents]
  }, [baseTeams, afterTeams, originOf, signedNames])

  const results = useMemo<Hit[]>(() => {
    const s = query.trim().toLowerCase()
    if (!s) return []
    return index
      .filter(
        (h) =>
          h.name.toLowerCase().includes(s) ||
          (h.team &&
            (h.team.name.toLowerCase().includes(s) ||
              h.team.city.toLowerCase().includes(s) ||
              h.team.id.toLowerCase() === s)),
      )
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 8)
  }, [index, query])

  // Clamp the active index whenever the result set changes.
  useEffect(() => setActive(0), [query])

  // Close on outside click.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  // Global "/" shortcut to focus search.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/' && document.activeElement !== inputRef.current) {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const choose = (hit: Hit) => {
    navigate(hit.navTo)
    setQuery('')
    setOpen(false)
    inputRef.current?.blur()
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      if (results[active]) choose(results[active])
    } else if (e.key === 'Escape') {
      setOpen(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={rootRef} className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-lg border border-rink-700 bg-rink-850 px-2.5 py-1.5 focus-within:border-ice-400/50">
        <span className="text-slate-500">⌕</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search players…"
          className="w-full bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
        />
        <kbd className="hidden rounded bg-rink-700 px-1.5 text-[10px] text-slate-400 sm:block">/</kbd>
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-rink-700 bg-rink-900 shadow-2xl">
          {results.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500">No players found.</div>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {results.map((hit, i) => (
                <li key={hit.key}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(hit)}
                    className={`flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition ${
                      i === active ? 'bg-rink-800' : ''
                    }`}
                  >
                    <div
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                      style={{
                        background: hit.team
                          ? `linear-gradient(135deg, ${hit.team.colors.primary}, ${hit.team.colors.secondary})`
                          : 'linear-gradient(135deg, var(--grad-hi), var(--grad-mid))',
                      }}
                    >
                      {initials(hit.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-100">
                        {hit.name}
                        {hit.moved && (
                          <span className="ml-1.5 rounded bg-up/20 px-1 py-0.5 text-[9px] font-bold uppercase text-up">
                            Traded
                          </span>
                        )}
                        {!hit.team && (
                          <span className="ml-1.5 rounded bg-amber-400/20 px-1 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                            FA
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {hit.position} · {hit.overall} OVR ·{' '}
                        {hit.team ? `${hit.team.city} ${hit.team.name}` : 'Free agent'}
                      </div>
                    </div>
                    {hit.team ? (
                      <TeamBadge team={hit.team} size={24} />
                    ) : (
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-rink-700 text-[9px] font-bold text-slate-400">
                        FA
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
