// Player detail card: opened by tapping a player when Trade mode is off.
// Shows the rating breakdown, season stat line, and injury status, with a
// shortcut into the trade flow.

import type { Player, Team } from '../types'
import { initials } from '../lib/format'
import { STATS_SEASON } from '../data'

interface Props {
  player: Player
  team: Team
  onTrade: (player: Player) => void
  onClose: () => void
}

function Bar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null
  const tone = value >= 88 ? 'bg-amber-400' : value >= 78 ? 'bg-up' : value >= 68 ? 'bg-ice-400' : 'bg-slate-500'
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium uppercase tracking-wider text-slate-400">{label}</span>
        <span className="font-bold tabular-nums text-slate-200">{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-rink-700">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-rink-800/70 px-2 py-2 text-center">
      <div className="text-base font-bold tabular-nums text-slate-100">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
    </div>
  )
}

export function PlayerDetailModal({ player, team, onTrade, onClose }: Props) {
  const s = player.stats
  const isG = player.position === 'G'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-rink-700 bg-rink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with team-color wash */}
        <div
          className="flex items-center gap-3 border-b border-rink-700 p-4"
          style={{
            background: `linear-gradient(135deg, ${team.colors.primary}30 0%, transparent 70%)`,
          }}
        >
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary})`,
            }}
          >
            {initials(player.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-bold text-white">{player.name}</div>
            <div className="text-xs text-slate-400">
              {team.city} {team.name} · {player.position} · Age {player.age}
            </div>
          </div>
          <span className="grid h-10 min-w-[2.6rem] place-items-center rounded-lg bg-rink-800 px-1.5 text-lg font-black tabular-nums text-ice-300 ring-1 ring-ice-400/30">
            {player.overall}
          </span>
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-rink-700 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 p-4">
          {player.injury && (
            <div className="flex items-center gap-2 rounded-lg bg-down/10 px-3 py-2 text-sm text-down ring-1 ring-down/30">
              <span className="rounded bg-down/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">
                {player.injury.short}
              </span>
              <span className="min-w-0 truncate">
                {player.injury.status}
                {player.injury.detail ? ` — ${player.injury.detail}` : ''}
              </span>
            </div>
          )}

          {/* Season stats */}
          {s && s.gamesPlayed > 0 ? (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {STATS_SEASON || 'Season'} stats
              </div>
              {s.isGoalie ? (
                <div className="grid grid-cols-4 gap-2">
                  <Stat label="GP" value={s.gamesPlayed} />
                  <Stat label="Record" value={`${s.wins ?? 0}-${s.losses ?? 0}`} />
                  <Stat label="SV%" value={s.savePct != null ? `.${Math.round(s.savePct * 1000)}` : '—'} />
                  <Stat label="GAA" value={s.gaa != null ? s.gaa.toFixed(2) : '—'} />
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-2">
                  <Stat label="GP" value={s.gamesPlayed} />
                  <Stat label="G" value={s.goals ?? 0} />
                  <Stat label="A" value={s.assists ?? 0} />
                  <Stat label="P" value={s.points ?? 0} />
                  <Stat label="+/-" value={(s.plusMinus ?? 0) > 0 ? `+${s.plusMinus}` : s.plusMinus ?? 0} />
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500">No NHL stats last season.</p>
          )}

          {/* Rating breakdown */}
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Ratings
            </div>
            <div className="space-y-2.5">
              {isG ? (
                <Bar label="Goaltending" value={player.goaltending} />
              ) : (
                <>
                  <Bar label="Offense" value={player.offense} />
                  <Bar label="Defense" value={player.defense} />
                  <Bar label="Finishing" value={player.finishing} />
                </>
              )}
            </div>
          </div>

          <button
            onClick={() => onTrade(player)}
            className="w-full rounded-lg bg-ice-400 py-2 text-sm font-semibold text-rink-950 transition hover:bg-ice-300"
          >
            ⇄ Trade {player.name.split(' ').slice(-1)[0]}
          </button>
        </div>
      </div>
    </div>
  )
}
