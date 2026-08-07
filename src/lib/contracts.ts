// Contract projection model. Turns a player's overall rating, age, and
// position into a market-value contract: cap-hit percentage from an
// overall-rating curve, term from an age/quality matrix, with the CBA's 20%
// max-cap-hit clamp. Transparent and tunable — an estimate, not real contract
// data.

import type { Position } from '../types'

/** 2026-27 upper limit (announced by the NHL) and a working league minimum. */
export const CAP_CEILING = 104_000_000
export const LEAGUE_MIN = 1_000_000
/** CBA: an individual cap hit may not exceed 20% of the ceiling. */
const MAX_CAP_PCT = 20

export interface ContractProjection {
  aav: number
  years: number
  total: number
  capPct: number
  clamped: boolean
}

/** Piecewise-linear cap%-of-ceiling curve anchored on overall rating. */
const CURVE: [number, number][] = [
  [60, 1.0],
  [70, 1.9],
  [75, 3.2],
  [80, 5.4],
  [85, 8.2],
  [90, 11.2],
  [95, 14.2],
  [99, 16.5],
]

function capPctFor(overall: number): number {
  if (overall <= CURVE[0][0]) return CURVE[0][1]
  for (let i = 1; i < CURVE.length; i++) {
    const [x1, y1] = CURVE[i - 1]
    const [x2, y2] = CURVE[i]
    if (overall <= x2) {
      const t = (overall - x1) / (x2 - x1)
      return y1 + t * (y2 - y1)
    }
  }
  return CURVE[CURVE.length - 1][1]
}

function termFor(overall: number, age: number): number {
  if (age <= 24) return overall >= 85 ? 8 : overall >= 76 ? 6 : 3
  if (age <= 28) return overall >= 85 ? 8 : overall >= 78 ? 6 : 4
  if (age <= 31) return overall >= 88 ? 6 : overall >= 80 ? 4 : 2
  if (age <= 34) return overall >= 85 ? 3 : 2
  return 1
}

export function projectContract(
  overall: number,
  age: number,
  position: Position,
): ContractProjection {
  let pct = capPctFor(overall)

  // Goalies are paid a hair under equivalent skaters outside the elite tier;
  // aging skaters take a discount.
  if (position === 'G' && overall < 90) pct *= 0.9
  if (age >= 35) pct *= 0.78
  else if (age >= 33) pct *= 0.9

  const clamped = pct > MAX_CAP_PCT
  if (clamped) pct = MAX_CAP_PCT

  const rawAav = Math.max(LEAGUE_MIN, (pct / 100) * CAP_CEILING)
  const aav = Math.round(rawAav / 25_000) * 25_000
  const years = termFor(overall, age)

  return {
    aav,
    years,
    total: aav * years,
    capPct: Math.round((aav / CAP_CEILING) * 1000) / 10,
    clamped,
  }
}

export function fmtMoney(n: number): string {
  if (n >= 1_000_000) {
    const m = n / 1_000_000
    return `$${m >= 10 ? m.toFixed(1) : m.toFixed(2)}M`
  }
  return `$${Math.round(n / 1000)}K`
}
