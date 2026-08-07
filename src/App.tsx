// App shell: brand bar, left team-navigation rail, and routed content.

import { useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { TeamList } from './components/TeamList'
import { PlayerSearch } from './components/PlayerSearch'
import { RefreshButton } from './components/RefreshButton'
import { TeamPage } from './pages/TeamPage'
import { LeaguePage } from './pages/LeaguePage'
import { FreeAgentsPage } from './pages/FreeAgentsPage'
import { LeadersPage } from './pages/LeadersPage'
import { MediaPage } from './pages/MediaPage'

function BrandMark() {
  // Crossed hockey sticks over a puck — reads as a hockey emblem, not an "×".
  return (
    <div className="grid h-9 w-9 place-items-center rounded-lg bg-rink-800 ring-1 ring-ice-400/30">
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
        <g stroke="#a7cbf0" strokeWidth="2.6" strokeLinecap="round" fill="none">
          {/* left stick + blade */}
          <path d="M10 6.5 L20 22" />
          <path d="M20 22 L24.5 20.5" />
          {/* right stick + blade */}
          <path d="M22 6.5 L12 22" />
          <path d="M12 22 L7.5 20.5" />
        </g>
        <circle cx="16" cy="25.5" r="2.1" fill="#e5484d" />
      </svg>
    </div>
  )
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <BrandMark />
      <div className="leading-none">
        <div className="text-sm font-black tracking-tight text-white">CROSSCHECK</div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">NHL Trade Sim</div>
      </div>
    </Link>
  )
}


function TradeCountPill() {
  const { assets, signings, clearTrades } = useStore()
  const total = assets.length + signings.length
  if (total === 0) return null
  return (
    <button
      onClick={clearTrades}
      className="rounded-full bg-ice-400/15 px-3 py-1 text-xs font-semibold text-ice-300 ring-1 ring-ice-400/30 transition hover:bg-ice-400/25"
      title="Clear all trades and signings"
    >
      {total} move{total === 1 ? '' : 's'} · clear
    </button>
  )
}

function Shell() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-rink-800 bg-rink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 ring-1 ring-rink-700 lg:hidden"
            aria-label="Toggle team list"
          >
            ☰
          </button>
          <Brand />
          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            <Link
              to="/league"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Power Rankings
            </Link>
            <Link
              to="/free-agents"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Free Agents
            </Link>
            <Link
              to="/leaders"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Leaders
            </Link>
            <Link
              to="/media"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Media
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <RefreshButton />
            <PlayerSearch />
            <TradeCountPill />
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-5">
        {/* Sidebar */}
        <aside
          className={`${
            mobileOpen ? 'block' : 'hidden'
          } fixed inset-x-0 bottom-0 top-[57px] z-30 overflow-y-auto bg-rink-950 p-4 lg:static lg:z-0 lg:block lg:w-64 lg:shrink-0 lg:bg-transparent lg:p-0`}
        >
          <div className="lg:sticky lg:top-[73px]">
            {/* Section links — shown here on mobile since the top-bar nav is
                hidden on small screens. */}
            <div className="mb-4 flex flex-col gap-1 lg:hidden">
              <NavLink
                to="/league"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-rink-800 text-white' : 'text-slate-300 hover:bg-rink-850'
                  }`
                }
              >
                Power Rankings
              </NavLink>
              <NavLink
                to="/free-agents"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-rink-800 text-white' : 'text-slate-300 hover:bg-rink-850'
                  }`
                }
              >
                Free Agents
              </NavLink>
              <NavLink
                to="/leaders"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-rink-800 text-white' : 'text-slate-300 hover:bg-rink-850'
                  }`
                }
              >
                League Leaders
              </NavLink>
              <NavLink
                to="/media"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-rink-800 text-white' : 'text-slate-300 hover:bg-rink-850'
                  }`
                }
              >
                Media
              </NavLink>
              <div className="mt-2 px-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
                Teams
              </div>
            </div>
            <TeamList onNavigate={() => setMobileOpen(false)} />
          </div>
        </aside>

        {/* Main */}
        <main className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<Navigate to="/team/FLA" replace />} />
            <Route path="/team/:teamId" element={<TeamPage />} />
            <Route path="/league" element={<LeaguePage />} />
            <Route path="/free-agents" element={<FreeAgentsPage />} />
            <Route path="/leaders" element={<LeadersPage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="*" element={<Navigate to="/team/FLA" replace />} />
          </Routes>
        </main>
      </div>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-slate-600">
        CrossCheck · a roster & trade simulator for all 32 NHL teams · ratings are estimates
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}
