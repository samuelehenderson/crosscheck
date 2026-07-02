// Free agents: players who played last season but aren't on any current NHL
// roster. Sortable tables (skaters with position filters, goalies), each row
// signable to a team — signings join that team's roster and move the
// projections just like trades.

import { useMemo, useState } from 'react'
import { FREE_AGENTS } from '../data'
import { useStore } from '../store'
import type { FreeAgent } from '../types'
import { initials } from '../lib/format'
import { TeamPickModal } from '../components/TeamPickModal'

type SkaterKey = 'points' | 'goals' | 'assists' | 'gamesPlayed' | 'overall'
type PosFilter = 'ALL' | 'C' | 'LW' | 'RW' | 'D'

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

function SignButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-md bg-up/15 px-2.5 py-1 text-xs font-semibold text-up ring-1 ring-up/30 transition hover:bg-up/25"
    >
      Sign
    </button>
  )
}

function SkaterTable({ skaters, onSign }: { skaters: FreeAgent[]; onSign: (fa: FreeAgent) => void }) {
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
      <table className="w-full min-w-[660px] border-collapse text-sm">
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
            <th className="px-3 py-2.5" />
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
              <td className="px-3 py-2 text-right">
                <SignButton onClick={() => onSign(p)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function GoalieTable({ goalies, onSign }: { goalies: FreeAgent[]; onSign: (fa: FreeAgent) => void }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-rink-700">
      <table className="w-full min-w-[620px] border-collapse text-sm">
        <thead>
          <tr className="bg-rink-850 text-left text-[11px] uppercase tracking-wider text-slate-500">
            <th className="px-3 py-2.5 font-semibold">#</th>
            <th className="px-3 py-2.5 font-semibold">Goalie</th>
            <th className="px-3 py-2.5 text-right font-semibold">GP</th>
            <th className="px-3 py-2.5 text-right font-semibold">Record</th>
            <th className="px-3 py-2.5 text-right font-semibold">SV%</th>
            <th className="px-3 py-2.5 text-right font-semibold">GAA</th>
            <th className="px-3 py-2.5 text-right font-semibold">OVR</th>
            <th className="px-3 py-2.5" />
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
              <td className="px-3 py-2 text-right">
                <SignButton onClick={() => onSign(g)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const POS_FILTERS: PosFilter[] = ['ALL', 'C', 'LW', 'RW', 'D']

export function FreeAgentsPage() {
  const store = useStore()
  const [signing, setSigning] = useState<FreeAgent | null>(null)
  const [posFilter, setPosFilter] = useState<PosFilter>('ALL')
  const { season } = FREE_AGENTS

  // Hide anyone already signed in the current scenario.
  const skaters = useMemo(
    () =>
      FREE_AGENTS.skaters
        .filter((p) => !store.signedNames.has(p.name))
        .filter((p) => posFilter === 'ALL' || posLabel(p.position) === posFilter),
    [store.signedNames, posFilter],
  )
  const goalies = useMemo(
    () => FREE_AGENTS.goalies.filter((g) => !store.signedNames.has(g.name)),
    [store.signedNames],
  )

  const confirmSign = (teamId: string) => {
    if (!signing) return
    store.addSigning({
      name: signing.name,
      position: signing.position,
      overall: signing.overall,
      toTeamId: teamId,
    })
    setSigning(null)
  }

  const empty = FREE_AGENTS.skaters.length === 0 && FREE_AGENTS.goalies.length === 0

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-black text-white">Free Agents</h1>
        <p className="text-sm text-slate-400">
          Players who logged NHL time in {season || 'the last season'} but aren't on any current
          roster. Tap <span className="font-semibold text-up">Sign</span> to add one to a team and
          watch the projections move.
        </p>
        <p className="mt-1 text-[11px] text-slate-600 sm:hidden">Swipe the table sideways to see all columns →</p>
      </div>

      {empty ? (
        <div className="rounded-2xl border border-dashed border-rink-700 p-8 text-center text-sm text-slate-500">
          No free-agent data yet — it populates on the next roster refresh.
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            {POS_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setPosFilter(f)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  posFilter === f
                    ? 'bg-ice-400 text-rink-950'
                    : 'bg-rink-850 text-slate-400 ring-1 ring-rink-700 hover:text-slate-200'
                }`}
              >
                {f === 'ALL' ? 'All skaters' : f}
              </button>
            ))}
          </div>

          <SkaterTable skaters={skaters} onSign={setSigning} />

          {goalies.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                Goalies
              </h2>
              <GoalieTable goalies={goalies} onSign={setSigning} />
            </div>
          )}
          <p className="text-center text-[11px] text-slate-600">
            "Free agent" = played last season but isn't currently rostered — this also includes
            retired players and those now overseas or in the minors. OVR is estimated from a 3-year,
            recency-weighted average of production; the stat columns show last season's totals.
          </p>
        </>
      )}

      {signing && (
        <TeamPickModal
          title={`Sign ${signing.name}`}
          subtitle={`${posLabel(signing.position)} · ${signing.overall} OVR — choose a team`}
          teams={store.baseTeams}
          onPick={confirmSign}
          onClose={() => setSigning(null)}
        />
      )}
    </div>
  )
}
