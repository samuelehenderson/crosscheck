// App shell: brand bar, left team-navigation rail, and routed content.

import { useState } from 'react'
import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { StoreProvider, useStore } from './store'
import { TeamList } from './components/TeamList'
import { PlayerSearch } from './components/PlayerSearch'
import { TeamPage } from './pages/TeamPage'
import { LeaguePage } from './pages/LeaguePage'
import { FreeAgentsPage } from './pages/FreeAgentsPage'

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-rink-800 ring-1 ring-ice-400/30">
        <span className="text-ice-300">✕</span>
      </div>
      <div className="leading-none">
        <div className="text-sm font-black tracking-tight text-white">CROSSCHECK</div>
        <div className="text-[10px] uppercase tracking-widest text-slate-500">NHL Trade Sim</div>
      </div>
    </Link>
  )
}

function DataSourceBadge() {
  const { updatedAt } = useStore()
  const date = new Date(updatedAt)
  const label = Number.isNaN(date.getTime())
    ? 'Rosters loaded'
    : `Rosters ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  return (
    <span
      title={`Rosters last refreshed from the NHL feed on ${date.toLocaleString()}`}
      className="hidden items-center gap-1.5 rounded-full bg-rink-850 px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-rink-700 md:inline-flex"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-up" />
      {label}
    </span>
  )
}

function TradeCountPill() {
  const { assets, clearTrades } = useStore()
  if (assets.length === 0) return null
  return (
    <button
      onClick={clearTrades}
      className="rounded-full bg-ice-400/15 px-3 py-1 text-xs font-semibold text-ice-300 ring-1 ring-ice-400/30 transition hover:bg-ice-400/25"
      title="Clear all trades"
    >
      {assets.length} trade{assets.length === 1 ? '' : 's'} · clear
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
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <DataSourceBadge />
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
