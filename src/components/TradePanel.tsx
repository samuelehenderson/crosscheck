// Sidebar list of the pending scenario: trades and free-agent signings, with
// per-row remove, CLEAR all, and a Share button that copies a URL encoding the
// whole scenario.

import { useState } from 'react'
import type { Player, Signing, Team, TradeAsset } from '../types'
import { TeamBadge } from './TeamBadge'
import { SectionLabel } from './ui'

interface Props {
  assets: TradeAsset[]
  signings: Signing[]
  playerById: Map<string, Player>
  teamById: Record<string, Team>
  onRemove: (playerId: string) => void
  onRemoveSigning: (name: string) => void
  onClear: () => void
  shareUrl: () => string
}

export function TradePanel({
  assets,
  signings,
  playerById,
  teamById,
  onRemove,
  onRemoveSigning,
  onClear,
  shareUrl,
}: Props) {
  const [copied, setCopied] = useState(false)
  const total = assets.length + signings.length

  const copyShare = async () => {
    const url = shareUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Clipboard API unavailable (older browsers / http): show the URL.
      window.prompt('Copy this scenario link:', url)
    }
  }

  return (
    <div className="rounded-xl border border-rink-700 bg-rink-850/60 p-4">
      <div className="flex items-center justify-between">
        <SectionLabel>Moves ({total})</SectionLabel>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <button
              onClick={copyShare}
              className="text-[11px] font-semibold uppercase tracking-wider text-ice-300/90 transition hover:text-ice-300"
            >
              {copied ? 'Copied!' : 'Share'}
            </button>
          )}
          {total > 0 && (
            <button
              onClick={onClear}
              className="text-[11px] font-semibold uppercase tracking-wider text-down/80 transition hover:text-down"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {total === 0 ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-500">
          No moves yet. Turn on Trade mode and tap a player to trade them, or sign a free agent from
          the Free Agents page — the projections update instantly.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {signings.map((s) => {
            const to = teamById[s.toTeamId]
            if (!to) return null
            return (
              <li
                key={`sign-${s.name}`}
                className="flex items-center gap-2 rounded-lg border border-rink-700 bg-rink-800/60 p-2"
              >
                <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-full bg-amber-400/20 text-[9px] font-bold text-amber-300">
                  FA
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">{s.name}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    Signed → {to.id} · {s.position} · {s.overall} OVR
                  </div>
                </div>
                <TeamBadge team={to} size={26} />
                <button
                  onClick={() => onRemoveSigning(s.name)}
                  className="ml-1 grid h-6 w-6 place-items-center rounded text-slate-500 transition hover:bg-down/20 hover:text-down"
                  aria-label={`Remove signing of ${s.name}`}
                >
                  ✕
                </button>
              </li>
            )
          })}

          {assets.map((a) => {
            const player = playerById.get(a.playerId)
            const from = teamById[a.fromTeamId]
            const to = teamById[a.toTeamId]
            if (!player || !from || !to) return null
            return (
              <li
                key={a.playerId}
                className="flex items-center gap-2 rounded-lg border border-rink-700 bg-rink-800/60 p-2"
              >
                <TeamBadge team={from} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-slate-100">{player.name}</div>
                  <div className="truncate text-[11px] text-slate-500">
                    {from.id} <span className="text-slate-600">→</span> {to.id} · {player.position}{' '}
                    · {player.overall} OVR
                  </div>
                </div>
                <TeamBadge team={to} size={26} />
                <button
                  onClick={() => onRemove(a.playerId)}
                  className="ml-1 grid h-6 w-6 place-items-center rounded text-slate-500 transition hover:bg-down/20 hover:text-down"
                  aria-label={`Remove ${player.name} from trade`}
                >
                  ✕
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
