// Small formatting helpers shared across the UI.

export function pct(n: number): string {
  return `${n.toFixed(1)}%`
}

export function points(n: number): string {
  return n.toFixed(1)
}

/** 1 -> "1st", 2 -> "2nd", 23 -> "23rd". */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

export interface Delta {
  value: number
  label: string
  direction: 'up' | 'down' | 'flat'
}

/** Signed change with a direction, for rendering colored deltas. */
export function delta(before: number, after: number, digits = 1): Delta {
  const diff = after - before
  const rounded = Math.round(diff * 10 ** digits) / 10 ** digits
  const direction = rounded > 0 ? 'up' : rounded < 0 ? 'down' : 'flat'
  const sign = rounded > 0 ? '+' : ''
  return {
    value: rounded,
    label: rounded === 0 ? '—' : `${sign}${rounded.toFixed(digits)}`,
    direction,
  }
}

/** Rank change reads inverted: a lower (better) rank is an improvement. */
export function rankDelta(beforeRank: number, afterRank: number): Delta {
  const diff = afterRank - beforeRank
  const direction = diff < 0 ? 'up' : diff > 0 ? 'down' : 'flat'
  const sign = diff < 0 ? '+' : ''
  return {
    value: -diff,
    label: diff === 0 ? '—' : `${sign}${-diff}`,
    direction,
  }
}

export function initials(name: string): string {
  const parts = name.split(' ').filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
