// League-wide player search in the top bar. Type any player (or team) name to
// find them across all 32 rosters and jump to their team. Keyboard friendly:
// ↑/↓ to move, Enter to open, Esc to close.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { TeamBadge } from './TeamBadge'
import { initials } from '../lib/format'
import type { Player, Team } from '../types'

interface Hit {
  player: Player
  /** The team the player is currently on (after any trades). */
  team: Team
  /** True when a pending trade moved them off their original team. */
  moved: boolean
}

export function PlayerSearch() {
  const { baseTeams, afterTeams, originOf } = useStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Flat index of every player mapped to their current (after-trade) team.
  const index = useMemo<Hit[]>(() => {
    const teamById = new Map(afterTeams.map((t) => [t.id, t]))
    return baseTeams.flatMap((t) =>
      t.roster.map((player) => {
        const currentTeamId = originOf.has(player.id)
          ? // originOf maps moved players -> their ORIGIN, so find where they are now
            afterTeams.find((at) => at.roster.some((p) => p.id === player.id))?.id ?? t.id
          : t.id
        return {
          player,
          team: teamById.get(currentTeamId) ?? t,
          moved: originOf.has(player.id),
        }
      }),
    )
  }, [baseTeams, afterTeams, originOf])

  const results = useMemo<Hit[]>(() => {
    const s = query.trim().toLowerCase()
    if (!s) return []
    return index
      .filter(
        ({ player, team }) =>
          player.name.toLowerCase().includes(s) ||
          team.name.toLowerCase().includes(s) ||
          team.city.toLowerCase().includes(s) ||
          team.id.toLowerCase() === s,
      )
      .sort((a, b) => b.player.overall - a.player.overall)
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
    navigate(`/team/${hit.team.id}`)
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
                <li key={hit.player.id}>
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
                        background: `linear-gradient(135deg, ${hit.team.colors.primary}, ${hit.team.colors.secondary})`,
                      }}
                    >
                      {initials(hit.player.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-100">
                        {hit.player.name}
                        {hit.moved && (
                          <span className="ml-1.5 rounded bg-up/20 px-1 py-0.5 text-[9px] font-bold uppercase text-up">
                            Traded
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] text-slate-500">
                        {hit.player.position} · {hit.player.overall} OVR · {hit.team.city}{' '}
                        {hit.team.name}
                      </div>
                    </div>
                    <TeamBadge team={hit.team} size={24} />
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
