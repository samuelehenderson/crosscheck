// League Leaders: last season's top producers among currently-rostered
// players, straight from the attached NHL stat lines.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TEAMS, STATS_SEASON } from '../data'
import type { Player, Team } from '../types'
import { TeamBadge } from '../components/TeamBadge'
import { initials } from '../lib/format'

interface Row {
  player: Player
  team: Team
}

type SkaterCat = 'points' | 'goals' | 'assists'

const CATS: { key: SkaterCat; label: string }[] = [
  { key: 'points', label: 'Points' },
  { key: 'goals', label: 'Goals' },
  { key: 'assists', label: 'Assists' },
]

export function LeadersPage() {
  const [cat, setCat] = useState<SkaterCat>('points')

  const { skaters, goalies } = useMemo(() => {
    const sk: Row[] = []
    const go: Row[] = []
    for (const team of TEAMS) {
      for (const player of team.roster) {
        if (!player.stats || !player.stats.gamesPlayed) continue
        if (player.position === 'G') go.push({ player, team })
        else sk.push({ player, team })
      }
    }
    return { skaters: sk, goalies: go }
  }, [])

  const topSkaters = useMemo(
    () =>
      [...skaters]
        .sort((a, b) => ((b.player.stats?.[cat] as number) ?? 0) - ((a.player.stats?.[cat] as number) ?? 0))
        .slice(0, 15),
    [skaters, cat],
  )

  const topGoalies = useMemo(
    () =>
      goalies
        .filter((r) => (r.player.stats?.gamesPlayed ?? 0) >= 15 && r.player.stats?.savePct != null)
        .sort((a, b) => (b.player.stats!.savePct ?? 0) - (a.player.stats!.savePct ?? 0))
        .slice(0, 10),
    [goalies],
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">League Leaders</h1>
        <p className="text-sm text-slate-400">
          {STATS_SEASON || 'Last season'} leaders among currently-rostered players.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {CATS.map((c) => (
          <button
            key={c.key}
            onClick={() => setCat(c.key)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              cat === c.key
                ? 'bg-ice-400 text-rink-950'
                : 'bg-rink-850 text-slate-400 ring-1 ring-rink-700 hover:text-slate-200'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-rink-700">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="bg-rink-850 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Player</th>
              <th className="px-3 py-2.5 font-semibold">Team</th>
              <th className="px-3 py-2.5 text-right font-semibold">GP</th>
              <th className="px-3 py-2.5 text-right font-semibold">G</th>
              <th className="px-3 py-2.5 text-right font-semibold">A</th>
              <th className="px-3 py-2.5 text-right font-semibold">P</th>
            </tr>
          </thead>
          <tbody>
            {topSkaters.map(({ player, team }, i) => (
              <tr key={player.id} className="border-t border-rink-800 transition hover:bg-rink-850/60">
                <td className="px-3 py-2 font-bold tabular-nums text-slate-500">{i + 1}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary})`,
                      }}
                    >
                      {initials(player.name)}
                    </div>
                    <span className="whitespace-nowrap font-medium text-slate-200">{player.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Link to={`/team/${team.id}`} className="flex items-center gap-1.5 text-slate-400 hover:text-white">
                    <TeamBadge team={team} size={22} />
                    {team.id}
                  </Link>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-slate-300">{player.stats!.gamesPlayed}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${cat === 'goals' ? 'font-bold text-ice-300' : 'text-slate-300'}`}>
                  {player.stats!.goals}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${cat === 'assists' ? 'font-bold text-ice-300' : 'text-slate-300'}`}>
                  {player.stats!.assists}
                </td>
                <td className={`px-3 py-2 text-right tabular-nums ${cat === 'points' ? 'font-bold text-ice-300' : 'text-slate-300'}`}>
                  {player.stats!.points}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
          Goalies · SV% (min 15 GP)
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-rink-700">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="bg-rink-850 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2.5 font-semibold">#</th>
                <th className="px-3 py-2.5 font-semibold">Goalie</th>
                <th className="px-3 py-2.5 font-semibold">Team</th>
                <th className="px-3 py-2.5 text-right font-semibold">GP</th>
                <th className="px-3 py-2.5 text-right font-semibold">Record</th>
                <th className="px-3 py-2.5 text-right font-semibold">SV%</th>
                <th className="px-3 py-2.5 text-right font-semibold">GAA</th>
                <th className="px-3 py-2.5 text-right font-semibold">SO</th>
              </tr>
            </thead>
            <tbody>
              {topGoalies.map(({ player, team }, i) => {
                const s = player.stats!
                return (
                  <tr key={player.id} className="border-t border-rink-800 transition hover:bg-rink-850/60">
                    <td className="px-3 py-2 font-bold tabular-nums text-slate-500">{i + 1}</td>
                    <td className="px-3 py-2">
                      <span className="whitespace-nowrap font-medium text-slate-200">{player.name}</span>
                    </td>
                    <td className="px-3 py-2">
                      <Link to={`/team/${team.id}`} className="flex items-center gap-1.5 text-slate-400 hover:text-white">
                        <TeamBadge team={team} size={22} />
                        {team.id}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">{s.gamesPlayed}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                      {s.wins}-{s.losses}
                    </td>
                    <td className="px-3 py-2 text-right font-bold tabular-nums text-ice-300">
                      {s.savePct != null ? `.${Math.round(s.savePct * 1000)}` : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                      {s.gaa != null ? s.gaa.toFixed(2) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-300">{s.shutouts ?? 0}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
