// League-wide power rankings — a sortable table of all 32 teams by the
// projected metrics. This is the first "build on top" surface beyond a single
// team view.

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { TeamBadge } from '../components/TeamBadge'
import { pct, points } from '../lib/format'
import type { TeamProjection } from '../types'

type SortKey = 'points' | 'playoffOdds' | 'cupOdds' | 'strength'

const COLUMNS: { key: SortKey; label: string; fmt: (p: TeamProjection) => string }[] = [
  { key: 'points', label: 'Proj. Pts', fmt: (p) => points(p.points) },
  { key: 'playoffOdds', label: 'Playoff %', fmt: (p) => pct(p.playoffOdds) },
  { key: 'cupOdds', label: 'Cup %', fmt: (p) => pct(p.cupOdds) },
  { key: 'strength', label: 'Strength', fmt: (p) => p.strength.toFixed(1) },
]

export function LeaguePage() {
  const { baseTeams, after } = useStore()
  const [sort, setSort] = useState<SortKey>('points')

  const rows = useMemo(() => {
    return baseTeams
      .map((t) => ({ team: t, proj: after.get(t.id)! }))
      .sort((a, b) => b.proj[sort] - a.proj[sort])
  }, [baseTeams, after, sort])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black text-white">Power Rankings</h1>
        <p className="text-sm text-slate-400">
          All 32 teams by projected strength, including any pending trades.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-rink-700">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-rink-850 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2.5 font-semibold">#</th>
              <th className="px-3 py-2.5 font-semibold">Team</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className="px-3 py-2.5 text-right font-semibold">
                  <button
                    onClick={() => setSort(c.key)}
                    className={`transition hover:text-slate-200 ${
                      sort === c.key ? 'text-ice-300' : ''
                    }`}
                  >
                    {c.label}
                    {sort === c.key ? ' ▾' : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ team, proj }, i) => (
              <tr
                key={team.id}
                className="border-t border-rink-800 transition hover:bg-rink-850/60"
              >
                <td className="px-3 py-2 font-bold tabular-nums text-slate-500">{i + 1}</td>
                <td className="px-3 py-2">
                  <Link to={`/team/${team.id}`} className="flex items-center gap-2.5 group">
                    <TeamBadge team={team} size={26} />
                    <span className="font-medium text-slate-200 group-hover:text-white">
                      {team.city} {team.name}
                    </span>
                  </Link>
                </td>
                {COLUMNS.map((c) => (
                  <td
                    key={c.key}
                    className={`px-3 py-2 text-right tabular-nums ${
                      sort === c.key ? 'font-bold text-ice-300' : 'text-slate-300'
                    }`}
                  >
                    {c.fmt(proj)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
