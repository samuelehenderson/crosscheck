// App-wide state: the base league plus any pending moves (trades AND free-agent
// signings), and the two league projections (before = reality, after = your
// scenario) that drive the UI.
//
// The base rosters are bundled from src/data (kept current by the scheduled
// "Refresh rosters" GitHub Action). Trades and signings persist to
// localStorage, and a whole scenario can be encoded into a shareable URL
// (?sc=...) that hydrates on load.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { TEAMS, UPDATED_AT, getInjury, getStats, slug } from './data'
import type { Player, Position, Signing, Team, TradeAsset } from './types'
import { projectLeague } from './sim/engine'
import { applyTrades } from './sim/trades'

const TRADES_KEY = 'crosscheck.trades.v1'
const SIGNINGS_KEY = 'crosscheck.signings.v1'

interface StoreValue {
  /** The league including pending signings (what trades operate on). */
  baseTeams: Team[]
  /** The league after all pending trades + signings are applied. */
  afterTeams: Team[]
  assets: TradeAsset[]
  addAsset: (asset: TradeAsset) => void
  removeAsset: (playerId: string) => void
  signings: Signing[]
  addSigning: (s: Signing) => void
  removeSigning: (name: string) => void
  /** Clear the whole scenario (trades and signings). */
  clearTrades: () => void
  /** Projection maps keyed by team id. */
  before: ReturnType<typeof projectLeague>
  after: ReturnType<typeof projectLeague>
  /** playerId -> origin team id, for players moved by a trade. */
  originOf: Map<string, string>
  /** playerId -> current team id after trades. */
  ownerOf: Map<string, string>
  /** Ids of players added via free-agent signings. */
  signedIds: Set<string>
  /** Normalized "is this FA already signed" check by name. */
  signedNames: Set<string>
  /** True when the scenario has any trade or signing. */
  hasTrades: boolean
  /** Encode the current scenario as a shareable URL. */
  shareUrl: () => string
  /** ISO timestamp of when the bundled rosters were last refreshed. */
  updatedAt: string
  /** When true, clicking a roster player opens the trade flow. */
  tradeMode: boolean
  setTradeMode: (v: boolean) => void
}

const StoreContext = createContext<StoreValue | null>(null)

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) === Array.isArray(fallback) ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* ignore quota / private-mode errors */
  }
}

export function signingPlayerId(name: string): string {
  return `fa-${slug(name)}`
}

/** Materialize a signed free agent as a roster Player. Component ratings are
 *  spread from the overall (signings only carry an overall). */
function signingToPlayer(s: Signing): Player {
  const isG = s.position === 'G'
  const isD = s.position === 'LD' || s.position === 'RD'
  const c = (n: number) => Math.max(40, Math.min(99, Math.round(n)))
  return {
    id: signingPlayerId(s.name),
    name: s.name,
    position: s.position,
    age: 30,
    overall: s.overall,
    offense: isG ? null : c(s.overall + (isD ? -4 : 2)),
    defense: isG ? null : c(s.overall + (isD ? 4 : -6)),
    finishing: isG ? null : c(s.overall - (isD ? 8 : 1)),
    goaltending: isG ? s.overall : null,
    stats: getStats(s.name),
    injury: getInjury(s.name),
  }
}

// --- Shareable scenario encoding -------------------------------------------

interface ScenarioPayload {
  /** trades: [playerId, toTeamId] */
  t: [string, string][]
  /** signings: [name, position, overall, toTeamId] */
  s: [string, string, number, string][]
}

function encodeScenario(assets: TradeAsset[], signings: Signing[]): string {
  const payload: ScenarioPayload = {
    t: assets.map((a) => [a.playerId, a.toTeamId]),
    s: signings.map((s) => [s.name, s.position, s.overall, s.toTeamId]),
  }
  const json = JSON.stringify(payload)
  const b64 = btoa(String.fromCharCode(...new TextEncoder().encode(json)))
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function decodeScenario(sc: string): { assets: TradeAsset[]; signings: Signing[] } | null {
  try {
    const b64 = sc.replace(/-/g, '+').replace(/_/g, '/')
    const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes)) as ScenarioPayload

    const signings: Signing[] = (payload.s ?? []).map(([name, position, overall, toTeamId]) => ({
      name,
      position: position as Position,
      overall,
      toTeamId,
    }))

    // Rebuild ownership (base rosters + signings) so fromTeamId is derivable.
    const owner = new Map<string, string>()
    TEAMS.forEach((t) => t.roster.forEach((p) => owner.set(p.id, t.id)))
    signings.forEach((s) => owner.set(signingPlayerId(s.name), s.toTeamId))

    const assets: TradeAsset[] = []
    for (const [playerId, toTeamId] of payload.t ?? []) {
      const fromTeamId = owner.get(playerId)
      if (!fromTeamId || fromTeamId === toTeamId) continue
      assets.push({ playerId, fromTeamId, toTeamId })
    }
    return { assets, signings }
  } catch {
    return null
  }
}

/** Read (and strip) a ?sc= scenario from the current hash URL. */
function consumeSharedScenario(): { assets: TradeAsset[]; signings: Signing[] } | null {
  const hash = window.location.hash
  const q = hash.indexOf('?')
  if (q === -1) return null
  const params = new URLSearchParams(hash.slice(q + 1))
  const sc = params.get('sc')
  if (!sc) return null
  const decoded = decodeScenario(sc)
  params.delete('sc')
  const rest = params.toString()
  const newHash = hash.slice(0, q) + (rest ? `?${rest}` : '')
  history.replaceState(null, '', window.location.pathname + window.location.search + newHash)
  return decoded
}

// ---------------------------------------------------------------------------

export function StoreProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => {
    const shared = consumeSharedScenario()
    return {
      assets: shared?.assets ?? loadJson<TradeAsset[]>(TRADES_KEY, []),
      signings: shared?.signings ?? loadJson<Signing[]>(SIGNINGS_KEY, []),
    }
  })
  const [assets, setAssets] = useState<TradeAsset[]>(initial.assets)
  const [signings, setSignings] = useState<Signing[]>(initial.signings)
  const [tradeMode, setTradeMode] = useState(false)

  useEffect(() => saveJson(TRADES_KEY, assets), [assets])
  useEffect(() => saveJson(SIGNINGS_KEY, signings), [signings])

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

  const addSigning = useCallback((s: Signing) => {
    setSignings((prev) => [...prev.filter((x) => x.name !== s.name), s])
  }, [])

  const removeSigning = useCallback((name: string) => {
    setSignings((prev) => prev.filter((s) => s.name !== name))
    // Also drop any trade that was moving this signed player around.
    const id = signingPlayerId(name)
    setAssets((prev) => prev.filter((a) => a.playerId !== id))
  }, [])

  const clearTrades = useCallback(() => {
    setAssets([])
    setSignings([])
  }, [])

  // Base league with pending signings folded in (trades operate on this, so a
  // signed player can be traded onward like anyone else).
  const baseTeams = useMemo<Team[]>(() => {
    if (signings.length === 0) return TEAMS
    const byTeam = new Map<string, Player[]>()
    signings.forEach((s) => {
      const list = byTeam.get(s.toTeamId) ?? []
      list.push(signingToPlayer(s))
      byTeam.set(s.toTeamId, list)
    })
    return TEAMS.map((t) =>
      byTeam.has(t.id) ? { ...t, roster: [...t.roster, ...byTeam.get(t.id)!] } : t,
    )
  }, [signings])

  const signedIds = useMemo(
    () => new Set(signings.map((s) => signingPlayerId(s.name))),
    [signings],
  )
  const signedNames = useMemo(() => new Set(signings.map((s) => s.name)), [signings])

  const applied = useMemo(() => applyTrades(baseTeams, assets), [baseTeams, assets])
  const before = useMemo(() => projectLeague(TEAMS), [])
  const after = useMemo(() => projectLeague(applied.teams), [applied])

  const shareUrl = useCallback(() => {
    const sc = encodeScenario(assets, signings)
    const hash = window.location.hash.split('?')[0] || '#/'
    return `${window.location.origin}${window.location.pathname}${hash}?sc=${sc}`
  }, [assets, signings])

  const value: StoreValue = {
    baseTeams,
    afterTeams: applied.teams,
    assets,
    addAsset,
    removeAsset,
    signings,
    addSigning,
    removeSigning,
    clearTrades,
    before,
    after,
    originOf: applied.originOf,
    ownerOf: applied.ownerOf,
    signedIds,
    signedNames,
    hasTrades: assets.length > 0 || signings.length > 0,
    shareUrl,
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
