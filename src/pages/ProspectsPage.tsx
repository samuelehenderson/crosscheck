// Prospects hub: the IceMetrix prospect board (content-driven, editable like
// everything else) plus a draft lottery simulator. Lottery order comes from
// the CURRENT after-trades projections — so trades you build change the odds,
// and the machine follows the modern NHL rules: two weighted draws, winners
// jump a maximum of ten spots.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import prospectsData from '../data/prospects.json'
import { useStore } from '../store'
import { getTeam } from '../data'
import { TeamBadge } from '../components/TeamBadge'

interface Prospect {
  rank: number
  name: string
  position: string
  rights: string
  league: string
  note?: string
}

const BOARD = prospectsData as {
  updatedAt: string
  title: string
  note?: string
  items: Prospect[]
}

/** NHL lottery odds by lottery seed (worst record = seed 1), current format. */
const ODDS = [18.5, 13.5, 11.5, 9.5, 8.5, 7.5, 6.5, 6.0, 5.0, 3.5, 3.0, 2.5, 2.0, 1.5, 0.5, 0.5]
const MAX_JUMP = 10

interface LotteryResult {
  order: { teamId: string; pick: number; seed: number; jumped: boolean }[]
  winners: string[]
}

function weightedDraw(seeds: number[], exclude: Set<number>): number {
  const pool = seeds.filter((s) => !exclude.has(s))
  const total = pool.reduce((sum, s) => sum + ODDS[s], 0)
  let r = Math.random() * total
  for (const s of pool) {
    r -= ODDS[s]
    if (r <= 0) return s
  }
  return pool[pool.length - 1]
}

function runLottery(teamIds: string[]): LotteryResult {
  const seeds = teamIds.map((_, i) => i)
  const drawn = new Set<number>()

  // Two draws; a winner can move up at most MAX_JUMP spots.
  const winners: { seed: number; pick: number }[] = []
  for (let draw = 0; draw < 2; draw++) {
    const winner = weightedDraw(seeds, drawn)
    drawn.add(winner)
    const bestPick = draw + 1
    winners.push({ seed: winner, pick: Math.max(bestPick, winner + 1 - MAX_JUMP) })
  }
  // If both winners land the same pick number, the second slides one back.
  if (winners[1].pick === winners[0].pick) winners[1].pick += 1

  const winnerBySeed = new Map(winners.map((w) => [w.seed, w.pick]))
  const taken = new Set(winners.map((w) => w.pick))
  const order: LotteryResult['order'] = []

  // Winners take their picks; everyone else fills remaining slots in seed order.
  for (const w of winners) {
    order.push({ teamId: teamIds[w.seed], pick: w.pick, seed: w.seed + 1, jumped: w.pick < w.seed + 1 })
  }
  let nextPick = 1
  for (const s of seeds) {
    if (winnerBySeed.has(s)) continue
    while (taken.has(nextPick)) nextPick++
    order.push({ teamId: teamIds[s], pick: nextPick, seed: s + 1, jumped: false })
    taken.add(nextPick)
  }
  order.sort((a, b) => a.pick - b.pick)
  return { order, winners: winners.map((w) => teamIds[w.seed]) }
}

export function ProspectsPage() {
  const store = useStore()
  const [result, setResult] = useState<LotteryResult | null>(null)
  const [spins, setSpins] = useState(0)

  // Bottom 16 of the after-trades projections, worst first — the lottery field.
  const field = useMemo(() => {
    return [...store.after.entries()]
      .sort((a, b) => a[1].points - b[1].points)
      .slice(0, 16)
      .map(([teamId]) => teamId)
  }, [store.after])

  const spin = () => {
    setResult(runLottery(field))
    setSpins((n) => n + 1)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Prospects</h1>
        <p className="text-sm text-slate-400">
          The next wave — the IceMetrix board and a lottery machine that answers "what if the
          ping-pong balls love us?"
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        {/* Board */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-black text-white">{BOARD.title}</h2>
            <span className="text-[11px] text-slate-600">updated {BOARD.updatedAt}</span>
          </div>
          <div className="space-y-2">
            {BOARD.items.map((p) => {
              const team = p.rights.length === 3 ? getTeam(p.rights) : undefined
              return (
                <div
                  key={p.rank}
                  className="flex items-start gap-3 rounded-2xl border border-rink-700 bg-rink-850/60 p-3.5"
                >
                  <div className="w-8 shrink-0 text-center text-xl font-black tabular-nums text-ice-400">
                    {p.rank}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-bold text-white">{p.name}</span>
                      <span className="text-[11px] text-slate-500">
                        {p.position} · {p.league}
                      </span>
                      {team ? (
                        <Link
                          to={`/team/${team.id}`}
                          className="flex items-center gap-1 rounded-full bg-rink-700 px-1.5 py-0.5 text-[10px] font-bold text-slate-300 transition hover:text-white"
                        >
                          <TeamBadge team={team} size={14} /> {p.rights}
                        </Link>
                      ) : (
                        <span className="rounded-full bg-ice-400/15 px-1.5 py-0.5 text-[10px] font-bold text-ice-300">
                          {p.rights}
                        </span>
                      )}
                    </div>
                    {p.note && (
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{p.note}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {BOARD.note && (
            <p className="text-center text-[11px] leading-relaxed text-slate-600">{BOARD.note}</p>
          )}
        </section>

        {/* Lottery simulator */}
        <section className="space-y-3">
          <div className="rounded-2xl border border-ice-400/25 bg-gradient-to-br from-rink-850 via-rink-900 to-rink-950 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-black text-white">Draft Lottery Simulator</h2>
              <button
                onClick={spin}
                className="rounded-lg bg-ice-400 px-4 py-2 text-sm font-bold text-rink-950 transition hover:bg-ice-300"
              >
                {result ? 'Spin again' : 'Run the lottery'}
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">
              Field = the 16 teams outside the playoffs in our current projections (your pending
              trades count). Two weighted draws, ten-spot max jump — the real rules.
              {spins > 1 ? ` Spin #${spins}.` : ''}
            </p>

            <ul className="mt-4 space-y-1">
              {(result
                ? result.order
                : field.map((teamId, i) => ({ teamId, pick: i + 1, seed: i + 1, jumped: false }))
              ).map((row) => {
                const team = getTeam(row.teamId)
                if (!team) return null
                const won = result?.winners.includes(row.teamId) && row.jumped
                const moved = result ? row.seed - row.pick : 0
                return (
                  <li
                    key={row.teamId}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm ${
                      won ? 'bg-ice-400/15 ring-1 ring-ice-400/40' : ''
                    }`}
                  >
                    <span className="w-6 text-right font-black tabular-nums text-white">
                      {row.pick}
                    </span>
                    <TeamBadge team={team} size={24} />
                    <Link
                      to={`/team/${team.id}`}
                      className="min-w-0 flex-1 truncate font-medium text-slate-200 hover:text-white"
                    >
                      {team.city} {team.name}
                    </Link>
                    {!result && (
                      <span className="text-[11px] tabular-nums text-slate-500">
                        {ODDS[row.seed - 1]}%
                      </span>
                    )}
                    {result && moved > 0 && (
                      <span className="text-[11px] font-bold text-up">▲{moved}</span>
                    )}
                    {result && moved < 0 && (
                      <span className="text-[11px] font-bold text-slate-500">▼{-moved}</span>
                    )}
                  </li>
                )
              })}
            </ul>
            {result && (
              <p className="mt-3 text-center text-[11px] text-slate-600">
                Winners highlighted. Pick 1 goes to whoever the balls chose — that's the fun.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
