// "Today's game" panel for a team page. Shows the matchup and start time
// from the NHL scoreboard; once the game starts (and the official lineup
// exists in the boxscore) it adds the starting goalie and dressed counts.
// Renders nothing when the team has no game today — so it's invisible all
// offseason and appears on its own once the schedule does.

import { getGameFor, getTeam } from '../data'
import type { Team } from '../types'
import { TeamBadge } from './TeamBadge'

const STATE_BADGE: Record<string, { label: string; cls: string }> = {
  FUT: { label: 'Scheduled', cls: 'bg-rink-700 text-slate-300' },
  PRE: { label: 'Pre-game', cls: 'bg-rink-700 text-slate-300' },
  LIVE: { label: 'Live', cls: 'bg-up/20 text-up ring-1 ring-up/30' },
  CRIT: { label: 'Live', cls: 'bg-up/20 text-up ring-1 ring-up/30' },
  OFF: { label: 'Final', cls: 'bg-rink-700 text-slate-300' },
  FINAL: { label: 'Final', cls: 'bg-rink-700 text-slate-300' },
}

function localTime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function GameDayCard({ team }: { team: Team }) {
  const game = getGameFor(team.id)
  if (!game || !game.home || !game.away) return null

  const isHome = game.home === team.id
  const oppId = isHome ? game.away : game.home
  const opp = getTeam(oppId)
  const badge = STATE_BADGE[game.state] ?? STATE_BADGE.FUT
  const started = game.state !== 'FUT' && game.state !== 'PRE'
  const lineup = game.lineups?.[team.id] ?? null
  const starter = lineup?.goalies.find((g) => g.starter) ?? null
  const time = localTime(game.startUtc)

  return (
    <div className="rounded-2xl border border-ice-400/25 bg-rink-850/70 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
          Today's game
        </h3>
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${badge.cls}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        {opp && <TeamBadge team={opp} size={34} />}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-white">
            {isHome ? 'vs' : '@'} {opp ? `${opp.city} ${opp.name}` : oppId}
          </div>
          <div className="text-xs text-slate-400">
            {started && game.homeScore != null && game.awayScore != null
              ? `${game.away} ${game.awayScore} — ${game.home} ${game.homeScore}`
              : time
                ? `Puck drop ${time}`
                : 'Time TBD'}
          </div>
        </div>
      </div>

      {started && lineup ? (
        <div className="mt-3 space-y-1 border-t border-rink-700 pt-3 text-xs text-slate-400">
          {starter && (
            <div>
              <span className="text-slate-500">Starting goalie:</span>{' '}
              <span className="font-semibold text-slate-200">{starter.name}</span>
            </div>
          )}
          <div>
            <span className="text-slate-500">Dressed:</span>{' '}
            {lineup.forwards.length}F · {lineup.defense.length}D · {lineup.goalies.length}G
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-rink-700 pt-3 text-[11px] leading-relaxed text-slate-600">
          The official dressed lineup and starting goalie land here at puck drop. Lines on the
          board are projected from ratings until then.
        </p>
      )}
    </div>
  )
}
