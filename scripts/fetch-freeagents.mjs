// Builds a "free agents" list: players who played last season (per the NHL
// league-wide stats API) but who are NOT on any current roster. Writes
// src/data/freeAgents.json. Runs in CI after the roster refresh.
//
// Overall ratings for free agents are DERIVED from stats — a 3-year,
// recency-weighted average of production (points/82 for skaters, save % for
// goalies) — rather than a flat baseline, so the numbers actually mean
// something. The stat columns shown in the UI are last season's totals.
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
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))

const rostered = new Set()
for (const t of teams) for (const p of t.roster) rostered.add(nameKey(p.name))

const statsSeason =
  JSON.parse(readFileSync(new URL('../src/data/stats.json', import.meta.url), 'utf8')).season ||
  '2025-26'
const y1 = parseInt(statsSeason.slice(0, 4), 10) || 2025
// Most recent first; recency weights favor the latest season.
const SEASONS = [`${y1}${y1 + 1}`, `${y1 - 1}${y1}`, `${y1 - 2}${y1 - 1}`]
const RECENCY = [3, 2, 1]

function mapPos(code) {
  return code === 'C' ? 'C' : code === 'L' ? 'LW' : code === 'R' ? 'RW' : code === 'D' ? 'LD' : 'C'
}

async function fetchAll(kind, seasonId, sortProp) {
  const out = []
  const limit = 100
  for (let start = 0; start < 1500; start += limit) {
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
    if (!res.ok) throw new Error(`${kind} ${seasonId} HTTP ${res.status}`)
    const j = await res.json()
    const data = j.data ?? []
    out.push(...data)
    if (data.length < limit) break
  }
  return out
}

/** Points-per-82 → overall. Defensemen produce fewer points, so scale up. */
function skaterRating(seasons, key, positionCode) {
  let wp = 0
  let wg = 0
  seasons.forEach((m, i) => {
    const r = m.get(key)
    if (r && r.gp) {
      wp += r.points * RECENCY[i]
      wg += r.gp * RECENCY[i]
    }
  })
  const pp82 = wg > 0 ? (wp / wg) * 82 : 0
  const eff = positionCode === 'D' ? pp82 * 1.5 : pp82
  return clamp(Math.round(60 + eff * 0.36), 55, 95)
}

/** Save % → overall, weighted by games and recency. */
function goalieRating(seasons, key) {
  let ws = 0
  let wg = 0
  seasons.forEach((m, i) => {
    const r = m.get(key)
    if (r && r.gp && r.svpct) {
      ws += r.svpct * r.gp * RECENCY[i]
      wg += r.gp * RECENCY[i]
    }
  })
  const sv = wg > 0 ? ws / wg : 0.9
  return clamp(Math.round(77 + (sv - 0.9) * 600), 55, 93)
}

try {
  // Pull up to three seasons of stats. A missing prior season just narrows the
  // window rather than failing the whole build.
  const skaterSeasons = []
  const goalieSeasons = []
  for (const s of SEASONS) {
    try {
      const sk = await fetchAll('skater', s, 'points')
      const m = new Map()
      for (const p of sk)
        m.set(nameKey(p.skaterFullName), {
          name: p.skaterFullName,
          gp: p.gamesPlayed ?? 0,
          goals: p.goals ?? 0,
          assists: p.assists ?? 0,
          points: p.points ?? 0,
          positionCode: p.positionCode,
        })
      skaterSeasons.push(m)

      const go = await fetchAll('goalie', s, 'gamesPlayed')
      const gm = new Map()
      for (const p of go)
        gm.set(nameKey(p.goalieFullName), {
          name: p.goalieFullName,
          gp: p.gamesPlayed ?? 0,
          wins: p.wins ?? 0,
          losses: p.losses ?? 0,
          gaa: p.goalsAgainstAverage ?? null,
          svpct: p.savePct ?? null,
        })
      goalieSeasons.push(gm)
    } catch (e) {
      console.log(`Season ${s} unavailable (${e.message}); continuing with fewer seasons.`)
    }
  }

  if (skaterSeasons.length === 0) throw new Error('no season data fetched')

  const lastSkaters = skaterSeasons[0]
  const lastGoalies = goalieSeasons[0] ?? new Map()

  const skaters = [...lastSkaters.values()]
    .filter((r) => !rostered.has(nameKey(r.name)) && r.gp >= 20)
    .map((r) => ({
      name: r.name,
      position: mapPos(r.positionCode),
      overall: skaterRating(skaterSeasons, nameKey(r.name), r.positionCode),
      gamesPlayed: r.gp,
      goals: r.goals,
      assists: r.assists,
      points: r.points,
    }))
    .sort((a, b) => b.points - a.points)
    .slice(0, 150)

  const goalies = [...lastGoalies.values()]
    .filter((r) => !rostered.has(nameKey(r.name)) && r.gp >= 8)
    .map((r) => ({
      name: r.name,
      position: 'G',
      isGoalie: true,
      overall: goalieRating(goalieSeasons, nameKey(r.name)),
      gamesPlayed: r.gp,
      wins: r.wins,
      losses: r.losses,
      gaa: r.gaa,
      savePct: r.svpct,
    }))
    .sort((a, b) => (b.savePct ?? 0) - (a.savePct ?? 0))
    .slice(0, 40)

  console.log(
    `Free agents: ${skaters.length} skaters, ${goalies.length} goalies from ${skaterSeasons.length} season(s).`,
  )
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
