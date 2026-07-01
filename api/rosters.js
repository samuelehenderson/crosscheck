// Vercel serverless function: GET /api/rosters
//
// Fetches the current roster for all 32 teams from the official NHL feed
// (api-web.nhle.com), then returns them in CrossCheck's RawTeam shape so the
// app can render live rosters. Player *ratings* aren't in any NHL feed, so we
// merge our curated ratings (matched by name) and fall back to a position-based
// baseline for players we don't have yet.
//
// Team metadata (city, colors, conference, division) and the curated ratings
// both come from the bundled seed JSON — the same source the app ships with —
// so this stays a single source of truth. If the NHL feed is unreachable for a
// team, that team falls back to its seed roster; nothing ever 500s the client.

import atlantic from '../src/data/atlantic.json'
import metropolitan from '../src/data/metropolitan.json'
import central from '../src/data/central.json'
import pacific from '../src/data/pacific.json'

const SEED = [...atlantic, ...metropolitan, ...central, ...pacific]

// name -> curated rating object (last write wins for players on multiple teams)
const RATINGS = new Map()
for (const team of SEED) {
  for (const p of team.roster) RATINGS.set(normName(p.name), p)
}

function normName(s) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '')
}

/** Map the NHL feed's position + handedness to our LW/C/RW/LD/RD/G. */
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

/** Baseline ratings for a player we don't have curated numbers for yet. */
function baseline(position) {
  if (position === 'G') return { overall: 77, offense: null, defense: null, finishing: null, goaltending: 77 }
  if (position === 'LD' || position === 'RD')
    return { overall: 73, offense: 66, defense: 74, finishing: 60, goaltending: null }
  return { overall: 73, offense: 72, defense: 70, finishing: 72, goaltending: null }
}

function ageFromBirthDate(birthDate) {
  if (!birthDate) return null
  const b = new Date(birthDate)
  if (Number.isNaN(b.getTime())) return null
  const now = new Date()
  let age = now.getFullYear() - b.getFullYear()
  const m = now.getMonth() - b.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--
  return age
}

async function fetchTeamRoster(code) {
  const res = await fetch(`https://api-web.nhle.com/v1/roster/${code}/current`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; CrossCheck/1.0; +https://github.com/samuelehenderson/crosscheck)',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`${code} -> HTTP ${res.status}`)
  const data = await res.json()
  const raw = [...(data.forwards || []), ...(data.defensemen || []), ...(data.goalies || [])]

  return raw.map((pl) => {
    const name = `${pl.firstName?.default ?? ''} ${pl.lastName?.default ?? ''}`.trim()
    const position = mapPosition(pl.positionCode, pl.shootsCatches)
    const rated = RATINGS.get(normName(name))
    const r = rated ?? baseline(position)
    return {
      name,
      position,
      age: ageFromBirthDate(pl.birthDate) ?? rated?.age ?? 26,
      overall: r.overall,
      offense: position === 'G' ? null : r.offense ?? baseline(position).offense,
      defense: position === 'G' ? null : r.defense ?? baseline(position).defense,
      finishing: position === 'G' ? null : r.finishing ?? baseline(position).finishing,
      goaltending: position === 'G' ? r.goaltending ?? 77 : null,
    }
  })
}

export default async function handler(req, res) {
  const errors = []
  let liveCount = 0

  const teams = await Promise.all(
    SEED.map(async (seedTeam) => {
      try {
        const roster = await fetchTeamRoster(seedTeam.id)
        if (!roster.length) throw new Error('empty roster')
        liveCount++
        return { ...seedTeam, roster }
      } catch (err) {
        // Team-level fallback: keep the bundled roster for this team.
        errors.push(`${seedTeam.id}: ${err instanceof Error ? err.message : String(err)}`)
        return seedTeam
      }
    }),
  )

  const source = liveCount === 0 ? 'seed' : liveCount < SEED.length ? 'partial' : 'live'

  // Only cache a genuinely-live response for long; if the feed is failing,
  // cache briefly so we retry soon instead of serving stale seed for an hour.
  res.setHeader(
    'Cache-Control',
    source === 'live' ? 's-maxage=3600, stale-while-revalidate=86400' : 's-maxage=60',
  )

  const meta = {
    source,
    liveCount,
    total: SEED.length,
    fetchedAt: new Date().toISOString(),
    errors: errors.slice(0, 8),
  }

  // ?debug=1 returns just the diagnostics (small + easy to read/paste).
  const debug = (req.query && (req.query.debug === '1' || req.query.debug === 'true'))
  if (debug) {
    res.status(200).json(meta)
    return
  }

  res.status(200).json({ ...meta, teams })
}
