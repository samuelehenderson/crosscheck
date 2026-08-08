// Trade valuation: a transparent market-value model for grading deals.
// Value is exponential in overall rating (superstars are worth several good
// players — matching one is supposed to be hard), scaled by an age curve
// (peak years hold full value, veterans discount, prospects get a bump).
// These are estimates from ratings and age only — the grade is a guide to
// fairness, not gospel.

import type { Player } from '../types'

/** Market value in abstract "trade points". 80 OVR ≈ 46, 90 ≈ 316, 97 ≈ 1200. */
export function playerValue(p: Player): number {
  const base = Math.pow(10, (p.overall - 60) / 12)
  const ageFactor =
    p.age <= 21 ? 1.2 : p.age <= 24 ? 1.1 : p.age <= 28 ? 1.0 : p.age <= 31 ? 0.85 : p.age <= 34 ? 0.65 : 0.45
  return base * ageFactor
}

export function packageValue(players: Player[]): number {
  // Depth pieces don't stack linearly — the 3rd+ piece counts less, so you
  // can't buy a star with a pile of fourth-liners.
  const sorted = [...players].sort((a, b) => playerValue(b) - playerValue(a))
  return sorted.reduce((sum, p, i) => sum + playerValue(p) * (i < 2 ? 1 : 0.75), 0)
}

export interface TradeGrade {
  letter: string
  /** -1..1: positive means this side wins the deal. */
  ratio: number
  fair: boolean
}

/** Grade for the side that RECEIVES `received` and gives up `given`. */
export function gradeSide(received: number, given: number): TradeGrade {
  const ratio = (received - given) / Math.max(received, given, 1)
  const letter =
    ratio >= 0.35 ? 'A+'
    : ratio >= 0.2 ? 'A'
    : ratio >= 0.1 ? 'A-'
    : ratio >= 0.04 ? 'B+'
    : ratio >= -0.04 ? 'B'
    : ratio >= -0.1 ? 'B-'
    : ratio >= -0.2 ? 'C'
    : ratio >= -0.35 ? 'D'
    : 'F'
  return { letter, ratio, fair: Math.abs(ratio) <= 0.04 }
}

export function gradeTone(letter: string): string {
  if (letter.startsWith('A')) return 'text-up'
  if (letter.startsWith('B')) return 'text-ice-300'
  if (letter.startsWith('C')) return 'text-amber-300'
  return 'text-down'
}
