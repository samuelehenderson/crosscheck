// Fetches recent NHL news tweets from trusted insider accounts via the X API
// and writes them to src/data/wire.json for the landing-page Wire section.
//
// Requires an X_BEARER_TOKEN secret (X API v2 bearer token with tweet-search
// access — the paid Basic tier or above; the free tier is write-only and will
// return 403 here). Optional X_WIRE_QUERY secret overrides the default query.
// Without a token this exits quietly and the existing wire.json is kept, so
// the feature stays dormant until the secret is added.

import { readFileSync, writeFileSync } from 'fs'

const dataUrl = (f) => new URL(`../src/data/${f}`, import.meta.url)
const token = process.env.X_BEARER_TOKEN

if (!token) {
  console.log('No X_BEARER_TOKEN secret — skipping wire fetch.')
  process.exit(0)
}

// Well-known NHL insiders; league-wide coverage, no team slant.
const DEFAULT_QUERY =
  '(from:FriedgeHNIC OR from:PierreVLeBrun OR from:DarrenDreger OR from:frank_seravalli ' +
  'OR from:reporterchris OR from:KevinWeekes) ' +
  '(trade OR traded OR trading OR acquire OR acquired OR signs OR signed OR signing ' +
  'OR extension OR waivers OR recalled OR scratched OR lineup OR "starting goalie" ' +
  'OR injury OR IR OR LTIR) -is:retweet -is:reply'

const query = process.env.X_WIRE_QUERY || DEFAULT_QUERY

const params = new URLSearchParams({
  query,
  max_results: '25',
  'tweet.fields': 'created_at,author_id',
  expansions: 'author_id',
  'user.fields': 'name,username',
})

const res = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
  headers: { Authorization: `Bearer ${token}` },
})

if (!res.ok) {
  const body = await res.text().catch(() => '')
  console.log(`X API responded ${res.status}. ${body.slice(0, 300)}`)
  if (res.status === 401) console.log('Token rejected — check the X_BEARER_TOKEN secret.')
  if (res.status === 403)
    console.log(
      'Search denied — this token\'s tier has no read/search access. ' +
        'Tweet search needs the Basic tier or above on developer.x.com.',
    )
  // Keep whatever wire.json already holds rather than clobbering it.
  process.exit(0)
}

const data = await res.json()
const users = new Map((data.includes?.users ?? []).map((u) => [u.id, u]))
const tweets = (data.data ?? []).map((t) => {
  const u = users.get(t.author_id)
  return {
    id: t.id,
    text: t.text,
    author: u?.name ?? 'Unknown',
    handle: u?.username ?? '',
    createdAt: t.created_at ?? null,
    url: u?.username ? `https://x.com/${u.username}/status/${t.id}` : `https://x.com/i/status/${t.id}`,
  }
})

// Preserve ordering (newest first from the API) and cap the payload.
const out = { updatedAt: new Date().toISOString(), tweets: tweets.slice(0, 20) }

// Only rewrite when something actually changed, so refresh commits stay clean.
let previous = null
try {
  previous = JSON.parse(readFileSync(dataUrl('wire.json'), 'utf8'))
} catch {
  // First run — no existing file to compare.
}
const sameTweets =
  previous && JSON.stringify(previous.tweets ?? []) === JSON.stringify(out.tweets)
if (sameTweets) {
  console.log(`Wire unchanged (${out.tweets.length} tweets).`)
} else {
  writeFileSync(dataUrl('wire.json'), JSON.stringify(out) + '\n')
  console.log(`Wrote wire.json (${out.tweets.length} tweets).`)
}
