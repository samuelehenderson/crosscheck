// Core domain types for CrossCheck.
//
// The data model is intentionally small and flat so it's easy to build on:
// a league is a list of teams, a team is metadata + a roster, a roster is a
// list of players. Everything the simulator needs is derived from player
// ratings, so new features (contracts, prospects, stats) can hang off these
// types without touching the sim.

export type Position = 'LW' | 'C' | 'RW' | 'LD' | 'RD' | 'G'

export type Conference = 'Eastern' | 'Western'

export type Division = 'Atlantic' | 'Metropolitan' | 'Central' | 'Pacific'

/** Season stat line for a player (skater or goalie), from the NHL feed. */
export interface PlayerStats {
  gamesPlayed: number
  // Skater
  goals?: number
  assists?: number
  points?: number
  plusMinus?: number
  // Goalie
  wins?: number
  losses?: number
  gaa?: number
  savePct?: number
  shutouts?: number
  isGoalie?: boolean
}

/** Current injury status for a player, from the ESPN injuries feed. */
export interface Injury {
  /** Full status text, e.g. "Out", "Day-To-Day". */
  status: string
  /** Short code for badges: OUT / DTD / IR / SUS / Q. */
  short: string
  /** Free-text detail, e.g. "Lower body". */
  detail?: string
  /** ISO date the report was filed. */
  date?: string
}

/** A player who played last season but isn't on any current NHL roster. */
export interface FreeAgent {
  name: string
  position: Position
  overall: number
  gamesPlayed: number
  // Skater
  goals?: number
  assists?: number
  points?: number
  // Goalie
  wins?: number
  losses?: number
  gaa?: number
  savePct?: number
  isGoalie?: boolean
}

export interface Player {
  /** Stable id, generated at load time from name + team. */
  id: string
  name: string
  position: Position
  age: number
  /** 40–99 headline rating. */
  overall: number
  /** Skater component ratings (null for goalies). */
  offense: number | null
  defense: number | null
  finishing: number | null
  /** Goalie rating (null for skaters). */
  goaltending: number | null
  /** Season stats, attached at load time if available. */
  stats?: PlayerStats | null
  /** Current injury, attached at load time if the player is hurt. */
  injury?: Injury | null
}

export interface TeamColors {
  primary: string
  secondary: string
}

export interface Team {
  /** Three-letter code, e.g. "FLA". */
  id: string
  city: string
  name: string
  conference: Conference
  division: Division
  colors: TeamColors
  roster: Player[]
}

/** A pending trade: player ids moving between two teams. */
export interface TradeAsset {
  playerId: string
  /** Team the player currently belongs to (the "from" side). */
  fromTeamId: string
  /** Team the player is moving to. */
  toTeamId: string
}

export interface Trade {
  id: string
  assets: TradeAsset[]
}

/** The four roster-strength ranks shown in the sidebar. */
export interface RosterRanks {
  offense: number
  defense: number
  finishing: number
  goaltending: number
}

/** Everything the sim produces for a single team. */
export interface TeamProjection {
  teamId: string
  points: number
  playoffOdds: number
  cupOdds: number
  draftFirstOdds: number
  ranks: RosterRanks
  /** Composite 0–100 strength, useful for sorting / building on. */
  strength: number
}
