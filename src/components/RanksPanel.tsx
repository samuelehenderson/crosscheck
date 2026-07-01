// Sidebar "Roster Ranks" table: each strength category ranked 1–32 across the
// league, before → after, with the change.

import type { TeamProjection } from '../types'
import { ordinal, rankDelta } from '../lib/format'
import { Arrow, DeltaBadge } from './ui'
import { SectionLabel } from './ui'

interface Props {
  before: TeamProjection
  after: TeamProjection
  hasTrades: boolean
}

const CATEGORIES: { key: keyof TeamProjection['ranks']; label: string }[] = [
  { key: 'offense', label: 'Offense' },
  { key: 'defense', label: 'Defense' },
  { key: 'finishing', label: 'Finishing' },
  { key: 'goaltending', label: 'Goaltending' },
]

function rankTone(rank: number): string {
  if (rank <= 8) return 'bg-ice-400/20 text-ice-300 ring-ice-400/30'
  if (rank <= 20) return 'bg-rink-700 text-slate-300 ring-rink-600'
  return 'bg-down/15 text-down ring-down/30'
}

export function RanksPanel({ before, after, hasTrades }: Props) {
  return (
    <div className="rounded-xl border border-rink-700 bg-rink-850/60 p-4">
      <SectionLabel>Roster Ranks (2026-27 Projected)</SectionLabel>
      <div className="mt-3 space-y-2">
        <div className="grid grid-cols-[1fr_auto_auto_auto_3rem] items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          <div />
          <div className="text-center">Before</div>
          <div />
          <div className="text-center">After</div>
          <div className="text-right">Chg</div>
        </div>
        {CATEGORIES.map((c) => {
          const b = before.ranks[c.key]
          const a = after.ranks[c.key]
          const d = rankDelta(b, a)
          return (
            <div
              key={c.key}
              className="grid grid-cols-[1fr_auto_auto_auto_3rem] items-center gap-2 text-sm"
            >
              <div className="font-medium text-slate-300">{c.label}</div>
              <span
                className={`grid h-7 min-w-[2.6rem] place-items-center rounded px-1 text-xs font-bold ring-1 ${rankTone(b)}`}
              >
                {ordinal(b)}
              </span>
              <Arrow />
              {hasTrades ? (
                <span
                  className={`grid h-7 min-w-[2.6rem] place-items-center rounded px-1 text-xs font-bold ring-1 ${rankTone(a)}`}
                >
                  {ordinal(a)}
                </span>
              ) : (
                <span className="grid h-7 min-w-[2.6rem] place-items-center text-slate-600">—</span>
              )}
              <div className="text-right text-xs">
                {hasTrades && d.direction !== 'flat' ? <DeltaBadge delta={d} /> : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
