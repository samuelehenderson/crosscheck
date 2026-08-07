// Team schedule panel: last result plus the next few games, straight from the
// NHL schedule feed. Hidden until the pipeline has schedule data.

import { getScheduleFor, getTeam } from '../data'
import type { Team } from '../types'
import { TeamBadge } from './TeamBadge'

function fmtDay(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function SchedulePanel({ team }: { team: Team }) {
  const { last, next } = getScheduleFor(team.id)
  if (!last && next.length === 0) return null

  return (
    <div className="rounded-2xl border border-rink-700 bg-rink-850/70 p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
        Schedule
      </h3>

      {last && last.usScore != null && last.oppScore != null && (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-rink-800/60 px-2.5 py-2 text-xs">
          <span className="text-slate-400">
            Last{' '}
            <span
              className={`font-bold ${last.usScore > last.oppScore ? 'text-up' : 'text-down'}`}
            >
              {last.usScore > last.oppScore ? 'W' : 'L'} {last.usScore}–{last.oppScore}
            </span>{' '}
            {last.home ? 'vs' : '@'} {last.opp}
            {last.endType !== 'REG' ? ` (${last.endType})` : ''}
          </span>
          <span className="text-slate-600">{last.date ? fmtDay(last.date) : ''}</span>
        </div>
      )}

      {next.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {next.map((g) => {
            const opp = g.opp ? getTeam(g.opp) : undefined
            return (
              <li key={g.startUtc} className="flex items-center gap-2.5 text-xs">
                {opp ? (
                  <TeamBadge team={opp} size={22} />
                ) : (
                  <span className="h-[22px] w-[22px] rounded-full bg-rink-700" />
                )}
                <span className="flex-1 truncate text-slate-300">
                  {g.home ? 'vs' : '@'} {opp ? opp.name : (g.opp ?? 'TBD')}
                </span>
                {g.type === 1 && (
                  <span className="rounded bg-rink-700 px-1 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                    Pre
                  </span>
                )}
                <span className="whitespace-nowrap tabular-nums text-slate-500">
                  {fmtDay(g.startUtc)} · {fmtTime(g.startUtc)}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
