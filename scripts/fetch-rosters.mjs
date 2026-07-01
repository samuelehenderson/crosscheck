// Fetches current rosters for all 32 teams from the official NHL feed and
// writes them into src/data/*.json (+ regenerates api/_seed.js). Runs in CI
// (see .github/workflows/refresh-rosters.yml) where the network can reach the
// NHL API. Ratings aren't in any NHL feed, so we keep our curated ratings
// (matched by name) and baseline players we don't have yet.
//
// Never wipes data on failure: a team whose fetch fails keeps its existing
// roster, and if every team fails the script exits non-zero without writing.

import { readFileSync, writeFileSync } from 'node:fs'

const DIV_FILES = ['atlantic', 'metropolitan', 'central', 'pacific']
const fileUrl = (f) => new URL(`../src/data/${f}.json`, import.meta.url)

const divisions = Object.fromEntries(
  DIV_FILES.map((f) => [f, JSON.parse(readFileSync(fileUrl(f), 'utf8'))]),
)
const teams = DIV_FILES.flatMap((f) => divisions[f])

// name -> curated rating object
const RATINGS = new Map()
for (const t of teams) for (const p of t.roster) RATINGS.set(normName(p.name), p)

function normName(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
}

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
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const raw = [...(data.forwards || []), ...(data.defensemen || []), ...(data.goalies || [])]
  return raw.map((pl) => {
    const name = `${pl.firstName?.default ?? ''} ${pl.lastName?.default ?? ''}`.trim()
    const position = mapPosition(pl.positionCode, pl.shootsCatches)
    const rated = RATINGS.get(normName(name))
    const r = rated ?? baseline(position)
    const bp = baseline(position)
    return {
      name,
      position,
      age: ageFromBirthDate(pl.birthDate) ?? rated?.age ?? 26,
      overall: r.overall,
      offense: position === 'G' ? null : r.offense ?? bp.offense,
      defense: position === 'G' ? null : r.defense ?? bp.defense,
      finishing: position === 'G' ? null : r.finishing ?? bp.finishing,
      goaltending: position === 'G' ? r.goaltending ?? 77 : null,
    }
  })
}

let liveCount = 0
const errors = []
for (const team of teams) {
  try {
    const roster = await fetchTeamRoster(team.id)
    if (!roster.length) throw new Error('empty roster')
    team.roster = roster
    liveCount++
  } catch (err) {
    errors.push(`${team.id}: ${err instanceof Error ? err.message : String(err)}`)
  }
}

console.log(`Fetched live rosters for ${liveCount}/${teams.length} teams.`)
if (errors.length) console.log('Errors:', errors.slice(0, 10).join(' | '))

if (liveCount === 0) {
  console.error('No live rosters fetched — NHL feed unreachable. Leaving data unchanged.')
  process.exit(1)
}

// Write the division JSON files (compact, matching the existing style).
for (const f of DIV_FILES) {
  writeFileSync(fileUrl(f), JSON.stringify(divisions[f]) + '\n')
}

// Regenerate the embedded seed used by the serverless function.
const header = `// AUTO-GENERATED from src/data/*.json — do not edit by hand.
// Regenerate with: npm run gen:seed
// Embedded as a JS module (not a JSON import) so the Vercel serverless
// function loads reliably across Node/ESM versions.

`
writeFileSync(new URL('../api/_seed.js', import.meta.url), header + 'export const SEED = ' + JSON.stringify(teams) + '\n')

console.log('Wrote src/data/*.json and api/_seed.js.')
