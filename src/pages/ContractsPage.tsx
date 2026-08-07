// Contract Engine: pick any player in the league (or build a custom one),
// tune age and overall, and get a projected market contract — AAV × term,
// cap percentage, and the CBA 20% clamp. PuckPayroll's signature tool,
// powered by this app's live rosters and ratings.

import { useMemo, useState } from 'react'
import { useStore } from '../store'
import { FREE_AGENTS } from '../data'
import type { Position } from '../types'
import { initials } from '../lib/format'
import { CAP_CEILING, fmtMoney, projectContract } from '../lib/contracts'

interface Subject {
  name: string
  position: Position
  age: number
  overall: number
  teamLabel: string
}

const POSITIONS: Position[] = ['C', 'LW', 'RW', 'LD', 'RD', 'G']

export function ContractsPage() {
  const { baseTeams } = useStore()
  const [query, setQuery] = useState('')
  const [subject, setSubject] = useState<Subject | null>(null)
  // Slider adjustments applied on top of the selected subject.
  const [age, setAge] = useState(27)
  const [overall, setOverall] = useState(85)
  const [position, setPosition] = useState<Position>('C')

  const pool = useMemo(() => {
    const rostered = baseTeams.flatMap((t) =>
      t.roster.map((p) => ({
        name: p.name,
        position: p.position,
        age: p.age,
        overall: p.overall,
        teamLabel: t.id,
      })),
    )
    const fas = [...FREE_AGENTS.skaters, ...FREE_AGENTS.goalies].map((f) => ({
      name: f.name,
      position: f.position,
      age: 30,
      overall: f.overall,
      teamLabel: 'FA',
    }))
    return [...rostered, ...fas]
  }, [baseTeams])

  const results = useMemo(() => {
    const s = query.trim().toLowerCase()
    if (!s) return []
    return pool
      .filter((p) => p.name.toLowerCase().includes(s))
      .sort((a, b) => b.overall - a.overall)
      .slice(0, 6)
  }, [pool, query])

  const pick = (p: Subject) => {
    setSubject(p)
    setAge(p.age)
    setOverall(p.overall)
    setPosition(p.position)
    setQuery('')
  }

  const custom = () => {
    setSubject({ name: 'Custom player', position, age, overall, teamLabel: '—' })
  }

  const projection = projectContract(overall, age, position)
  const capBarPct = Math.min(100, (projection.aav / CAP_CEILING) * 100 * 5) // 20% clamp = full bar

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Contract Engine</h1>
        <p className="text-sm text-slate-400">
          Project a market contract for any player — or invent one. Tune age and rating and watch
          the number move.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_1.2fr]">
        {/* Inputs */}
        <div className="space-y-4 rounded-2xl border border-rink-700 bg-rink-850/70 p-4 sm:p-5">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Find a player
            </label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search rosters and free agents…"
              className="w-full rounded-lg border border-rink-700 bg-rink-900 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-ice-400/60"
            />
            {results.length > 0 && (
              <div className="mt-1.5 overflow-hidden rounded-lg border border-rink-700 bg-rink-900">
                {results.map((p) => (
                  <button
                    key={`${p.name}-${p.teamLabel}`}
                    onClick={() => pick(p)}
                    className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition hover:bg-rink-800"
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-rink-700 text-[9px] font-bold text-slate-200">
                      {initials(p.name)}
                    </span>
                    <span className="flex-1 truncate text-sm text-slate-200">{p.name}</span>
                    <span className="text-[11px] text-slate-500">
                      {p.teamLabel} · {p.position} · {p.overall}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {subject && (
            <div className="flex items-center gap-2.5 rounded-lg border border-ice-400/30 bg-ice-400/10 px-3 py-2">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-rink-800 text-[10px] font-bold text-ice-300">
                {initials(subject.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{subject.name}</div>
                <div className="text-[11px] text-slate-400">
                  {subject.teamLabel} · {subject.position}
                </div>
              </div>
              <button
                onClick={() => setSubject(null)}
                className="text-slate-500 hover:text-slate-300"
                aria-label="Clear player"
              >
                ✕
              </button>
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Position
            </label>
            <div className="flex flex-wrap gap-1.5">
              {POSITIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    position === p
                      ? 'bg-ice-400 text-rink-950'
                      : 'bg-rink-700 text-slate-300 hover:text-white'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Age
              </label>
              <span className="text-sm font-bold tabular-nums text-white">{age}</span>
            </div>
            <input
              type="range"
              min={18}
              max={42}
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              className="w-full accent-[#60d4fe]"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                Overall rating
              </label>
              <span className="text-sm font-bold tabular-nums text-white">{overall}</span>
            </div>
            <input
              type="range"
              min={55}
              max={99}
              value={overall}
              onChange={(e) => setOverall(Number(e.target.value))}
              className="w-full accent-[#60d4fe]"
            />
          </div>

          {!subject && (
            <button
              onClick={custom}
              className="w-full rounded-lg bg-rink-700 py-2 text-sm font-semibold text-slate-200 transition hover:bg-rink-600"
            >
              Use as custom player
            </button>
          )}
        </div>

        {/* Projection */}
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-ice-400/25 bg-gradient-to-br from-rink-850 via-rink-900 to-rink-950 p-5 sm:p-6">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Projected contract{subject ? ` · ${subject.name}` : ''}
            </div>
            <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
              <span className="text-5xl font-black tabular-nums text-ice-400">
                {fmtMoney(projection.aav)}
              </span>
              <span className="pb-1 text-xl font-bold text-slate-300">
                × {projection.years} yr{projection.years > 1 ? 's' : ''}
              </span>
            </div>
            <div className="mt-1 text-sm text-slate-400">
              {fmtMoney(projection.total)} total · {projection.capPct}% of the cap
            </div>
            {projection.clamped && (
              <span className="mt-2 inline-block rounded bg-down/15 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-down ring-1 ring-down/30">
                Cap clamp applied — 20% max
              </span>
            )}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-slate-500">
              <span>Cap hit vs. {fmtMoney(CAP_CEILING)} ceiling</span>
              <span className="tabular-nums">{projection.capPct}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-rink-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-ice-400 to-ice-300 transition-all duration-300"
                style={{ width: `${capBarPct}%` }}
              />
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-600">
              Model estimate from rating, age, and position — not real contract data. Ceiling uses
              the announced 2026-27 upper limit.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
