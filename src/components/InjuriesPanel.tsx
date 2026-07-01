// Sidebar panel listing a team's currently-injured players, from the ESPN
// injuries feed (refreshed by the scheduled Action).

import type { Team } from '../types'
import { initials } from '../lib/format'
import { SectionLabel } from './ui'

function tone(short: string): string {
  return short === 'DTD' || short === 'Q'
    ? 'bg-amber-400/20 text-amber-300'
    : 'bg-down/20 text-down'
}

export function InjuriesPanel({ team }: { team: Team }) {
  const injured = team.roster.filter((p) => p.injury)

  return (
    <div className="rounded-xl border border-rink-700 bg-rink-850/60 p-4">
      <SectionLabel>Injuries ({injured.length})</SectionLabel>
      {injured.length === 0 ? (
        <p className="mt-3 text-xs text-slate-500">No reported injuries.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {injured.map((p) => (
            <li key={p.id} className="flex items-center gap-2.5">
              <div
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
                style={{
                  background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.secondary})`,
                }}
              >
                {initials(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-slate-200">{p.name}</div>
                {p.injury?.detail && (
                  <div className="truncate text-[11px] text-slate-500">{p.injury.detail}</div>
                )}
              </div>
              <span
                className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${tone(
                  p.injury!.short,
                )}`}
                title={p.injury!.status}
              >
                {p.injury!.short}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
