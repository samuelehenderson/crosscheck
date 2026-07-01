// A single roster row: initials avatar, name, season stat line, optional
// injury + NEW badges, overall rating, and a hover action to trade the player.

import type { Player, PlayerStats, Team } from '../types'
import { initials } from '../lib/format'

interface Props {
  player: Player
  team: Team
  isNew?: boolean
  onTrade?: (player: Player) => void
}

function ratingTone(overall: number): string {
  if (overall >= 90) return 'bg-amber-400/20 text-amber-300 ring-amber-400/30'
  if (overall >= 83) return 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/25'
  if (overall >= 75) return 'bg-ice-400/15 text-ice-300 ring-ice-400/25'
  return 'bg-rink-700 text-slate-300 ring-rink-600'
}

/** Compact season stat line, or null if there's nothing worth showing. */
function statLine(stats: PlayerStats | null | undefined): string | null {
  if (!stats || !stats.gamesPlayed) return null
  if (stats.isGoalie) {
    const parts: string[] = []
    if (stats.savePct != null) parts.push(`.${Math.round(stats.savePct * 1000)} SV%`)
    if (stats.wins != null && stats.losses != null) parts.push(`${stats.wins}-${stats.losses}`)
    return parts.join(' · ') || `${stats.gamesPlayed} GP`
  }
  const g = stats.goals ?? 0
  const a = stats.assists ?? 0
  const p = stats.points ?? g + a
  return `${g}G · ${a}A · ${p}P`
}

/** Color treatment for an injury short-code. */
function injuryTone(short: string): string {
  return short === 'DTD' || short === 'Q'
    ? 'bg-amber-400/20 text-amber-300'
    : 'bg-down/20 text-down'
}

export function PlayerCard({ player, team, isNew, onTrade }: Props) {
  const [first, ...rest] = player.name.split(' ')
  const last = rest.join(' ')
  const rating = player.overall
  const stat = statLine(player.stats)
  const injury = player.injury
  const interactive = !!onTrade

  const inner = (
    <>
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary})`,
        }}
      >
        {initials(player.name)}
      </div>

      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[10px] text-slate-400">{first}</div>
        <div className="truncate text-[13px] font-semibold text-slate-100">{last || first}</div>
        {stat && <div className="truncate text-[10px] tabular-nums text-slate-500">{stat}</div>}
      </div>

      {injury && (
        <span
          className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${injuryTone(injury.short)}`}
          title={`${injury.status}${injury.detail ? ` — ${injury.detail}` : ''}`}
        >
          {injury.short}
        </span>
      )}

      {isNew && (
        <span className="rounded bg-up/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-up">
          New
        </span>
      )}

      <span
        className={`grid h-7 min-w-[1.9rem] place-items-center rounded px-1 text-xs font-bold tabular-nums ring-1 ${ratingTone(rating)}`}
      >
        {rating}
      </span>
    </>
  )

  const base =
    'group relative flex w-full items-center gap-2 rounded-lg border border-rink-700 bg-rink-850/70 px-2 py-2 text-left'
  const borderStyle = { borderBottom: `2px solid ${team.colors.primary}` }

  // Interactive only in trade mode; otherwise a plain, non-clickable card
  // (the plain click is reserved for a future player-detail view).
  if (!interactive) {
    return (
      <div className={base} style={borderStyle} title={player.name}>
        {inner}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onTrade?.(player)}
      className={`${base} cursor-pointer transition hover:border-ice-400/40 hover:bg-rink-800`}
      style={borderStyle}
      title={`Trade ${player.name}`}
    >
      {inner}
    </button>
  )
}
