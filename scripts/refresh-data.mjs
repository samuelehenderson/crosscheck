// Unified data refresh for CrossCheck. Runs in CI (GitHub's network can reach
// the NHL/ESPN feeds) and writes every data file the app consumes:
//
//   src/data/{atlantic,metropolitan,central,pacific}.json  — rosters + ratings
//   src/data/stats.json        — last-season stat lines (all NHL players)
//   src/data/injuries.json     — current injury report (ESPN)
//   src/data/freeAgents.json   — played last season, not on a current roster
//   src/data/updatedAt.json    — refresh timestamp
//
// Ratings: hand-curated numbers (src/data/curatedRatings.json) win when we
// have them; everyone else gets a TWO-WAY rating derived from up to three
// seasons of real stats (recency-weighted): production drives offense and
// finishing, plus/minus drives the defensive component, and save % drives
// goalies. No more flat placeholder ratings.
//
// Fail-safe by design: every section is best-effort. If the roster feed is
// completely unreachable the script exits non-zero without writing anything;
// a partial failure (one team, one season, injuries down) degrades gracefully
// and never wipes existing data.

import { readFileSync, writeFileSync } from 'node:fs'

const DIV_FILES = ['atlantic', 'metropolitan', 'central', 'pacific']
const dataUrl = (f) => new URL(`../src/data/${f}`, import.meta.url)

const divisions = Object.fromEntries(
  DIV_FILES.map((f) => [f, JSON.parse(readFileSync(dataUrl(`${f}.json`), 'utf8'))]),
)
const teams = DIV_FILES.flatMap((f) => divisions[f])

const CURATED = JSON.parse(readFileSync(dataUrl('curatedRatings.json'), 'utf8'))

const nameKey = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n))
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; CrossCheck/1.0)', Accept: 'application/json' }

// ---------------------------------------------------------------------------
// 1. League-wide stats, up to three seasons back (recency-weighted ratings).
// ---------------------------------------------------------------------------

const now = new Date()
// NHL seasons roll over in the fall; before October the "last season" started
// the previous calendar year.
const startYear = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1
const SEASONS = [0, 1, 2].map((i) => `${startYear - i}${startYear - i + 1}`)
const RECENCY = [3, 2, 1]
const seasonLabel = (id) => `${id.slice(0, 4)}-${id.slice(6, 8)}`

async function fetchAllPages(kind, seasonId, sortProp) {
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
    const res = await fetch(url, { headers: UA })
    if (!res.ok) throw new Error(`${kind} ${seasonId} HTTP ${res.status}`)
    const j = await res.json()
    const data = j.data ?? []
    out.push(...data)
    if (data.length < limit) break
  }
  return out
}

const skaterSeasons = [] // Array<Map<nameKey, row>>
const goalieSeasons = []
for (const s of SEASONS) {
  try {
    const sk = await fetchAllPages('skater', s, 'points')
    const m = new Map()
    for (const p of sk)
      m.set(nameKey(p.skaterFullName), {
        name: p.skaterFullName,
        gp: p.gamesPlayed ?? 0,
        goals: p.goals ?? 0,
        assists: p.assists ?? 0,
        points: p.points ?? 0,
        plusMinus: p.plusMinus ?? 0,
        positionCode: p.positionCode,
      })
    skaterSeasons.push(m)

    const go = await fetchAllPages('goalie', s, 'gamesPlayed')
    const gm = new Map()
    for (const p of go)
      gm.set(nameKey(p.goalieFullName), {
        name: p.goalieFullName,
        gp: p.gamesPlayed ?? 0,
        wins: p.wins ?? 0,
        losses: p.losses ?? 0,
        gaa: p.goalsAgainstAverage ?? null,
        svpct: p.savePct ?? null,
        shutouts: p.shutouts ?? 0,
      })
    goalieSeasons.push(gm)
  } catch (e) {
    console.log(`Season ${s} stats unavailable (${e.message}); continuing.`)
  }
}
console.log(`Fetched league stats for ${skaterSeasons.length}/${SEASONS.length} seasons.`)

// ---------------------------------------------------------------------------
// 2. Two-way stat-derived ratings.
// ---------------------------------------------------------------------------

/** Recency+GP weighted per-82 rates across available seasons. */
function skaterRates(key) {
  let wPts = 0,
    wG = 0,
    wA = 0,
    wPM = 0,
    wGP = 0,
    rawGP = 0
  skaterSeasons.forEach((m, i) => {
    const r = m.get(key)
    if (r && r.gp) {
      const w = RECENCY[i]
      wPts += r.points * w
      wG += r.goals * w
      wA += r.assists * w
      wPM += r.plusMinus * w
      wGP += r.gp * w
      rawGP += r.gp
    }
  })
  if (!wGP) return null
  const per82 = (v) => (v / wGP) * 82
  return { pp82: per82(wPts), g82: per82(wG), a82: per82(wA), pm82: per82(wPM), rawGP }
}

/** Shrink a derived rating toward the baseline when the sample is small, so a
 *  hot 10-game cameo can't out-rate an established star. */
function shrink(value, baseline, rawGP, halfLife) {
  const k = rawGP / (rawGP + halfLife)
  return Math.round(baseline + (value - baseline) * k)
}

/** Full two-way component ratings for an uncurated skater. Ratings shrink
 *  toward the baseline for small samples (half-strength at 40 career GP). */
function deriveSkater(key, position) {
  const r = skaterRates(key)
  if (!r) return null
  const isD = position === 'LD' || position === 'RD'
  const S = (v, base) => clamp(shrink(v, base, r.rawGP, 40), 45, 97)
  if (isD) {
    const offense = S(50 + r.pp82 * 0.62, BASELINE.D.offense)
    const finishing = S(50 + r.g82 * 1.2 + r.pp82 * 0.1, BASELINE.D.finishing)
    const defense = S(70 + r.pm82 * 0.35, BASELINE.D.defense)
    const overall = clamp(Math.round(0.36 * offense + 0.1 * finishing + 0.54 * defense), 55, 95)
    return { overall, offense, defense, finishing, goaltending: null }
  }
  const offense = S(50 + r.pp82 * 0.5, BASELINE.F.offense)
  const finishing = S(52 + r.g82 * 1.0 + r.a82 * 0.15, BASELINE.F.finishing)
  const defense = S(66 + r.pm82 * 0.3, BASELINE.F.defense)
  const overall = clamp(Math.round(0.48 * offense + 0.24 * finishing + 0.28 * defense), 55, 96)
  return { overall, offense, defense, finishing, goaltending: null }
}

/** Rating for an uncurated goalie from recency+GP weighted save %. Shrinks
 *  toward the baseline for small samples (half-strength at 25 career GP) so a
 *  hot backup stretch can't out-rate an established starter. */
function deriveGoalie(key) {
  let wSv = 0,
    wGP = 0,
    rawGP = 0
  goalieSeasons.forEach((m, i) => {
    const r = m.get(key)
    if (r && r.gp && r.svpct) {
      const w = RECENCY[i]
      wSv += r.svpct * r.gp * w
      wGP += r.gp * w
      rawGP += r.gp
    }
  })
  if (!wGP) return null
  const sv = wSv / wGP
  const raw = 77 + (sv - 0.9) * 600
  const g = clamp(shrink(raw, BASELINE.G.goaltending, rawGP, 25), 55, 93)
  return { overall: g, offense: null, defense: null, finishing: null, goaltending: g }
}

const BASELINE = {
  F: { overall: 68, offense: 66, defense: 66, finishing: 66, goaltending: null },
  D: { overall: 68, offense: 62, defense: 71, finishing: 58, goaltending: null },
  G: { overall: 74, offense: null, defense: null, finishing: null, goaltending: 74 },
}

/** curated > stat-derived > conservative baseline (true unknowns/rookies). */
function ratingFor(name, position) {
  const key = nameKey(name)
  const curated = CURATED[key]
  if (curated) return curated
  if (position === 'G') return deriveGoalie(key) ?? BASELINE.G
  return (
    deriveSkater(key, position) ??
    (position === 'LD' || position === 'RD' ? BASELINE.D : BASELINE.F)
  )
}

// ---------------------------------------------------------------------------
// 3. Current rosters.
// ---------------------------------------------------------------------------

function mapPosition(positionCode, shootsCatches) {
  switch (positionCode) {
    case 'C':
      return 'C'
    case 'L':
      return 'LW'
    case 'R':
      return 'RW'
    case 'G':
      return 'G'
    case 'D':
      return shootsCatches === 'R' ? 'RD' : 'LD'
    default:
      return 'C'
  }
}

function ageFromBirthDate(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

async function fetchTeamRoster(code) {
  const res = await fetch(`https://api-web.nhle.com/v1/roster/${code}/current`, { headers: UA })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const raw = [...(data.forwards || []), ...(data.defensemen || []), ...(data.goalies || [])]
  return raw.map((pl) => {
    const name = `${pl.firstName?.default ?? ''} ${pl.lastName?.default ?? ''}`.trim()
    const position = mapPosition(pl.positionCode, pl.shootsCatches)
    const r = ratingFor(name, position)
    return {
      name,
      position,
      age: ageFromBirthDate(pl.birthDate) ?? 26,
      overall: r.overall,
      offense: r.offense,
      defense: r.defense,
      finishing: r.finishing,
      goaltending: r.goaltending,
    }
  })
}

let rosterOk = 0
const rosterErrors = []
for (const team of teams) {
  try {
    const roster = await fetchTeamRoster(team.id)
    if (!roster.length) throw new Error('empty roster')
    team.roster = roster
    rosterOk++
  } catch (err) {
    rosterErrors.push(`${team.id}: ${err instanceof Error ? err.message : String(err)}`)
  }
}
console.log(`Fetched live rosters for ${rosterOk}/${teams.length} teams.`)
if (rosterErrors.length) console.log('Roster errors:', rosterErrors.slice(0, 8).join(' | '))

if (rosterOk === 0) {
  console.error('No live rosters fetched — leaving all data unchanged.')
  process.exit(1)
}

for (const f of DIV_FILES) {
  writeFileSync(dataUrl(`${f}.json`), JSON.stringify(divisions[f]) + '\n')
}

const rostered = new Set()
for (const t of teams) for (const p of t.roster) rostered.add(nameKey(p.name))

// ---------------------------------------------------------------------------
// 4. stats.json — last season's stat lines for everyone who played.
// ---------------------------------------------------------------------------

if (skaterSeasons.length > 0) {
  const players = {}
  for (const [key, r] of skaterSeasons[0]) {
    players[key] = {
      gamesPlayed: r.gp,
      goals: r.goals,
      assists: r.assists,
      points: r.points,
      plusMinus: r.plusMinus,
    }
  }
  for (const [key, r] of goalieSeasons[0] ?? new Map()) {
    players[key] = {
      isGoalie: true,
      gamesPlayed: r.gp,
      wins: r.wins,
      losses: r.losses,
      gaa: r.gaa,
      savePct: r.svpct,
      shutouts: r.shutouts,
    }
  }
  writeFileSync(
    dataUrl('stats.json'),
    JSON.stringify({ season: seasonLabel(SEASONS[0]), updatedAt: now.toISOString(), players }) +
      '\n',
  )
  console.log(`Wrote stats.json (${Object.keys(players).length} players).`)
} else {
  console.log('No league stats — leaving stats.json unchanged.')
}

// ---------------------------------------------------------------------------
// 5. injuries.json — ESPN league injury report.
// ---------------------------------------------------------------------------

function shortCode(status) {
  const s = (status || '').toLowerCase()
  if (s.includes('long term') || s.includes('ltir')) return 'IR'
  if (s.includes('injured reserve') || s === 'ir') return 'IR'
  if (s.includes('suspend')) return 'SUS'
  if (s.includes('day')) return 'DTD'
  if (s.includes('question')) return 'Q'
  if (s.includes('doubt')) return 'D'
  if (s.includes('out')) return 'OUT'
  return 'OUT'
}

try {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const payload = await res.json()
  const list = []
  for (const node of Array.isArray(payload?.injuries) ? payload.injuries : []) {
    if (Array.isArray(node.injuries)) list.push(...node.injuries)
    else if (node.athlete) list.push(node)
  }
  const players = {}
  for (const inj of list) {
    const name = inj.athlete?.displayName || inj.athlete?.fullName
    if (!name) continue
    const status = inj.status || inj.type?.description || 'Out'
    const d = inj.details || {}
    players[nameKey(name)] = {
      status,
      short: shortCode(status),
      detail:
        [d.location, d.type, d.detail].filter(Boolean).join(' · ') ||
        inj.shortComment ||
        inj.type?.description ||
        '',
      date: inj.date || d.returnDate || '',
    }
  }
  if (Object.keys(players).length > 0) {
    writeFileSync(
      dataUrl('injuries.json'),
      JSON.stringify({ updatedAt: now.toISOString(), players }) + '\n',
    )
    console.log(`Wrote injuries.json (${Object.keys(players).length} injuries).`)
  } else {
    console.log('No injuries parsed — leaving injuries.json unchanged.')
  }
} catch (err) {
  console.log(`Injury fetch failed (${err.message}) — leaving injuries.json unchanged.`)
}

// ---------------------------------------------------------------------------
// 6. freeAgents.json — played last season, not on a current roster.
// ---------------------------------------------------------------------------

if (skaterSeasons.length > 0) {
  const skaters = [...skaterSeasons[0].values()]
    .filter((r) => !rostered.has(nameKey(r.name)) && r.gp >= 20)
    .map((r) => {
      const position = mapPosition(r.positionCode)
      return {
        name: r.name,
        position,
        overall: (deriveSkater(nameKey(r.name), position) ?? BASELINE.F).overall,
        gamesPlayed: r.gp,
        goals: r.goals,
        assists: r.assists,
        points: r.points,
      }
    })
    .sort((a, b) => b.points - a.points)
    .slice(0, 150)

  const goalies = [...(goalieSeasons[0] ?? new Map()).values()]
    .filter((r) => !rostered.has(nameKey(r.name)) && r.gp >= 8)
    .map((r) => ({
      name: r.name,
      position: 'G',
      isGoalie: true,
      overall: (deriveGoalie(nameKey(r.name)) ?? BASELINE.G).overall,
      gamesPlayed: r.gp,
      wins: r.wins,
      losses: r.losses,
      gaa: r.gaa,
      savePct: r.svpct,
    }))
    .sort((a, b) => (b.savePct ?? 0) - (a.savePct ?? 0))
    .slice(0, 40)

  writeFileSync(
    dataUrl('freeAgents.json'),
    JSON.stringify({
      season: seasonLabel(SEASONS[0]),
      updatedAt: now.toISOString(),
      skaters,
      goalies,
    }) + '\n',
  )
  console.log(`Wrote freeAgents.json (${skaters.length} skaters, ${goalies.length} goalies).`)
}

// ---------------------------------------------------------------------------
// 7. Timestamp.
// ---------------------------------------------------------------------------

const stamp = JSON.stringify({ updatedAt: now.toISOString() }, null, 2) + '\n'
writeFileSync(dataUrl('updatedAt.json'), stamp)
// Also served statically so the in-app Refresh button can detect new deploys.
writeFileSync(new URL('../public/updatedAt.json', import.meta.url), stamp)
console.log('Refresh complete.')
