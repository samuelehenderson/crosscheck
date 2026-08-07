// The top projection card: crest, big projected-points number, the
// before → after → change table for the four headline metrics, and the
// Monte Carlo "Run Simulation" flow.

import { useEffect, useState } from 'react'
import type { Team, TeamProjection } from '../types'
import { TeamBadge } from './TeamBadge'
import { Arrow, DeltaBadge, ValuePill } from './ui'
import { delta, pct, points } from '../lib/format'
import { simulateSeasons, type SimSummary } from '../sim/monteCarlo'
import { useStore } from '../store'

interface Props {
  team: Team
  before: TeamProjection
  after: TeamProjection
  hasTrades: boolean
}

interface Row {
  label: string
  before: number
  after: number
  fmt: (n: number) => string
  /** For draft odds, "up" (fewer lottery odds) is good — invert coloring. */
  invert?: boolean
}

export function TeamHeader({ team, before, after, hasTrades }: Props) {
  const store = useStore()
  const [simulating, setSimulating] = useState(false)
  const [sim, setSim] = useState<SimSummary | null>(null)

  // A new scenario or team invalidates previous simulation results.
  useEffect(() => setSim(null), [team.id, store.assets, store.signings])

  const runSimulation = () => {
    setSimulating(true)
    // Yield a frame so the button state paints before the number crunching.
    window.setTimeout(() => {
      setSim(simulateSeasons(store.afterTeams, store.after, team.id, 500))
      setSimulating(false)
    }, 60)
  }
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
        background: `linear-gradient(135deg, ${team.colors.primary}22 0%, #13191f 45%, #090e12 100%)`,
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

          <div className="mt-4 flex items-center justify-end gap-3">
            {sim && (
              <span className="hidden text-[11px] text-slate-500 sm:block">
                {sim.sims} seasons simulated
              </span>
            )}
            <button
              onClick={runSimulation}
              disabled={simulating}
              className="rounded-lg bg-ice-400 px-4 py-2 text-sm font-semibold text-rink-950 shadow transition hover:bg-ice-300 disabled:opacity-60"
            >
              {simulating ? 'Simulating…' : sim ? 'Re-run Simulation' : 'Run Simulation'}
            </button>
          </div>
        </div>
      </div>

      {/* Monte Carlo results strip */}
      {sim && (
        <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-ice-400/20 bg-rink-900/60 p-3 sm:grid-cols-4">
          <SimStat label="Avg points" value={sim.avgPoints.toFixed(1)} sub={`${sim.pointsLow}–${sim.pointsHigh} range`} />
          <SimStat label="Made playoffs" value={`${sim.playoffPct}%`} />
          <SimStat label="Won the Cup" value={`${sim.cupPct}%`} />
          <SimStat label="Won 1st pick" value={`${sim.draftFirstPct}%`} />
        </div>
      )}
    </div>
  )
}

function SimStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="text-center">
      <div className="text-lg font-black tabular-nums text-ice-300">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">{label}</div>
      {sub && <div className="text-[10px] tabular-nums text-slate-600">{sub}</div>}
    </div>
  )
}
