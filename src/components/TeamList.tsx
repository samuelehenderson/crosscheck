// Left-rail navigation: all 32 teams grouped by division, each showing its
// current projected points. Doubles as a mini power-ranking.

import { NavLink } from 'react-router-dom'
import type { Division, Team } from '../types'
import { TeamBadge } from './TeamBadge'
import { useStore } from '../store'
import { points } from '../lib/format'

const DIVISION_ORDER: Division[] = ['Atlantic', 'Metropolitan', 'Central', 'Pacific']

export function TeamList({ onNavigate }: { onNavigate?: () => void }) {
  const { baseTeams, after } = useStore()

  const byDivision = DIVISION_ORDER.map((division) => ({
    division,
    teams: baseTeams
      .filter((t) => t.division === division)
      .sort((a, b) => (after.get(b.id)?.points ?? 0) - (after.get(a.id)?.points ?? 0)),
  }))

  return (
    <nav className="space-y-5">
      {byDivision.map(({ division, teams }) => (
        <div key={division}>
          <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
            {division}
          </div>
          <ul className="space-y-0.5">
            {teams.map((t) => (
              <TeamRow key={t.id} team={t} pts={after.get(t.id)?.points ?? 0} onNavigate={onNavigate} />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

function TeamRow({ team, pts, onNavigate }: { team: Team; pts: number; onNavigate?: () => void }) {
  return (
    <li>
      <NavLink
        to={`/team/${team.id}`}
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition ${
            isActive ? 'bg-rink-800 ring-1 ring-ice-400/30' : 'hover:bg-rink-850'
          }`
        }
      >
        <TeamBadge team={team} size={26} />
        <span className="flex-1 truncate text-sm text-slate-200">{team.name}</span>
        <span className="text-xs font-semibold tabular-nums text-slate-400">{points(pts)}</span>
      </NavLink>
    </li>
  )
}
