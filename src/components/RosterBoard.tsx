// The roster laid out by position, mirroring the reference design: forwards on
// top (LW / C / RW), then defense and goalies (LD / RD / G). Forward columns
// come from the depth-chart builder, which shifts surplus natural centers to
// the wings the way real lineups do.

import { useMemo } from 'react'
import type { Player, Position, Team } from '../types'
import { PlayerCard } from './PlayerCard'
import { buildForwardLines, type Slotted } from '../lib/depthChart'

interface Props {
  team: Team
  newIds: Set<string>
  onTrade?: (player: Player) => void
}

function Column({
  label,
  players,
  team,
  newIds,
  onTrade,
}: {
  label: string
  players: Slotted[]
  team: Team
  newIds: Set<string>
  onTrade?: (player: Player) => void
}) {
  return (
    <div>
      <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="flex flex-col gap-2">
        {players.map(({ player, shiftedFrom }) => (
          <PlayerCard
            key={player.id}
            player={player}
            team={team}
            isNew={newIds.has(player.id)}
            shiftedFrom={shiftedFrom}
            onTrade={onTrade}
          />
        ))}
        {players.length === 0 && (
          <div className="rounded-lg border border-dashed border-rink-700 py-4 text-center text-xs text-slate-600">
            Empty
          </div>
        )}
      </div>
    </div>
  )
}

export function RosterBoard({ team, newIds, onTrade }: Props) {
  const lines = useMemo(() => buildForwardLines(team.roster), [team.roster])

  const byPosition = (pos: Position): Slotted[] =>
    team.roster
      .filter((p) => p.position === pos)
      .sort((a, b) => b.overall - a.overall)
      .map((player) => ({ player }))

  const rows: { label: string; players: Slotted[] }[][] = [
    [
      { label: 'Left Wing', players: lines.LW },
      { label: 'Center', players: lines.C },
      { label: 'Right Wing', players: lines.RW },
    ],
    [
      { label: 'Left Defense', players: byPosition('LD') },
      { label: 'Right Defense', players: byPosition('RD') },
      { label: 'Goalie', players: byPosition('G') },
    ],
  ]

  return (
    <div className="space-y-6">
      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {row.map((g) => (
            <Column
              key={g.label}
              label={g.label}
              players={g.players}
              team={team}
              newIds={newIds}
              onTrade={onTrade}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
