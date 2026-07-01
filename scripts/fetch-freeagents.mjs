// Builds a "free agents" list: players who played last season (per the NHL
// league-wide stats API) but who are NOT on any current roster. Writes
// src/data/freeAgents.json. Runs in CI after the roster refresh.
//
// This is a proxy for "unsigned" — it captures true UFAs/RFAs, but also anyone
// who left the NHL (retired, overseas, AHL). We filter to players with real NHL
// workloads to keep it meaningful, and never wipe on failure (exits 0).

import { readFileSync, writeFileSync } from 'node:fs'

const DIV_FILES = ['atlantic', 'metropolitan', 'central', 'pacific']
const teams = DIV_FILES.flatMap((f) =>
  JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8')),
)

function nameKey(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
}

const rostered = new Set()
const RATINGS = new Map()
for (const t of teams) for (const p of t.roster) {
  rostered.add(nameKey(p.name))
  RATINGS.set(nameKey(p.name), p)
}

const statsSeason =
  JSON.parse(readFileSync(new URL('../src/data/stats.json', import.meta.url), 'utf8')).season ||
  '2025-26'
const y1 = parseInt(statsSeason.slice(0, 4), 10) || 2025
const seasonId = `${y1}${y1 + 1}`

function mapPos(code) {
  return code === 'C' ? 'C' : code === 'L' ? 'LW' : code === 'R' ? 'RW' : code === 'D' ? 'LD' : 'C'
}
function baselineOverall(pos) {
  return pos === 'G' ? 77 : pos === 'LD' || pos === 'RD' ? 73 : 73
}

async function fetchAll(kind, sortProp) {
  const out = []
  const limit = 100
  for (let start = 0; start < 2500; start += limit) {
    const sort = encodeURIComponent(
      JSON.stringify([
        { property: sortProp, direction: 'DESC' },
        { property: 'playerId', direction: 'ASC' },
      ]),
    )
    const cayenne = encodeURIComponent(`seasonId=${seasonId} and gameTypeId=2`)
    const url = `https://api.nhle.com/stats/rest/en/${kind}/summary?isAggregate=false&isGame=false&start=${start}&limit=${limit}&sort=${sort}&cayenneExp=${cayenne}`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CrossCheck/1.0)', Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`${kind} HTTP ${res.status}`)
    const j = await res.json()
    const data = j.data ?? []
    out.push(...data)
    if (data.length < limit) break
  }
  return out
}

try {
  const rawSkaters = await fetchAll('skater', 'points')
  const rawGoalies = await fetchAll('goalie', 'gamesPlayed')

  const skaters = rawSkaters
    .filter((p) => !rostered.has(nameKey(p.skaterFullName)) && (p.gamesPlayed ?? 0) >= 20)
    .map((p) => {
      const position = mapPos(p.positionCode)
      const r = RATINGS.get(nameKey(p.skaterFullName))
      return {
        name: p.skaterFullName,
        position,
        overall: r?.overall ?? baselineOverall(position),
        gamesPlayed: p.gamesPlayed ?? 0,
        goals: p.goals ?? 0,
        assists: p.assists ?? 0,
        points: p.points ?? 0,
      }
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 150)

  const goalies = rawGoalies
    .filter((p) => !rostered.has(nameKey(p.goalieFullName)) && (p.gamesPlayed ?? 0) >= 8)
    .map((p) => {
      const r = RATINGS.get(nameKey(p.goalieFullName))
      return {
        name: p.goalieFullName,
        position: 'G',
        isGoalie: true,
        overall: r?.overall ?? 77,
        gamesPlayed: p.gamesPlayed ?? 0,
        wins: p.wins ?? 0,
        losses: p.losses ?? 0,
        gaa: p.goalsAgainstAverage ?? null,
        savePct: p.savePct ?? null,
      }
    })
    .sort((a, b) => (b.savePct ?? 0) - (a.savePct ?? 0))
    .slice(0, 40)

  console.log(`Free agents: ${skaters.length} skaters, ${goalies.length} goalies (season ${statsSeason}).`)
  if (skaters.length === 0 && goalies.length === 0) {
    console.error('No free agents parsed — leaving src/data/freeAgents.json unchanged.')
    process.exit(0)
  }

  writeFileSync(
    new URL('../src/data/freeAgents.json', import.meta.url),
    JSON.stringify({ season: statsSeason, updatedAt: new Date().toISOString(), skaters, goalies }) + '\n',
  )
  console.log('Wrote src/data/freeAgents.json.')
} catch (err) {
  console.error('Free-agent fetch failed — leaving src/data/freeAgents.json unchanged:', err.message)
  process.exit(0)
}
