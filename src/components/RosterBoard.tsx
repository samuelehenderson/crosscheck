// The roster as a lines board: forwards in labeled lines (LW / C / RW),
// defense in pairs, goalies as starter and backup. Forward columns come from
// the depth-chart builder, which shifts surplus natural centers to the wings
// the way real lineups do. Line 1 is the top-rated trio; below four lines
// everyone lands in Depth.

import { useMemo } from 'react'
import type { Player, Position, Team } from '../types'
import { PlayerCard } from './PlayerCard'
import { buildForwardLines, type Slotted } from '../lib/depthChart'

interface Props {
  team: Team
  newIds: Set<string>
  onTrade?: (player: Player) => void
}

function Card({
  slot,
  tag,
  team,
  newIds,
  onTrade,
}: {
  slot: Slotted | undefined
  /** Position tag shown only on mobile, where the column headers are hidden. */
  tag: string
  team: Team
  newIds: Set<string>
  onTrade?: (player: Player) => void
}) {
  // Empty slots only make sense in the aligned desktop grid — on mobile the
  // stacked list just skips them.
  if (!slot)
    return (
      <div className="hidden min-h-[52px] place-items-center rounded-lg border border-dashed border-rink-700 text-xs text-slate-600 sm:grid">
        —
      </div>
    )
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 shrink-0 text-right text-[9px] font-bold uppercase tracking-wide text-slate-600 sm:hidden">
        {tag}
      </span>
      <div className="min-w-0 flex-1">
        <PlayerCard
          player={slot.player}
          team={team}
          isNew={newIds.has(slot.player.id)}
          shiftedFrom={slot.shiftedFrom}
          onTrade={onTrade}
        />
      </div>
    </div>
  )
}

function RowLabel({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-2 pt-1">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {children}
      </span>
      <span className="h-px flex-1 bg-rink-700" />
    </div>
  )
}

function ColHeads({ labels }: { labels: string[] }) {
  // Hidden on mobile, where cards stack and carry their own position tags.
  return (
    <div className={`hidden gap-3 sm:grid ${labels.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
      {labels.map((l) => (
        <div
          key={l}
          className="text-center text-[11px] font-semibold uppercase tracking-widest text-slate-400"
        >
          {l}
        </div>
      ))}
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

  const ld = byPosition('LD')
  const rd = byPosition('RD')
  const goalies = byPosition('G')

  const fRows = Math.max(lines.LW.length, lines.C.length, lines.RW.length)
  const dRows = Math.max(ld.length, rd.length)

  const fLabel = (i: number) => (i < 4 ? `Line ${i + 1}` : i === 4 ? 'Depth' : null)
  const dLabel = (i: number) => (i < 3 ? `Pair ${i + 1}` : i === 3 ? 'Depth' : null)
  const gLabel = (i: number) => (i === 0 ? 'Starter' : i === 1 ? 'Backup' : null)

  const shared = { team, newIds, onTrade }

  return (
    <div className="space-y-6">
      {/* Forwards */}
      <div className="space-y-2">
        <ColHeads labels={['Left Wing', 'Center', 'Right Wing']} />
        {Array.from({ length: fRows }, (_, i) => (
          <div key={i} className="space-y-2">
            {fLabel(i) && <RowLabel>{fLabel(i)!}</RowLabel>}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
              <Card slot={lines.LW[i]} tag="LW" {...shared} />
              <Card slot={lines.C[i]} tag="C" {...shared} />
              <Card slot={lines.RW[i]} tag="RW" {...shared} />
            </div>
          </div>
        ))}
      </div>

      {/* Defense + goalies */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <ColHeads labels={['Left Defense', 'Right Defense']} />
          {Array.from({ length: dRows }, (_, i) => (
            <div key={i} className="space-y-2">
              {dLabel(i) && <RowLabel>{dLabel(i)!}</RowLabel>}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <Card slot={ld[i]} tag="LD" {...shared} />
                <Card slot={rd[i]} tag="RD" {...shared} />
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <ColHeads labels={['Goalie']} />
          {goalies.map((g, i) => (
            <div key={g.player.id} className="space-y-2">
              {gLabel(i) && <RowLabel>{gLabel(i)!}</RowLabel>}
              <Card slot={g} tag="G" {...shared} />
            </div>
          ))}
          {goalies.length === 0 && <Card slot={undefined} tag="G" {...shared} />}
        </div>
      </div>
    </div>
  )
}
