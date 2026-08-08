// Landing-page "Your team" card: appears once a favorite is set (the star on
// any team page). Leads with the club's projection and its next game, and
// links straight in — the app opens where the user's heart is.

import { Link } from 'react-router-dom'
import { useStore } from '../store'
import { getScheduleFor, getTeam } from '../data'
import { useFavorite } from '../lib/favorite'
import { TeamBadge } from './TeamBadge'

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
}

export function FavoriteTeamCard() {
  const [fav] = useFavorite()
  const store = useStore()
  if (!fav) return null
  const team = getTeam(fav)
  const proj = store.after.get(fav)
  if (!team || !proj) return null

  const { games } = getScheduleFor(fav)
  const now = Date.now()
  const next = games.find((g) => g.usScore == null && new Date(g.startUtc).getTime() > now)
  const nextOpp = next?.opp ? getTeam(next.opp) : undefined

  return (
    <Link
      to={`/team/${team.id}`}
      className="flex flex-wrap items-center gap-4 rounded-2xl border border-amber-400/25 bg-rink-850/70 p-4 transition hover:border-amber-400/50 sm:flex-nowrap"
    >
      <TeamBadge team={team} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
          ★ Your team
        </div>
        <div className="truncate text-base font-black text-white">
          {team.city} {team.name}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Proj. pts</div>
        <div className="text-lg font-black tabular-nums text-white">{Math.round(proj.points)}</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-slate-500">Playoffs</div>
        <div className="text-lg font-black tabular-nums text-ice-300">
          {Math.round(proj.playoffOdds)}%
        </div>
      </div>
      {next && (
        <div className="flex items-center gap-2 rounded-xl bg-rink-800/70 px-3 py-2">
          {nextOpp && <TeamBadge team={nextOpp} size={26} />}
          <div className="leading-tight">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Next game</div>
            <div className="whitespace-nowrap text-xs font-semibold text-slate-200">
              {next.home ? 'vs' : '@'} {next.opp} · {fmtWhen(next.startUtc)}
            </div>
          </div>
        </div>
      )}
    </Link>
  )
}
