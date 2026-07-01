// Free agents: players who played last season but aren't on any current NHL
// roster. Two sortable tables (skaters, goalies), fed by the scheduled Action.

import { useMemo, useState } from 'react'
import { FREE_AGENTS } from '../data'
import type { FreeAgent } from '../types'
import { initials } from '../lib/format'

type SkaterKey = 'points' | 'goals' | 'assists' | 'gamesPlayed' | 'overall'

function posLabel(p: FreeAgent['position']): string {
  if (p === 'LD' || p === 'RD') return 'D'
  return p
}

function Avatar({ name }: { name: string }) {
  return (
    <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rink-700 text-[9px] font-bold text-slate-200">
      {initials(name)}
    </div>
  )
}

function SkaterTable({ skaters }: { skaters: FreeAgent[] }) {
  const [sort, setSort] = useState<SkaterKey>('points')
  const rows = useMemo(
    () => [...skaters].sort((a, b) => ((b[sort] as number) ?? 0) - ((a[sort] as number) ?? 0)),
    [skaters, sort],
  )
  const cols: { key: SkaterKey; label: string }[] = [
    { key: 'gamesPlayed', label: 'GP' },
    { key: 'goals', label: 'G' },
    { key: 'assists', label: 'A' },
    { key: 'points', label: 'P' },
    { key: 'overall', label: 'OVR' },
  ]
  return (
    <div className="overflow-x-auto rounded-2xl border border-rink-700">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr className="bg-rink-850 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-3 py-2.5 font-semibold">#</th>
            <th className="px-3 py-2.5 font-semibold">Skater</th>
            <th className="px-3 py-2.5 font-semibold">Pos</th>
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-2.5 text-right font-semibold">
                <button
                  onClick={() => setSort(c.key)}
                  className={`transition hover:text-slate-200 ${sort === c.key ? 'text-ice-300' : ''}`}
                >
                  {c.label}
                  {sort === c.key ? ' ▾' : ''}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => (
            <tr key={p.name} className="border-t border-rink-800 transition hover:bg-rink-850/60">
              <td className="px-3 py-2 font-bold tabular-nums text-slate-500">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar name={p.name} />
                  <span className="whitespace-nowrap font-medium text-slate-200">{p.name}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-slate-400">{posLabel(p.position)}</td>
              {cols.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 text-right tabular-nums ${
                    sort === c.key ? 'font-bold text-ice-300' : 'text-slate-300'
                  }`}
                >
                  {p[c.key] as number}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GoalieTable({ goalies }: { goalies: FreeAgent[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-rink-700">
      <table className="w-full min-w-[560px] border-collapse text-sm">
        <thead>
          <tr className="bg-rink-850 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-3 py-2.5 font-semibold">#</th>
            <th className="px-3 py-2.5 font-semibold">Goalie</th>
            <th className="px-3 py-2.5 text-right font-semibold">GP</th>
            <th className="px-3 py-2.5 text-right font-semibold">Record</th>
            <th className="px-3 py-2.5 text-right font-semibold">SV%</th>
            <th className="px-3 py-2.5 text-right font-semibold">GAA</th>
            <th className="px-3 py-2.5 text-right font-semibold">OVR</th>
          </tr>
        </thead>
        <tbody>
          {goalies.map((g, i) => (
            <tr key={g.name} className="border-t border-rink-800 transition hover:bg-rink-850/60">
              <td className="px-3 py-2 font-bold tabular-nums text-slate-500">{i + 1}</td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2.5">
                  <Avatar name={g.name} />
                  <span className="whitespace-nowrap font-medium text-slate-200">{g.name}</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-300">{g.gamesPlayed}</td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                {g.wins}-{g.losses}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-ice-300">
                {g.savePct != null ? `.${Math.round(g.savePct * 1000)}` : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-300">
                {g.gaa != null ? g.gaa.toFixed(2) : '—'}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-slate-300">{g.overall}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function FreeAgentsPage() {
  const { skaters, goalies, season } = FREE_AGENTS
  const empty = skaters.length === 0 && goalies.length === 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Free Agents</h1>
        <p className="text-sm text-slate-400">
          Players who logged NHL time in {season || 'the last season'} but aren't on any current
          roster.
        </p>
        <p className="mt-1 text-[11px] text-slate-600 sm:hidden">Swipe the table sideways to see all columns →</p>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-rink-700 p-8 text-center text-sm text-slate-500">
          No free-agent data yet — it populates on the next roster refresh.
        </div>
      ) : (
        <>
          <SkaterTable skaters={skaters} />
          {goalies.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Goalies
              </h2>
              <GoalieTable goalies={goalies} />
            </div>
          )}
          <p className="text-center text-[11px] text-slate-600">
            "Free agent" = played last season but isn't currently rostered — this also includes
            retired players and those now overseas or in the minors. OVR is estimated from a 3-year,
            recency-weighted average of production; the stat columns show last season's totals.
          </p>
        </>
      )}
    </div>
  )
}
