// App-wide state: the base league plus any pending trades, and the two league
// projections (before = base, after = base + trades) that drive the UI.
//
// The base rosters are bundled from src/data (kept current by the scheduled
// "Refresh rosters" GitHub Action, which pulls the live NHL feed and commits
// updates). Trades persist to localStorage so a work-in-progress trade board
// survives a refresh.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { TEAMS, UPDATED_AT } from './data'
import type { Team, TradeAsset } from './types'
import { projectLeague } from './sim/engine'
import { applyTrades } from './sim/trades'

const STORAGE_KEY = 'crosscheck.trades.v1'

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
  /** ISO timestamp of when the bundled rosters were last refreshed. */
  updatedAt: string
  /** When true, clicking a roster player opens the trade flow. */
  tradeMode: boolean
  setTradeMode: (v: boolean) => void
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
  const [tradeMode, setTradeMode] = useState(false)

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

  const applied = useMemo(() => applyTrades(TEAMS, assets), [assets])
  const before = useMemo(() => projectLeague(TEAMS), [])
  const after = useMemo(() => projectLeague(applied.teams), [applied])

  const value: StoreValue = {
    baseTeams: TEAMS,
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
    updatedAt: UPDATED_AT,
    tradeMode,
    setTradeMode,
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within a StoreProvider')
  return ctx
}
