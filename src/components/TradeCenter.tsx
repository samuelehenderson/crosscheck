// The Trade Center: an NHL-game-style two-sided deal builder. Pick a trade
// partner, tap players on either roster to add them to the deal, and watch
// each side's grade move as pieces go in. Submit applies every piece through
// the store, so projections update instantly.

import { useEffect, useMemo, useState } from 'react'
import type { Player, Team } from '../types'
import { useStore } from '../store'
import { TeamBadge } from './TeamBadge'
import { initials } from '../lib/format'
import { gradeSide, gradeTone, packageValue, playerValue } from '../lib/tradeValue'

interface Props {
  team: Team
  onClose: () => void
}

function PlayerRow({
  player,
  team,
  inDeal,
  onToggle,
}: {
  player: Player
  team: Team
  inDeal: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition ${
        inDeal
          ? 'border-ice-400/50 bg-ice-400/10'
          : 'border-transparent hover:border-rink-700 hover:bg-rink-800'
      }`}
    >
      <div
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
        style={{
          background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary})`,
        }}
      >
        {initials(player.name)}
      </div>
      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-200">
        {player.name}
      </span>
      <span className="text-[10px] text-slate-500">{player.position}</span>
      <span className="w-7 text-right text-xs font-bold tabular-nums text-slate-300">
        {player.overall}
      </span>
    </button>
  )
}

function DealSide({
  label,
  team,
  players,
  onRemove,
}: {
  label: string
  team: Team
  players: Player[]
  onRemove: (id: string) => void
}) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        <TeamBadge team={team} size={16} /> {label}
      </div>
      {players.length === 0 ? (
        <div className="rounded-lg border border-dashed border-rink-700 px-2 py-3 text-center text-[11px] text-slate-600">
          Tap players below to add
        </div>
      ) : (
        <ul className="space-y-1">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-lg bg-rink-800/70 px-2 py-1 text-xs"
            >
              <span className="min-w-0 flex-1 truncate font-medium text-slate-200">{p.name}</span>
              <span className="tabular-nums text-slate-500">{Math.round(playerValue(p))}</span>
              <button
                onClick={() => onRemove(p.id)}
                className="text-slate-500 hover:text-down"
                aria-label={`Remove ${p.name}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TradeCenter({ team, onClose }: Props) {
  const store = useStore()
  const [partnerId, setPartnerId] = useState<string>('')
  const [query, setQuery] = useState('')
  const [sendA, setSendA] = useState<string[]>([])
  const [sendB, setSendB] = useState<string[]>([])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // Rosters from the after-trades world so the center always shows current owners.
  const teamA = store.afterTeams.find((t) => t.id === team.id)!
  const partner = store.afterTeams.find((t) => t.id === partnerId) ?? null

  const partners = useMemo(
    () =>
      store.afterTeams
        .filter((t) => t.id !== team.id)
        .sort((a, b) => a.city.localeCompare(b.city)),
    [store.afterTeams, team.id],
  )

  const roster = (t: Team) => [...t.roster].sort((a, b) => b.overall - a.overall)
  const byId = (t: Team) => new Map(t.roster.map((p) => [p.id, p]))

  const packageA = sendA.map((id) => byId(teamA).get(id)).filter(Boolean) as Player[]
  const packageB = partner
    ? (sendB.map((id) => byId(partner).get(id)).filter(Boolean) as Player[])
    : []

  const valueA = packageValue(packageA) // leaving team A
  const valueB = packageValue(packageB) // leaving partner
  const gradeForA = gradeSide(valueB, valueA)
  const gradeForB = gradeSide(valueA, valueB)
  const total = valueA + valueB
  const balancePct = total > 0 ? (valueB / total) * 100 : 50

  const toggle = (side: 'A' | 'B', id: string) => {
    const [list, set] = side === 'A' ? [sendA, setSendA] : [sendB, setSendB]
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id])
  }

  const submit = () => {
    if (!partner || (packageA.length === 0 && packageB.length === 0)) return
    packageA.forEach((p) =>
      store.addAsset({ playerId: p.id, fromTeamId: teamA.id, toTeamId: partner.id }),
    )
    packageB.forEach((p) =>
      store.addAsset({ playerId: p.id, fromTeamId: partner.id, toTeamId: teamA.id }),
    )
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[95vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl border border-rink-700 bg-rink-900 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-rink-700 p-4">
          <h2 className="flex-1 text-lg font-black text-white">Trade Center</h2>
          {partner && (
            <button
              onClick={() => {
                setPartnerId('')
                setSendB([])
              }}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200"
            >
              Change team
            </button>
          )}
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-rink-700 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {!partner ? (
          /* Partner picker */
          <div className="overflow-y-auto p-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Trade with
            </div>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search teams…"
              className="mb-3 w-full rounded-lg border border-rink-700 bg-rink-850 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-ice-400/50"
            />
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {partners
                .filter(
                  (t) =>
                    !query.trim() ||
                    `${t.city} ${t.name} ${t.id}`.toLowerCase().includes(query.trim().toLowerCase()),
                )
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setPartnerId(t.id)}
                    className="flex items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left transition hover:border-rink-700 hover:bg-rink-800"
                  >
                    <TeamBadge team={t} size={28} />
                    <span className="flex-1 truncate text-sm font-medium text-slate-200">
                      {t.city} {t.name}
                    </span>
                    <span className="text-[11px] uppercase tracking-wider text-slate-500">{t.id}</span>
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <>
            {/* The deal */}
            <div className="space-y-3 border-b border-rink-700 p-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <DealSide
                  label={`${teamA.id} send`}
                  team={teamA}
                  players={packageA}
                  onRemove={(id) => toggle('A', id)}
                />
                <div className="hidden items-center text-slate-600 sm:flex">⇄</div>
                <DealSide
                  label={`${partner.id} send`}
                  team={partner}
                  players={packageB}
                  onRemove={(id) => toggle('B', id)}
                />
              </div>

              {/* Grades + balance */}
              <div className="flex items-center gap-3">
                <div className="w-16 text-center">
                  <div className={`text-2xl font-black ${gradeTone(gradeForA.letter)}`}>
                    {packageA.length + packageB.length ? gradeForA.letter : '—'}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">
                    {teamA.id} grade
                  </div>
                </div>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-rink-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-ice-400 to-ice-300 transition-all duration-300"
                      style={{ width: `${balancePct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] tabular-nums text-slate-600">
                    <span>{teamA.id} gives {Math.round(valueA)}</span>
                    {gradeForA.fair && (packageA.length + packageB.length) > 0 && (
                      <span className="font-bold uppercase tracking-wider text-up">Fair deal</span>
                    )}
                    <span>{partner.id} gives {Math.round(valueB)}</span>
                  </div>
                </div>
                <div className="w-16 text-center">
                  <div className={`text-2xl font-black ${gradeTone(gradeForB.letter)}`}>
                    {packageA.length + packageB.length ? gradeForB.letter : '—'}
                  </div>
                  <div className="text-[9px] uppercase tracking-widest text-slate-600">
                    {partner.id} grade
                  </div>
                </div>
              </div>
            </div>

            {/* Rosters */}
            <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden p-4">
              {[
                { t: teamA, side: 'A' as const, chosen: sendA },
                { t: partner, side: 'B' as const, chosen: sendB },
              ].map(({ t, side, chosen }) => (
                <div key={t.id} className="flex min-h-0 flex-col">
                  <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-slate-300">
                    <TeamBadge team={t} size={20} /> {t.city} {t.name}
                  </div>
                  <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain pr-1">
                    {roster(t).map((p) => (
                      <PlayerRow
                        key={p.id}
                        player={p}
                        team={t}
                        inDeal={chosen.includes(p.id)}
                        onToggle={() => toggle(side, p.id)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-3 border-t border-rink-700 p-4">
              <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-slate-600">
                Values are model estimates from rating and age. Depth pieces count less toward a
                star — just like real front offices treat them.
              </p>
              <button
                onClick={submit}
                disabled={packageA.length === 0 && packageB.length === 0}
                className="rounded-lg bg-ice-400 px-5 py-2.5 text-sm font-bold text-rink-950 transition hover:bg-ice-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit trade
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
