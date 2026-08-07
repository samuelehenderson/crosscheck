// Team schedule panel: the entire season inside its own scroll area. Played
// games show their result (W/L and score); future games show date and local
// time. On mount the list auto-scrolls to the next unplayed game so the
// relevant stretch is always in view. Hidden until the pipeline has data.

import { useEffect, useMemo, useRef } from 'react'
import { getScheduleFor, getTeam } from '../data'
import type { Team } from '../types'
import { TeamBadge } from './TeamBadge'

function fmtDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function SchedulePanel({ team }: { team: Team }) {
  const { games } = getScheduleFor(team.id)
  const listRef = useRef<HTMLUListElement>(null)

  // First game that hasn't been played — where the auto-scroll lands.
  const nextIdx = useMemo(() => {
    const now = Date.now()
    const i = games.findIndex(
      (g) => g.usScore == null && new Date(g.startUtc).getTime() > now - 6 * 3600_000,
    )
    return i === -1 ? games.length - 1 : i
  }, [games])

  useEffect(() => {
    const list = listRef.current
    if (!list || nextIdx <= 0) return
    const row = list.children[nextIdx] as HTMLElement | undefined
    if (row) list.scrollTop = Math.max(0, row.offsetTop - list.offsetTop - 8)
  }, [nextIdx])

  if (games.length === 0) return null

  const played = games.filter((g) => g.usScore != null).length

  return (
    <div className="rounded-2xl border border-rink-700 bg-rink-850/70 p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Schedule
        </h3>
        <span className="text-[10px] tabular-nums text-slate-600">
          {played > 0 ? `${played}/${games.length} played` : `${games.length} games`}
        </span>
      </div>

      <ul
        ref={listRef}
        className="mt-3 max-h-72 space-y-1.5 overflow-y-auto overscroll-contain pr-1.5"
      >
        {games.map((g, i) => {
          const opp = g.opp ? getTeam(g.opp) : undefined
          const done = g.usScore != null && g.oppScore != null
          const won = done && g.usScore! > g.oppScore!
          return (
            <li
              key={`${g.startUtc}-${i}`}
              className={`flex items-center gap-2.5 rounded-md px-1 py-0.5 text-xs ${
                i === nextIdx && !done ? 'bg-rink-800/60' : ''
              }`}
            >
              {opp ? (
                <TeamBadge team={opp} size={22} />
              ) : (
                <span className="h-[22px] w-[22px] rounded-full bg-rink-700" />
              )}
              <span className={`flex-1 truncate ${done ? 'text-slate-400' : 'text-slate-300'}`}>
                {g.home ? 'vs' : '@'} {opp ? opp.name : (g.opp ?? 'TBD')}
              </span>
              {g.type === 1 && (
                <span className="rounded bg-rink-700 px-1 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                  Pre
                </span>
              )}
              {done ? (
                <span
                  className={`whitespace-nowrap font-bold tabular-nums ${won ? 'text-up' : 'text-down'}`}
                >
                  {won ? 'W' : 'L'} {g.usScore}–{g.oppScore}
                  {g.endType && g.endType !== 'REG' ? ` ${g.endType}` : ''}
                </span>
              ) : (
                <span className="whitespace-nowrap tabular-nums text-slate-500">
                  {fmtDay(g.startUtc)} · {fmtTime(g.startUtc)}
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
