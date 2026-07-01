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

const STATS: Record<string, PlayerStats> =
  (statsData as { players?: Record<string, PlayerStats> }).players ?? {}
const INJURIES: Record<string, Injury> =
  (injuriesData as { players?: Record<string, Injury> }).players ?? {}

/** Normalized name key used to match stats/injuries to players. */
export function nameKey(name: string): string {
  return name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
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
