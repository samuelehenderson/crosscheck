// Team crest. Prefers the NHL's official logo SVG (served from their public
// CDN) and falls back to a license-safe, color-coded lettermark if the logo
// can't load. The logos are NHL trademarks — displayed here from the league's
// own assets, intended for personal/non-commercial use.

import { useState } from 'react'
import type { Team } from '../types'

interface Props {
  team: Team
  size?: number
  className?: string
}

function logoUrl(teamId: string): string {
  return `https://assets.nhle.com/logos/nhl/svg/${teamId}_light.svg`
}

export function TeamBadge({ team, size = 64, className = '' }: Props) {
  const [useFallback, setUseFallback] = useState(false)

  if (!useFallback) {
    // No circular chrome — the logo art has its own shape, so filling the box
    // makes it read at full size instead of floating in a padded circle.
    return (
      <div
        className={`grid shrink-0 place-items-center ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={logoUrl(team.id)}
          alt={`${team.city} ${team.name}`}
          onError={() => setUseFallback(true)}
          loading="lazy"
          style={{ width: size, height: size, objectFit: 'contain' }}
        />
      </div>
    )
  }

  return <LetterCrest team={team} size={size} className={className} />
}

/** The original two-tone lettermark, used when the official logo is unavailable. */
function LetterCrest({ team, size, className }: Props & { size: number }) {
  const { primary, secondary } = team.colors
  return (
    <div
      className={`relative grid shrink-0 place-items-center rounded-full shadow-inner ${className}`}
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
