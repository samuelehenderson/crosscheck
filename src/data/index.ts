// Loads roster data and normalizes it into typed Team objects with stable
// player ids.
//
// Data can come from two places, both in the same RawTeam shape:
//   1. The bundled JSON seed under src/data/*.json (offline fallback).
//   2. The live NHL feed via /api/rosters (see api/rosters.js).
// normalizeTeams() is used for both, so ids match regardless of source — which
// means an in-progress trade (keyed by player id) survives a live refresh.

import type { FreeAgent, Injury, Player, PlayerStats, Position, Team } from '../types'
import atlantic from './atlantic.json'
import metropolitan from './metropolitan.json'
import central from './central.json'
import pacific from './pacific.json'
import updated from './updatedAt.json'
import statsData from './stats.json'
import injuriesData from './injuries.json'
import freeAgentsData from './freeAgents.json'
import gamedayData from './gameday.json'
import schedulesData from './schedules.json'
import wireData from './wire.json'
import newsData from './news.json'

/** When the bundled rosters were last refreshed from the NHL feed (ISO). */
export const UPDATED_AT: string = (updated as { updatedAt: string }).updatedAt

/** The season the stat lines belong to, e.g. "2025-26" (may be empty). */
export const STATS_SEASON: string = (statsData as { season: string }).season || ''

/** Players who played last season but aren't on any current roster. */
export const FREE_AGENTS = freeAgentsData as {
  season: string
  updatedAt: string
  skaters: FreeAgent[]
  goalies: FreeAgent[]
}

/** One side's official dressed lineup from an NHL boxscore. */
export interface GameLineup {
  forwards: string[]
  defense: string[]
  goalies: { name: string; starter: boolean }[]
  /** Top point-getters in this game (present once it has started). */
  top?: { name: string; g: number; a: number; p: number }[]
}

/** A game on today's NHL scoreboard (empty list in the offseason). */
export interface GameDayGame {
  id: number
  /** FUT | PRE | LIVE | CRIT | OFF | FINAL */
  state: string
  /** 1 preseason, 2 regular season, 3 playoffs. */
  type?: number
  startUtc: string | null
  home: string | null
  away: string | null
  homeScore: number | null
  awayScore: number | null
  lineups: Record<string, GameLineup | null> | null
}

export const GAMEDAY = gamedayData as { date: string; updatedAt: string; games: GameDayGame[] }

/** Today's game for a team, if the scoreboard has one. */
export function getGameFor(teamId: string): GameDayGame | null {
  return GAMEDAY.games.find((g) => g.home === teamId || g.away === teamId) ?? null
}

/** A team's most recent final score. */
export interface LastResult {
  date: string | null
  opp: string | null
  home: boolean
  usScore: number | null
  oppScore: number | null
  /** REG | OT | SO */
  endType: string
}

/** An upcoming game on a team's schedule. */
export interface UpcomingGame {
  date: string | null
  startUtc: string
  opp: string | null
  home: boolean
  /** 1 preseason, 2 regular season, 3 playoffs. */
  type: number
}

export const SCHEDULES = schedulesData as {
  season: string
  updatedAt: string
  teams: Record<string, { last: LastResult | null; next: UpcomingGame[] }>
}

export function getScheduleFor(teamId: string): { last: LastResult | null; next: UpcomingGame[] } {
  return SCHEDULES.teams[teamId] ?? { last: null, next: [] }
}

/** NHL insider tweets fetched by the wire pipeline (empty until the
 *  X_BEARER_TOKEN secret is configured). */
export interface WireTweet {
  id: string
  text: string
  author: string
  handle: string
  createdAt: string | null
  url: string
}

export const WIRE = wireData as { updatedAt: string; tweets: WireTweet[] }

/** NHL headlines pulled from public RSS feeds — the keyless news wire. */
export interface NewsItem {
  source: string
  title: string
  url: string
  publishedAt: string | null
}

export const NEWS = newsData as { updatedAt: string; items: NewsItem[] }

const STATS: Record<string, PlayerStats> =
  (statsData as { players?: Record<string, PlayerStats> }).players ?? {}
const INJURIES: Record<string, Injury> =
  (injuriesData as { players?: Record<string, Injury> }).players ?? {}

/** Normalized name key used to match stats/injuries to players. */
export function nameKey(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
}

/** Season stats / injury lookup by display name (for signed free agents). */
export function getStats(name: string): PlayerStats | null {
  return STATS[nameKey(name)] ?? null
}
export function getInjury(name: string): Injury | null {
  return INJURIES[nameKey(name)] ?? null
}

export interface RawPlayer {
  name: string
  position: string
  age: number
  overall: number
  offense: number | null
  defense: number | null
  finishing: number | null
  goaltending: number | null
}

export interface RawTeam {
  id: string
  city: string
  name: string
  conference: string
  division: string
  colors: { primary: string; secondary: string }
  roster: RawPlayer[]
}

/** Deterministic slug so player ids stay stable across reloads and sources. */
export function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizeTeam(raw: RawTeam): Team {
  // Name-based ids are stable across data sources; disambiguate the rare
  // same-name-same-team collision with a numeric suffix.
  const seen = new Map<string, number>()
  const roster: Player[] = raw.roster.map((p) => {
    const base = `${raw.id}-${slug(p.name)}`
    const n = seen.get(base) ?? 0
    seen.set(base, n + 1)
    const id = n === 0 ? base : `${base}-${n + 1}`
    const key = nameKey(p.name)
    return {
      id,
      name: p.name,
      position: p.position as Position,
      age: p.age,
      overall: p.overall,
      offense: p.offense,
      defense: p.defense,
      finishing: p.finishing,
      goaltending: p.goaltending,
      stats: STATS[key] ?? null,
      injury: INJURIES[key] ?? null,
    }
  })
  return {
    id: raw.id,
    city: raw.city,
    name: raw.name,
    conference: raw.conference as Team['conference'],
    division: raw.division as Team['division'],
    colors: raw.colors,
    roster,
  }
}

/** Normalize a list of raw teams and sort them by city + name for stable order. */
export function normalizeTeams(raw: RawTeam[]): Team[] {
  return raw
    .map(normalizeTeam)
    .sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`))
}

const seed = [
  ...(atlantic as RawTeam[]),
  ...(metropolitan as RawTeam[]),
  ...(central as RawTeam[]),
  ...(pacific as RawTeam[]),
]

/** The bundled seed league — used offline and as the live-feed fallback. */
export const TEAMS: Team[] = normalizeTeams(seed)

export const TEAMS_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
)

export function getTeam(id: string): Team | undefined {
  return TEAMS_BY_ID[id]
}
