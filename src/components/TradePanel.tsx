// Sidebar list of pending player moves, with per-row remove and a CLEAR all.

import type { Player, Team, TradeAsset } from '../types'
import { TeamBadge } from './TeamBadge'
import { SectionLabel } from './ui'

interface Props {
  assets: TradeAsset[]
  playerById: Map<string, Player>
  teamById: Record<string, Team>
  onRemove: (playerId: string) => void
  onClear: () => void
}

export function TradePanel({ assets, playerById, teamById, onRemove, onClear }: Props) {
  return (
    <div className="rounded-xl border border-rink-700 bg-rink-850/60 p-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Trades ({assets.length})</SectionLabel>
        {assets.length > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] font-semibold uppercase tracking-wider text-down/80 transition hover:text-down"
          >
            Clear
          </button>
        )}
      </div>

      {assets.length === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          No trades yet. Click any player on the roster to move them to another team and watch the
          projection update.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {assets.map((a) => {
            const player = playerById.get(a.playerId)
            const from = teamById[a.fromTeamId]
            const to = teamById[a.toTeamId]
            if (!player || !from || !to) return null
            return (
              <li
                key={a.playerId}
                className="flex items-center gap-2 rounded-lg border border-rink-700 bg-rink-800/60 p-2"
              >
                <TeamBadge team={from} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">{player.name}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    {from.id} <span className="text-slate-600">→</span> {to.id} ·{' '}
                    {player.position} · {player.overall} OVR
                  </div>
                </div>
                <TeamBadge team={to} size={26} />
                <button
                  onClick={() => onRemove(a.playerId)}
                  className="ml-1 grid h-6 w-6 place-items-center rounded text-slate-500 transition hover:bg-down/20 hover:text-down"
                  aria-label={`Remove ${player.name} from trade`}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
