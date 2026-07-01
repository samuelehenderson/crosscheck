// App-wide state: the base league plus any pending trades, and the two league
// projections (before = base, after = base + trades) that drive the UI.
//
// Trades persist to localStorage so a work-in-progress trade board survives a
// refresh. Everything downstream reads from this one context.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { TEAMS, normalizeTeams, type RawTeam } from './data'
import type { Team, TradeAsset } from './types'
import { projectLeague } from './sim/engine'
import { applyTrades } from './sim/trades'

const STORAGE_KEY = 'crosscheck.trades.v1'

/** Where the currently-displayed rosters came from. */
export type DataSource = 'loading' | 'live' | 'seed'

interface StoreValue {
  /** The unmodified base league. */
  baseTeams: Team[]
  /** The league after pending trades are applied. */
  afterTeams: Team[]
  assets: TradeAsset[]
  addAsset: (asset: TradeAsset) => void
  removeAsset: (playerId: string) => void
  clearTrades: () => void
  /** Projection maps keyed by team id. */
  before: ReturnType<typeof projectLeague>
  after: ReturnType<typeof projectLeague>
  /** playerId -> origin team id, for players moved by a trade. */
  originOf: Map<string, string>
  /** playerId -> current team id after trades. */
  ownerOf: Map<string, string>
  hasTrades: boolean
  /** Live-data status for the freshness indicator. */
  dataSource: DataSource
}

const StoreContext = createContext<StoreValue | null>(null)

function loadAssets(): TradeAsset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<TradeAsset[]>(loadAssets)
  const [teams, setTeams] = useState<Team[]>(TEAMS)
  const [dataSource, setDataSource] = useState<DataSource>('loading')

  // Pull live rosters from our serverless proxy once on mount. The bundled
  // seed renders instantly; if the live feed answers we swap it in, otherwise
  // we quietly stay on the seed.
  useEffect(() => {
    let cancelled = false
    fetch('/api/rosters')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('bad status'))))
      .then((payload: RawTeam[] | { source?: string; teams?: RawTeam[] }) => {
        if (cancelled) return
        // Accept both the legacy array shape and the { source, teams } shape.
        const raw = Array.isArray(payload) ? payload : payload.teams
        const source = Array.isArray(payload) ? 'live' : payload.source
        if (!raw || raw.length < 30) {
          setDataSource('seed')
          return
        }
        setTeams(normalizeTeams(raw))
        // Trust the server's honest source; only 'seed' means no live data.
        setDataSource(source === 'seed' ? 'seed' : 'live')
      })
      .catch(() => {
        if (!cancelled) setDataSource('seed')
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(assets))
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, [assets])

  const addAsset = useCallback((asset: TradeAsset) => {
    setAssets((prev) => {
      // A player can only be moving to one place; replace any existing move.
      const without = prev.filter((a) => a.playerId !== asset.playerId)
      // Moving a player back to their own team is a no-op removal.
      if (asset.fromTeamId === asset.toTeamId) return without
      return [...without, asset]
    })
  }, [])

  const removeAsset = useCallback((playerId: string) => {
    setAssets((prev) => prev.filter((a) => a.playerId !== playerId))
  }, [])

  const clearTrades = useCallback(() => setAssets([]), [])

  const applied = useMemo(() => applyTrades(teams, assets), [teams, assets])
  const before = useMemo(() => projectLeague(teams), [teams])
  const after = useMemo(() => projectLeague(applied.teams), [applied])

  const value: StoreValue = {
    baseTeams: teams,
    afterTeams: applied.teams,
    assets,
    addAsset,
    removeAsset,
    clearTrades,
    before,
    after,
    originOf: applied.originOf,
    ownerOf: applied.ownerOf,
    hasTrades: assets.length > 0,
    dataSource,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
