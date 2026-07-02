// Monte Carlo season simulator. Where the analytic engine (engine.ts) turns
// strengths into odds with closed-form formulas, this actually PLAYS OUT many
// seasons: every team's point total gets season-sized randomness, conferences
// are ranked, playoff fields are set, a Cup winner is drawn, and the draft
// lottery runs among the misses. The result is empirical odds for one team.

import type { Team } from '../types'
import type { LeagueProjection } from './engine'

export interface SimSummary {
  sims: number
  avgPoints: number
  playoffPct: number
  cupPct: number
  draftFirstPct: number
  /** 10th–90th percentile band of simulated points. */
  pointsLow: number
  pointsHigh: number
}

/** Season-to-season noise on a team's point total (injuries, luck, variance).
 *  Real NHL teams routinely swing ±10 points from "true talent". */
const POINTS_SIGMA = 7.5
const CUP_TEMP = 3.2

/** Approximate NHL draft-lottery odds for the 16 non-playoff teams,
 *  worst record first. */
const LOTTERY_ODDS = [18.5, 13.5, 11.5, 9.5, 8.5, 7.5, 6.5, 6.0, 5.0, 3.5, 3.0, 2.5, 2.0, 1.5, 0.5, 0.5]

function gaussian(): number {
  // Box–Muller
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function weightedPick(weights: number[]): number {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = Math.random() * total
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return weights.length - 1
}

export function simulateSeasons(
  teams: Team[],
  projection: LeagueProjection,
  focusTeamId: string,
  sims = 500,
): SimSummary {
  const east = teams.filter((t) => t.conference === 'Eastern')
  const west = teams.filter((t) => t.conference === 'Western')

  let ptsSum = 0
  let playoffs = 0
  let cups = 0
  let firstPicks = 0
  const focusPts: number[] = []

  for (let s = 0; s < sims; s++) {
    // 1. Season points with noise.
    const pts = new Map<string, number>()
    for (const t of teams) {
      const base = projection.get(t.id)?.points ?? 85
      pts.set(t.id, Math.max(40, Math.min(135, base + gaussian() * POINTS_SIGMA)))
    }

    // 2. Playoff fields: top 8 per conference.
    const qualifiers: Team[] = []
    const misses: Team[] = []
    for (const conf of [east, west]) {
      const ranked = [...conf].sort((a, b) => pts.get(b.id)! - pts.get(a.id)!)
      qualifiers.push(...ranked.slice(0, 8))
      misses.push(...ranked.slice(8))
    }

    // 3. Cup winner drawn among qualifiers, weighted by roster strength.
    const cupWeights = qualifiers.map((t) =>
      Math.exp((projection.get(t.id)?.strength ?? 75) / CUP_TEMP),
    )
    const champion = qualifiers[weightedPick(cupWeights)]

    // 4. Draft lottery among the misses, worst record first.
    const lotteryOrder = [...misses].sort((a, b) => pts.get(a.id)! - pts.get(b.id)!)
    const lotteryWeights = lotteryOrder.map((_, i) => LOTTERY_ODDS[i] ?? 0.5)
    const firstPick = lotteryOrder[weightedPick(lotteryWeights)]

    // 5. Tally the focus team.
    const p = pts.get(focusTeamId)!
    ptsSum += p
    focusPts.push(p)
    if (qualifiers.some((t) => t.id === focusTeamId)) playoffs++
    if (champion?.id === focusTeamId) cups++
    if (firstPick?.id === focusTeamId) firstPicks++
  }

  focusPts.sort((a, b) => a - b)
  const pct = (n: number) => Math.round((n / sims) * 1000) / 10
  return {
    sims,
    avgPoints: Math.round((ptsSum / sims) * 10) / 10,
    playoffPct: pct(playoffs),
    cupPct: pct(cups),
    draftFirstPct: pct(firstPicks),
    pointsLow: Math.round(focusPts[Math.floor(sims * 0.1)]),
    pointsHigh: Math.round(focusPts[Math.floor(sims * 0.9)]),
  }
}
