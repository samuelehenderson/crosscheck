// App shell: brand bar, left team-navigation rail, and routed content.

import { useState } from 'react'
import { Link, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { TeamList } from './components/TeamList'
import { PlayerSearch } from './components/PlayerSearch'
import { RefreshButton } from './components/RefreshButton'
import { ThemeToggle } from './components/ThemeToggle'
import { FeedbackButton } from './components/FeedbackButton'
import { AnnouncementBar } from './components/AnnouncementBar'
import { TeamPage } from './pages/TeamPage'
import { LeaguePage } from './pages/LeaguePage'
import { FreeAgentsPage } from './pages/FreeAgentsPage'
import { LeadersPage } from './pages/LeadersPage'
import { WirePage } from './pages/WirePage'
import { ContractsPage } from './pages/ContractsPage'
import { LandingPage } from './pages/LandingPage'
import { AdminPage } from './pages/AdminPage'

function BrandMark() {
  // Ice-crystal hexagon with a rising stat line — ice plus metrics.
  return (
    // Chip stays dark in both themes so the neon mark always pops.
    <div
      className="grid h-9 w-9 place-items-center rounded-lg ring-1 ring-[#60d4fe]/40"
      style={{ background: '#0e141a' }}
    >
      <svg viewBox="0 0 32 32" className="h-6 w-6" aria-hidden>
        <path
          d="M16 5.5 L6.9 10.75 V21.25 L16 26.5 L25.1 21.25 V10.75 Z"
          fill="none"
          stroke="#60d4fe"
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
        <path
          d="M10 20.5 L13.5 16.5 L16.5 18.3 L22 12.5"
          fill="none"
          stroke="#8ee0ff"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="22" cy="12.5" r="1.6" fill="#60d4fe" />
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
          ICE<span className="text-ice-400">METRIX</span>
        </div>
        {/* Subtitle wraps into a blob on phones — wordmark only there. */}
        <div className="hidden whitespace-nowrap text-[10px] uppercase tracking-widest text-slate-500 sm:block">
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
      className="whitespace-nowrap rounded-full bg-ice-400/15 px-3 py-1 text-xs font-semibold text-ice-300 ring-1 ring-ice-400/30 transition hover:bg-ice-400/25"
      title="Clear all trades and signings"
    >
      {total} move{total === 1 ? '' : 's'} <span className="hidden sm:inline">· clear</span>
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
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-3 py-3 sm:gap-4 sm:px-4">
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
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Power Rankings
            </Link>
            <Link
              to="/free-agents"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Free Agents
            </Link>
            <Link
              to="/leaders"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Leaders
            </Link>
            <Link
              to="/contracts"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              Contracts
            </Link>
            <Link
              to="/wire"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-rink-850 hover:text-white"
            >
              The Wire
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <FeedbackButton />
            <RefreshButton />
            <PlayerSearch />
            <TradeCountPill />
          </div>
        </div>
      </header>

      <AnnouncementBar />

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
                to="/wire"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    isActive ? 'bg-rink-800 text-white' : 'text-slate-300 hover:bg-rink-850'
                  }`
                }
              >
                The Wire
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
            <Route path="/wire" element={<WirePage />} />
            <Route path="/admin" element={<AdminPage />} />
            {/* Shared /media links keep working. */}
            <Route path="/media" element={<Navigate to="/wire" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      <footer className="mx-auto max-w-7xl px-4 py-8 text-center text-xs text-slate-600">
        IceMetrix · rosters, trades & contracts for all 32 NHL teams · ratings and dollars are
        estimates ·{' '}
        <Link to="/admin" className="text-slate-600 transition hover:text-slate-400">
          admin
        </Link>
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
