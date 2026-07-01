// Fetches the league-wide injury report from ESPN's public feed and writes
// src/data/injuries.json, keyed by normalized player name. Runs in CI.
//
// Parses defensively (ESPN's shape varies) and never wipes on failure — if the
// fetch fails or yields nothing, the existing file is left as-is. Always exits
// 0 so it can't block the roster/stats commit.

import { writeFileSync } from 'node:fs'

function nameKey(s) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '')
}

/** Map ESPN status text to a compact badge code. */
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

function detailOf(inj) {
  const d = inj.details || {}
  return (
    [d.location, d.type, d.detail].filter(Boolean).join(' · ') ||
    inj.shortComment ||
    inj.type?.description ||
    ''
  )
}

/** Flatten ESPN's team-grouped or flat injury payload into a list. */
function collect(payload) {
  const out = []
  const top = Array.isArray(payload?.injuries) ? payload.injuries : []
  for (const node of top) {
    if (Array.isArray(node.injuries)) {
      for (const inj of node.injuries) out.push(inj)
    } else if (node.athlete) {
      out.push(node)
    }
  }
  return out
}

async function run() {
  const res = await fetch('https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/injuries', {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
      Accept: 'application/json',
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const payload = await res.json()
  const list = collect(payload)

  const players = {}
  for (const inj of list) {
    const name = inj.athlete?.displayName || inj.athlete?.fullName
    if (!name) continue
    const status = inj.status || inj.type?.description || 'Out'
    players[nameKey(name)] = {
      status,
      short: shortCode(status),
      detail: detailOf(inj),
      date: inj.date || inj.details?.returnDate || '',
    }
  }
  return players
}

try {
  const players = await run()
  const count = Object.keys(players).length
  console.log(`Fetched ${count} injuries from ESPN.`)
  if (count === 0) {
    console.error('No injuries parsed — leaving src/data/injuries.json unchanged.')
    process.exit(0)
  }
  writeFileSync(
    new URL('../src/data/injuries.json', import.meta.url),
    JSON.stringify({ updatedAt: new Date().toISOString(), players }) + '\n',
  )
  console.log('Wrote src/data/injuries.json.')
} catch (err) {
  console.error('Injury fetch failed — leaving src/data/injuries.json unchanged:', err.message)
  process.exit(0)
}
