// The top projection card: crest, big projected-points number, and the
// before → after → change table for the four headline metrics.

import type { Team, TeamProjection } from '../types'
import { TeamBadge } from './TeamBadge'
import { Arrow, DeltaBadge, ValuePill } from './ui'
import { delta, pct, points } from '../lib/format'

interface Props {
  team: Team
  before: TeamProjection
  after: TeamProjection
  hasTrades: boolean
  onRunSimulation: () => void
  simulating: boolean
}

interface Row {
  label: string
  before: number
  after: number
  fmt: (n: number) => string
  /** For draft odds, "up" (fewer lottery odds) is good — invert coloring. */
  invert?: boolean
}

export function TeamHeader({ team, before, after, hasTrades, onRunSimulation, simulating }: Props) {
  const rows: Row[] = [
    { label: 'Projected Points', before: before.points, after: after.points, fmt: points },
    { label: 'Playoff Odds', before: before.playoffOdds, after: after.playoffOdds, fmt: pct },
    { label: 'Stanley Cup Odds', before: before.cupOdds, after: after.cupOdds, fmt: pct },
    {
      label: 'Draft 1st Odds',
      before: before.draftFirstOdds,
      after: after.draftFirstOdds,
      fmt: pct,
      invert: true,
    },
  ]

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-rink-700 p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${team.colors.primary}22 0%, #131b2b 45%, #0e1420 100%)`,
      }}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
        {/* Crest + headline number */}
        <div className="flex items-center gap-5">
          <TeamBadge team={team} size={76} />
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
              Projected Points
            </div>
            <div className="text-xs text-slate-500">(2026-27 Projection)</div>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-5xl font-black leading-none text-white tabular-nums">
                {Math.round(after.points)}
              </span>
              <span className="text-lg font-semibold text-white/90">
                {team.city} {team.name}
              </span>
            </div>
          </div>
        </div>

        {/* Stat table */}
        <div className="flex-1 lg:pl-4">
          <div className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-2 sm:grid-cols-[1fr_auto_auto_auto_auto] sm:items-center">
            <div />
            <div className="hidden text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:block">
              Before
            </div>
            <div className="hidden sm:block" />
            <div className="hidden text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:block">
              After
            </div>
            <div className="hidden text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:block">
              Change
            </div>

            {rows.map((r) => {
              const d = delta(r.before, r.after)
              const shown = {
                ...d,
                direction: r.invert
                  ? d.direction === 'up'
                    ? 'down'
                    : d.direction === 'down'
                      ? 'up'
                      : 'flat'
                  : d.direction,
              } as typeof d
              return (
                <div key={r.label} className="contents">
                  <div className="text-xs font-medium text-slate-300 sm:text-sm">{r.label}</div>
                  <ValuePill tone="before">{r.fmt(r.before)}</ValuePill>
                  <div className="hidden sm:block">
                    <Arrow />
                  </div>
                  <ValuePill tone={hasTrades ? 'after' : 'before'}>{r.fmt(r.after)}</ValuePill>
                  <div className="text-right text-sm">
                    <DeltaBadge delta={shown} />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={onRunSimulation}
              disabled={simulating}
              className="rounded-lg bg-ice-400 px-4 py-2 text-sm font-semibold text-rink-950 shadow transition hover:bg-ice-300 disabled:opacity-60"
            >
              {simulating ? 'Simulating…' : 'Run Simulation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
