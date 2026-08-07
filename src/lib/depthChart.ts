// Forward-line depth chart. The NHL feed lists every player's NATURAL
// position, and most wingers grew up as centers — so raw rosters show 8-10
// "centers" and near-empty wings. Real teams do what this does: keep the best
// centers down the middle and shift the surplus to a wing. Only the displayed
// lineup moves; the player's natural position (used for ratings, contracts,
// and free agency) is untouched.

import type { Player, Position } from '../types'

export interface Slotted {
  player: Player
  /** Natural position, set only when the player is slotted away from it. */
  shiftedFrom?: Position
}

export interface ForwardLines {
  LW: Slotted[]
  C: Slotted[]
  RW: Slotted[]
}

const byOverall = (a: Player, b: Player) => b.overall - a.overall

export function buildForwardLines(roster: Player[]): ForwardLines {
  const naturals = {
    LW: roster.filter((p) => p.position === 'LW').sort(byOverall),
    C: roster.filter((p) => p.position === 'C').sort(byOverall),
    RW: roster.filter((p) => p.position === 'RW').sort(byOverall),
  }
  const total = naturals.LW.length + naturals.C.length + naturals.RW.length

  // A four-line team runs about a third of its forwards at center.
  const targetC = Math.min(naturals.C.length, Math.max(1, Math.round(total / 3)))

  const C: Slotted[] = naturals.C.slice(0, targetC).map((player) => ({ player }))
  const LW: Slotted[] = naturals.LW.map((player) => ({ player }))
  const RW: Slotted[] = naturals.RW.map((player) => ({ player }))

  // Surplus centers fill whichever wing is thinner (ties go left).
  for (const player of naturals.C.slice(targetC)) {
    const side = LW.length <= RW.length ? LW : RW
    side.push({ player, shiftedFrom: 'C' })
  }

  // If the wings are still lopsided (e.g. six natural LWs, two RWs), move the
  // lowest-rated extras to their off wing until they're within one.
  const rebalance = (from: Slotted[], to: Slotted[], pos: Position) => {
    while (from.length - to.length > 1) {
      const idx = from.reduce(
        (lo, s, i) => (s.player.overall < from[lo].player.overall ? i : lo),
        0,
      )
      const [moved] = from.splice(idx, 1)
      to.push({ player: moved.player, shiftedFrom: moved.shiftedFrom ?? pos })
    }
  }
  rebalance(LW, RW, 'LW')
  rebalance(RW, LW, 'RW')

  const sortCol = (col: Slotted[]) => col.sort((a, b) => byOverall(a.player, b.player))
  return { LW: sortCol(LW), C: sortCol(C), RW: sortCol(RW) }
}
