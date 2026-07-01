// A license-safe stylized crest: a two-tone shield with the team abbreviation.
// We don't ship real NHL logos; this keeps each team visually distinct using
// its actual colors.

import type { Team } from '../types'

interface Props {
  team: Team
  size?: number
  className?: string
}

export function TeamBadge({ team, size = 64, className = '' }: Props) {
  const { primary, secondary } = team.colors
  return (
    <div
      className={`relative grid place-items-center rounded-full shadow-inner ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 25%, ${primary} 0%, ${primary} 55%, ${shade(primary, -18)} 100%)`,
        border: `${Math.max(2, size * 0.045)}px solid ${secondary}`,
      }}
      aria-hidden
    >
      <span
        className="font-black tracking-tight"
        style={{
          fontSize: size * 0.34,
          color: readableOn(primary, secondary),
          textShadow: '0 1px 2px rgba(0,0,0,0.35)',
        }}
      >
        {team.id}
      </span>
    </div>
  )
}

/** Darken/lighten a hex color by a percentage (-100..100). */
function shade(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex)
  const t = percent < 0 ? 0 : 255
  const p = Math.abs(percent) / 100
  const nr = Math.round((t - r) * p) + r
  const ng = Math.round((t - g) * p) + g
  const nb = Math.round((t - b) * p) + b
  return `rgb(${nr}, ${ng}, ${nb})`
}

/** Pick whichever of white / the secondary color reads better on primary. */
function readableOn(primary: string, secondary: string): string {
  return luminance(primary) > 0.5 ? shade(primary, -70) : lightEnough(secondary) ? secondary : '#ffffff'
}

function lightEnough(hex: string): boolean {
  return luminance(hex) > 0.35
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const num = parseInt(full, 16)
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 }
}

function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}
