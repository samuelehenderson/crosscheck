// Landing page. Deliberately neutral: no default team, divisions in
// alphabetical order, every club presented identically. The methodology
// section explains that one model scores all 32 teams the same way.

import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { FREE_AGENTS, STATS_SEASON } from '../data'
import { TeamBadge } from '../components/TeamBadge'
import { WirePanel } from '../components/WirePanel'
import { FavoriteTeamCard } from '../components/FavoriteTeamCard'
import type { Team } from '../types'

const DIVISIONS: Team['division'][] = ['Atlantic', 'Central', 'Metropolitan', 'Pacific']

function agoLabel(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

const FEATURES = [
  {
    to: '/league',
    title: 'Power Rankings',
    desc: 'All 32 teams ranked by the same projection model — points, playoff odds, Cup odds.',
  },
  {
    to: '/contracts',
    title: 'PuckPayroll',
    desc: 'The contract engine — project a market deal for any player: AAV × term, cap share, and the CBA 20% clamp.',
  },
  {
    to: '/free-agents',
    title: 'Free Agents',
    desc: 'Every unsigned player with real minutes last season, rated and ready to sign.',
  },
  {
    to: '/leaders',
    title: 'League Leaders',
    desc: `Live ${STATS_SEASON || 'season'} stat races across goals, assists, points, and goaltending.`,
  },
  {
    to: '/prospects',
    title: 'Prospects',
    desc: 'The IceMetrix prospect board, plus a draft lottery simulator that respects your trades.',
  },
  {
    to: '/wire',
    title: 'The Wire',
    desc: 'Live NHL headlines plus IceMetrix Media — creator articles, graphics, and reports.',
  },
]

export function LandingPage() {
  const { baseTeams, updatedAt } = useStore()
  const playerCount = baseTeams.reduce((s, t) => s + t.roster.length, 0)
  const faCount = FREE_AGENTS.skaters.length + FREE_AGENTS.goalies.length

  return (
    <div className="space-y-10">
      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-3xl border border-rink-700 px-6 py-12 sm:px-10 sm:py-16"
        style={{
          background:
            'radial-gradient(700px 360px at 85% -10%, rgba(96,212,254,.14), transparent 60%),' +
            'radial-gradient(560px 320px at -5% 110%, rgba(96,212,254,.08), transparent 55%),' +
            'var(--grad-base)',
        }}
      >
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ice-400/30 bg-ice-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-ice-300">
            Live data · updated {agoLabel(updatedAt)}
          </div>
          <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
            Trade anyone. Sign anyone.
            <br />
            <span className="text-ice-400">Watch the league shift.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-400">
            The live NHL sandbox — real rosters, stats, and injuries for all 32 clubs. Build the
            blockbuster, project the contract, and watch playoff odds move the second you pull the
            trigger.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={() =>
                document.getElementById('teams')?.scrollIntoView({ behavior: 'smooth' })
              }
              className="rounded-lg bg-ice-400 px-5 py-2.5 text-sm font-bold text-rink-950 transition hover:bg-ice-300"
            >
              Pick your team
            </button>
            <Link
              to="/wire"
              className="rounded-lg border border-rink-700 bg-rink-850 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-ice-400/40 hover:text-white"
            >
              The Wire
            </Link>
            <Link
              to="/league"
              className="rounded-lg border border-rink-700 bg-rink-850 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-ice-400/40 hover:text-white"
            >
              Power Rankings
            </Link>
            <Link
              to="/contracts"
              className="rounded-lg border border-rink-700 bg-rink-850 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-ice-400/40 hover:text-white"
            >
              PuckPayroll
            </Link>
          </div>
        </div>

        {/* Stat strip */}
        <div className="mt-10 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['32', 'teams'],
            [String(playerCount), 'rostered players'],
            [String(faCount), 'free agents'],
            ['6h', 'refresh cycle'],
          ].map(([n, label]) => (
            <div
              key={label}
              className="rounded-xl border border-rink-700 bg-rink-950/50 px-4 py-3"
            >
              <div className="text-xl font-black tabular-nums text-white">{n}</div>
              <div className="text-[11px] uppercase tracking-wider text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Your team, if you've picked one */}
      <FavoriteTeamCard />

      {/* Live news feed, front and center */}
      <WirePanel />

      {/* Team grid — alphabetical inside each division, no ordering by strength */}
      <section id="teams" className="scroll-mt-20 space-y-4">
        <div>
          <h2 className="text-xl font-black text-white">Pick a team</h2>
          <p className="text-sm text-slate-400">
            Divisions and clubs listed alphabetically — rankings live where the numbers are.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {DIVISIONS.map((div) => (
            <div key={div} className="rounded-2xl border border-rink-700 bg-rink-850/60 p-4">
              <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {div}
              </div>
              <div className="space-y-1">
                {baseTeams
                  .filter((t) => t.division === div)
                  .sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`))
                  .map((t) => (
                    <Link
                      key={t.id}
                      to={`/team/${t.id}`}
                      className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition hover:bg-rink-800"
                    >
                      <TeamBadge team={t} size={26} />
                      <span className="truncate text-sm font-medium text-slate-200">
                        {t.city} {t.name}
                      </span>
                    </Link>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="space-y-4">
        <h2 className="text-xl font-black text-white">What's inside</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Link
              key={f.to}
              to={f.to}
              className="group rounded-2xl border border-rink-700 bg-rink-850/60 p-5 transition hover:border-ice-400/40 hover:bg-rink-850"
            >
              <div className="text-base font-bold text-white group-hover:text-ice-300">
                {f.title}
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Methodology / fairness */}
      <section className="rounded-2xl border border-rink-700 bg-rink-850/60 p-6 sm:p-8">
        <h2 className="text-xl font-black text-white">How the numbers work</h2>
        <p className="mt-1 text-sm text-slate-400">
          Built to be neutral — the model doesn't know or care which sweater a player wears.
        </p>
        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {[
            [
              'One model, 32 teams',
              'Projected points, playoff odds, and Cup odds come from the same season simulation run identically for every club. No manual boosts, no house team.',
            ],
            [
              'Ratings from the stat sheet',
              'Player ratings are driven by up to three seasons of NHL data, weighted toward recent play, with small samples pulled toward league baselines so a hot ten-game stretch can’t outrank an established veteran.',
            ],
            [
              'Live league data',
              'Rosters, season stats, injuries, and the free-agent pool refresh automatically every six hours from league feeds — trades and signings show up on their own.',
            ],
            [
              'Estimates, labeled as such',
              'Ratings, projections, and contract figures are model estimates, not official numbers. When the model is uncertain, it says conservative — for everyone equally.',
            ],
          ].map(([title, body]) => (
            <div key={title}>
              <div className="text-sm font-bold text-ice-300">{title}</div>
              <p className="mt-1 text-sm leading-relaxed text-slate-400">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
