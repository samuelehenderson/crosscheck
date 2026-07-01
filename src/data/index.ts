// Loads the seed roster data for all 32 teams and normalizes it into typed
// Team objects with stable player ids.
//
// The rosters are approximate, editable snapshots of 2025-26 NHL lineups —
// good enough to make the simulator feel real, and easy to correct or extend.
// Player ratings are our own estimates, not official.

import type { Player, Position, Team } from '../types'
import atlantic from './atlantic.json'
import metropolitan from './metropolitan.json'
import central from './central.json'
import pacific from './pacific.json'

interface RawPlayer {
  name: string
  position: string
  age: number
  overall: number
  offense: number | null
  defense: number | null
  finishing: number | null
  goaltending: number | null
}

interface RawTeam {
  id: string
  city: string
  name: string
  conference: string
  division: string
  colors: { primary: string; secondary: string }
  roster: RawPlayer[]
}

/** Deterministic slug so player ids stay stable across reloads. */
function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function normalizePlayer(raw: RawPlayer, teamId: string, index: number): Player {
  return {
    id: `${teamId}-${slug(raw.name)}-${index}`,
    name: raw.name,
    position: raw.position as Position,
    age: raw.age,
    overall: raw.overall,
    offense: raw.offense,
    defense: raw.defense,
    finishing: raw.finishing,
    goaltending: raw.goaltending,
  }
}

function normalizeTeam(raw: RawTeam): Team {
  return {
    id: raw.id,
    city: raw.city,
    name: raw.name,
    conference: raw.conference as Team['conference'],
    division: raw.division as Team['division'],
    colors: raw.colors,
    roster: raw.roster.map((p, i) => normalizePlayer(p, raw.id, i)),
  }
}

const rawTeams = [
  ...(atlantic as RawTeam[]),
  ...(metropolitan as RawTeam[]),
  ...(central as RawTeam[]),
  ...(pacific as RawTeam[]),
]

/** All 32 teams, alphabetized by city then name for stable ordering. */
export const TEAMS: Team[] = rawTeams
  .map(normalizeTeam)
  .sort((a, b) => `${a.city} ${a.name}`.localeCompare(`${b.city} ${b.name}`))

export const TEAMS_BY_ID: Record<string, Team> = Object.fromEntries(
  TEAMS.map((t) => [t.id, t]),
)

export function getTeam(id: string): Team | undefined {
  return TEAMS_BY_ID[id]
}
