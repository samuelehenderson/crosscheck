// The roster laid out by position, mirroring the reference design: forwards on
// top (LW / C / RW), then defense and goalies (LD / RD / G).

import type { Player, Position, Team } from '../types'
import { PlayerCard } from './PlayerCard'

interface Props {
  team: Team
  originOf: Map<string, string>
  onTrade: (player: Player) => void
}

const GROUPS: { key: Position; label: string }[][] = [
  [
    { key: 'LW', label: 'Left Wing' },
    { key: 'C', label: 'Center' },
    { key: 'RW', label: 'Right Wing' },
  ],
  [
    { key: 'LD', label: 'Left Defense' },
    { key: 'RD', label: 'Right Defense' },
    { key: 'G', label: 'Goalie' },
  ],
]

function Column({
  label,
  players,
  team,
  originOf,
  onTrade,
}: {
  label: string
  players: Player[]
  team: Team
  originOf: Map<string, string>
  onTrade: (player: Player) => void
}) {
  return (
    <div>
      <div className="mb-2 text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </div>
      <div className="flex flex-col gap-2">
        {players.map((p) => (
          <PlayerCard
            key={p.id}
            player={p}
            team={team}
            isNew={originOf.has(p.id)}
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

export function RosterBoard({ team, originOf, onTrade }: Props) {
  const byPosition = (pos: Position) =>
    team.roster
      .filter((p) => p.position === pos)
      .sort((a, b) => b.overall - a.overall)

  return (
    <div className="space-y-6">
      {GROUPS.map((row, i) => (
        <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {row.map((g) => (
            <Column
              key={g.key}
              label={g.label}
              players={byPosition(g.key)}
              team={team}
              originOf={originOf}
              onTrade={onTrade}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
