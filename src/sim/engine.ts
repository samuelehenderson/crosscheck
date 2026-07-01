// CrossCheck simulation engine.
//
// Given a league (array of teams), it derives each team's component strengths
// from player ratings, ranks every team against the field, and converts those
// strengths into projected points and playoff / Stanley Cup / draft-lottery
// odds. It is fully deterministic: the same roster always yields the same
// numbers, which is what makes the before → after trade comparison meaningful.
//
// None of this claims to be a real predictive model — it's a transparent,
// tunable heuristic. Every constant lives in TUNING below so it's easy to
// build on.

import type {
  Player,
  Team,
  TeamProjection,
  RosterRanks,
} from '../types'

const TUNING = {
  // How many players at each spot actually drive a team's rating.
  topForwards: 12,
  topDefense: 6,
  // Composite strength weights (sum ~= 1).
  weights: { offense: 0.3, finishing: 0.15, defense: 0.3, goaltending: 0.25 },
  // Strength → points mapping.
  pointsAnchor: 92, // points for a league-average team
  pointsSlope: 1.9, // points gained per point of strength above average
  pointsMin: 55,
  pointsMax: 128,
  // Odds model temperatures (lower = more concentrated on the top/bottom).
  cupTemp: 3.6,
  draftTemp: 5.5,
  playoffScale: 6, // logistic width around the playoff cutoff, in points
}

/** Weighted average where earlier (better) entries count for more. */
function topWeightedAverage(values: number[], count: number): number {
  const used = values.slice(0, count)
  if (used.length === 0) return 0
  let sum = 0
  let wSum = 0
  used.forEach((v, i) => {
    // Linearly decaying weight: the top player counts ~2x a replacement one.
    const w = 1 + (used.length - i) / used.length
    sum += v * w
    wSum += w
  })
  return sum / wSum
}

const isForward = (p: Player) => p.position === 'LW' || p.position === 'C' || p.position === 'RW'
const isDefense = (p: Player) => p.position === 'LD' || p.position === 'RD'
const isGoalie = (p: Player) => p.position === 'G'

export interface TeamStrengths {
  offense: number
  defense: number
  finishing: number
  goaltending: number
  composite: number
}

/** Raw component strengths for a single team, before league-wide ranking. */
export function computeStrengths(team: Team): TeamStrengths {
  const forwards = team.roster.filter(isForward).sort((a, b) => b.overall - a.overall)
  const defense = team.roster.filter(isDefense).sort((a, b) => b.overall - a.overall)
  const goalies = team.roster.filter(isGoalie).sort((a, b) => (b.goaltending ?? 0) - (a.goaltending ?? 0))

  const fOff = forwards.map((p) => p.offense ?? p.overall)
  const fFin = forwards.map((p) => p.finishing ?? p.overall)
  const fDef = forwards.map((p) => p.defense ?? p.overall)
  const dDef = defense.map((p) => p.defense ?? p.overall)
  const dOff = defense.map((p) => p.offense ?? p.overall)

  const offense =
    0.78 * topWeightedAverage(fOff, TUNING.topForwards) +
    0.22 * topWeightedAverage(dOff, TUNING.topDefense)

  const finishing = topWeightedAverage(fFin, 9)

  const defenseRating =
    0.62 * topWeightedAverage(dDef, TUNING.topDefense) +
    0.38 * topWeightedAverage(fDef, TUNING.topForwards)

  // Starter carries most of the load; backup is insurance.
  const g1 = goalies[0]?.goaltending ?? 60
  const g2 = goalies[1]?.goaltending ?? 55
  const goaltending = 0.74 * g1 + 0.26 * g2

  const w = TUNING.weights
  const composite =
    w.offense * offense +
    w.finishing * finishing +
    w.defense * defenseRating +
    w.goaltending * goaltending

  return { offense, defense: defenseRating, finishing, goaltending, composite }
}

/** 1-based rank of each teamId for a numeric metric (higher value = rank 1). */
function rankBy(entries: { id: string; value: number }[]): Map<string, number> {
  const sorted = [...entries].sort((a, b) => b.value - a.value)
  const ranks = new Map<string, number>()
  sorted.forEach((e, i) => ranks.set(e.id, i + 1))
  return ranks
}

function logistic(x: number): number {
  return 1 / (1 + Math.exp(-x))
}

export type LeagueProjection = Map<string, TeamProjection>

/**
 * Project every team in the league. Returns a map keyed by team id.
 * Odds are normalized so cup odds and draft-1st odds each sum to ~100% across
 * the league, which keeps the trade comparison a genuine zero-sum tradeoff.
 */
export function projectLeague(teams: Team[]): LeagueProjection {
  const strengths = new Map<string, TeamStrengths>()
  teams.forEach((t) => strengths.set(t.id, computeStrengths(t)))

  const compositeValues = teams.map((t) => strengths.get(t.id)!.composite)
  const meanComposite = compositeValues.reduce((a, b) => a + b, 0) / compositeValues.length

  // Points from composite strength.
  const points = new Map<string, number>()
  teams.forEach((t) => {
    const s = strengths.get(t.id)!.composite
    const raw = TUNING.pointsAnchor + (s - meanComposite) * TUNING.pointsSlope
    points.set(t.id, Math.max(TUNING.pointsMin, Math.min(TUNING.pointsMax, raw)))
  })

  // Component ranks across the league.
  const offRank = rankBy(teams.map((t) => ({ id: t.id, value: strengths.get(t.id)!.offense })))
  const defRank = rankBy(teams.map((t) => ({ id: t.id, value: strengths.get(t.id)!.defense })))
  const finRank = rankBy(teams.map((t) => ({ id: t.id, value: strengths.get(t.id)!.finishing })))
  const goalRank = rankBy(teams.map((t) => ({ id: t.id, value: strengths.get(t.id)!.goaltending })))

  // Playoff odds: logistic around each conference's ~8th-best points total.
  const playoffOdds = new Map<string, number>()
  ;(['Eastern', 'Western'] as const).forEach((conf) => {
    const confTeams = teams.filter((t) => t.conference === conf)
    const confPoints = confTeams.map((t) => points.get(t.id)!).sort((a, b) => b - a)
    // Cutoff sits between the 8th and 9th team in a 16-team conference.
    const cutoff = (confPoints[7] ?? confPoints[confPoints.length - 1]) - 0.5
    confTeams.forEach((t) => {
      const p = logistic((points.get(t.id)! - cutoff) / TUNING.playoffScale)
      playoffOdds.set(t.id, p * 100)
    })
  })

  // Cup odds: softmax over composite strength, then damped by playoff odds so
  // a strong team that somehow misses can't hoard cup probability.
  const expCup = teams.map((t) => {
    const s = strengths.get(t.id)!.composite
    const weighted = Math.exp(s / TUNING.cupTemp) * (playoffOdds.get(t.id)! / 100)
    return { id: t.id, e: weighted }
  })
  const cupDenom = expCup.reduce((a, b) => a + b.e, 0) || 1
  const cupOdds = new Map<string, number>()
  expCup.forEach((c) => cupOdds.set(c.id, (c.e / cupDenom) * 100))

  // Draft-1st odds: lottery favors the worst. Softmax over -points, damped by
  // the chance a team misses the playoffs (only non-playoff teams get picks).
  const expDraft = teams.map((t) => {
    const missChance = 1 - playoffOdds.get(t.id)! / 100
    const weighted = Math.exp(-points.get(t.id)! / TUNING.draftTemp) * missChance
    return { id: t.id, e: weighted }
  })
  const draftDenom = expDraft.reduce((a, b) => a + b.e, 0) || 1
  const draftOdds = new Map<string, number>()
  expDraft.forEach((d) => draftOdds.set(d.id, (d.e / draftDenom) * 100))

  const projection: LeagueProjection = new Map()
  teams.forEach((t) => {
    const ranks: RosterRanks = {
      offense: offRank.get(t.id)!,
      defense: defRank.get(t.id)!,
      finishing: finRank.get(t.id)!,
      goaltending: goalRank.get(t.id)!,
    }
    projection.set(t.id, {
      teamId: t.id,
      points: round1(points.get(t.id)!),
      playoffOdds: round1(playoffOdds.get(t.id)!),
      cupOdds: round1(cupOdds.get(t.id)!),
      draftFirstOdds: round1(draftOdds.get(t.id)!),
      ranks,
      strength: round1(strengths.get(t.id)!.composite),
    })
  })
  return projection
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
