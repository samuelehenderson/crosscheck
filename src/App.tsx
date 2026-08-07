// App shell: brand bar, left team-navigation rail, and routed content.

import { useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { TeamList } from './components/TeamList'
import { PlayerSearch } from './components/PlayerSearch'
import { RefreshButton } from './components/RefreshButton'
import { TeamPage } from './pages/TeamPage'
import { LeaguePage } from './pages/LeaguePage'
import { FreeAgentsPage } from './pages/FreeAgentsPage'
import { LeadersPage } from './pages/LeadersPage'
import { MediaPage } from './pages/MediaPage'
import { ContractsPage } from './pages/ContractsPage'
import { LandingPage } from './pages/LandingPage'

function BrandMark() {
  // Neon puck with a subtle dollar cut — payroll meets the rink.
  return (
    <div className="grid h-9 w-9 place-items-center rounded-lg bg-rink-850 ring-1 ring-ice-400/40">
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
        <g stroke="#60d4fe" strokeWidth="2.2" strokeLinecap="round" fill="none">
          {/* puck, side view */}
          <ellipse cx="16" cy="12.5" rx="10" ry="4.4" />
          <path d="M6 12.5 V19 c0 2.4 4.5 4.4 10 4.4 s10-2 10-4.4 V12.5" />
        </g>
        {/* dollar tick on the puck face */}
        <path
          d="M16 15.2 V22.6 M18.1 16.6 h-3.2 a1.3 1.3 0 0 0 0 2.6 h2.2 a1.3 1.3 0 0 1 0 2.6 h-3.2"
          stroke="#8ee0ff"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  )
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <BrandMark />
      <div className="leading-none">
        <div className="text-sm font-black tracking-tight text-white">
          PUCK<span className="text-ice-400">PAYROLL</span>
        </div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">
          Rosters · Trades · Contracts
        </div>
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
  // The landing page carries its own full team grid, so the sidebar (and the
  // mobile toggle for it) only exist on inner pages.
  const isHome = useLocation().pathname === '/'

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-rink-800 bg-rink-950/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          {!isHome && (
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 ring-1 ring-rink-700 lg:hidden"
              aria-label="Toggle team list"
            >
              ☰
            </button>
          )}
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
              to="/contracts"
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Contracts
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
        {!isHome && (
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
                to="/contracts"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-rink-800 text-white' : 'text-slate-300 hover:bg-rink-850'
                  }`
                }
              >
                Contracts
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
        )}

        {/* Main */}
        <main className="min-w-0 flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/team/:teamId" element={<TeamPage />} />
            <Route path="/league" element={<LeaguePage />} />
            <Route path="/free-agents" element={<FreeAgentsPage />} />
            <Route path="/leaders" element={<LeadersPage />} />
            <Route path="/contracts" element={<ContractsPage />} />
            <Route path="/media" element={<MediaPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-slate-600">
        PuckPayroll · rosters, trades & contracts for all 32 NHL teams · ratings and dollars are
        estimates
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
