// Fetches current-season stat lines for every team from the NHL club-stats
// endpoint and writes src/data/stats.json, keyed by normalized player name so
// the app can attach a stat line to each roster player. Runs in CI alongside
// the roster refresh.
//
// Never wipes on failure: if no teams return stats, the existing file is left
// untouched. Always exits 0 so it can't block the roster commit.

import { readFileSync, writeFileSync } from 'node:fs'

const DIV_FILES = ['atlantic', 'metropolitan', 'central', 'pacific']
const teamIds = DIV_FILES.flatMap((f) =>
  JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8')).map((t) => t.id),
)

function nameKey(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
}

function fullName(p) {
  return `${p.firstName?.default ?? ''} ${p.lastName?.default ?? ''}`.trim()
}

function seasonLabel(season) {
  const s = String(season ?? '')
  return s.length === 8 ? `${s.slice(0, 4)}-${s.slice(6, 8)}` : ''
}

async function fetchTeamStats(code) {
  const res = await fetch(`https://api-web.nhle.com/v1/club-stats/${code}/now`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; CrossCheck/1.0)',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const players = {}
let season = ''
let ok = 0
const errors = []

for (const id of teamIds) {
  try {
    const data = await fetchTeamStats(id)
    if (!season) season = seasonLabel(data.season)
    for (const s of data.skaters ?? []) {
      players[nameKey(fullName(s))] = {
        gamesPlayed: s.gamesPlayed ?? 0,
        goals: s.goals ?? 0,
        assists: s.assists ?? 0,
        points: s.points ?? 0,
        plusMinus: s.plusMinus ?? 0,
      }
    }
    for (const g of data.goalies ?? []) {
      players[nameKey(fullName(g))] = {
        isGoalie: true,
        gamesPlayed: g.gamesPlayed ?? 0,
        wins: g.wins ?? 0,
        losses: g.losses ?? 0,
        gaa: g.goalsAgainstAverage ?? null,
        savePct: g.savePercentage ?? null,
        shutouts: g.shutouts ?? 0,
      }
    }
    ok++
  } catch (err) {
    errors.push(`${id}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

console.log(`Fetched stats for ${ok}/${teamIds.length} teams (${Object.keys(players).length} players), season ${season || '?'}.`)
if (errors.length) console.log('Errors:', errors.slice(0, 10).join(' | '))

if (ok === 0) {
  console.error('No stats fetched — leaving src/data/stats.json unchanged.')
  process.exit(0)
}

writeFileSync(
  new URL('../src/data/stats.json', import.meta.url),
  JSON.stringify({ season, updatedAt: new Date().toISOString(), players }) + '\n',
)
console.log('Wrote src/data/stats.json.')
