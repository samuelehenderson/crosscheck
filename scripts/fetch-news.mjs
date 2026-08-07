// Fetches NHL headlines from public RSS feeds and writes src/data/news.json
// for the landing-page Wire section. No API keys required — this is the free
// counterpart to the X wire (scripts/fetch-wire.mjs); the panel merges both.
//
// Each feed is best-effort: one outlet being down or changing URLs never
// blocks the others or the data refresh.

import { readFileSync, writeFileSync } from 'fs'

const dataUrl = (f) => new URL(`../src/data/${f}`, import.meta.url)
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; PuckPayroll/1.0)' }

const FEEDS = [
  { source: 'ESPN NHL', url: 'https://www.espn.com/espn/rss/nhl/news' },
  { source: 'Sportsnet', url: 'https://www.sportsnet.ca/hockey/nhl/feed/' },
  { source: 'Daily Faceoff', url: 'https://www.dailyfaceoff.com/feed/' },
  { source: 'CBC Sports', url: 'https://www.cbc.ca/webfeed/rss/rss-sports-hockey' },
]

const MAX_PER_FEED = 10
const MAX_TOTAL = 24
const MAX_AGE_DAYS = 7

/** Minimal RSS <item> parser — title, link, pubDate; tolerates CDATA. */
function parseItems(xml) {
  const items = []
  const blocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? []
  for (const block of blocks) {
    const pick = (tag) => {
      const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
      if (!m) return null
      return m[1]
        .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCodePoint(parseInt(n, 16)))
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .trim()
    }
    const title = pick('title')
    const link = pick('link') ?? pick('guid')
    const pubDate = pick('pubDate') ?? pick('dc:date')
    if (title && link && /^https?:\/\//.test(link)) items.push({ title, link, pubDate })
  }
  return items
}

const cutoff = Date.now() - MAX_AGE_DAYS * 24 * 3600 * 1000
const collected = []

for (const feed of FEEDS) {
  try {
    const res = await fetch(feed.url, { headers: UA, redirect: 'follow' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const xml = await res.text()
    const items = parseItems(xml)
      .map((it) => ({
        source: feed.source,
        title: it.title,
        url: it.link,
        publishedAt: it.pubDate ? new Date(it.pubDate).toISOString() : null,
      }))
      .filter((it) => !it.publishedAt || new Date(it.publishedAt).getTime() > cutoff)
      .slice(0, MAX_PER_FEED)
    collected.push(...items)
    console.log(`${feed.source}: ${items.length} item(s).`)
  } catch (e) {
    console.log(`${feed.source} unavailable (${e.message}); continuing.`)
  }
}

collected.sort((a, b) => {
  const ta = a.publishedAt ? new Date(a.publishedAt).getTime() : 0
  const tb = b.publishedAt ? new Date(b.publishedAt).getTime() : 0
  return tb - ta
})
const out = { updatedAt: new Date().toISOString(), items: collected.slice(0, MAX_TOTAL) }

// Skip the rewrite when nothing changed so refresh commits stay clean, and
// keep the previous file when every feed failed rather than blanking the wire.
let previous = null
try {
  previous = JSON.parse(readFileSync(dataUrl('news.json'), 'utf8'))
} catch {
  // First run.
}
if (out.items.length === 0 && previous?.items?.length) {
  console.log('All feeds failed — keeping the previous news.json.')
} else if (previous && JSON.stringify(previous.items ?? []) === JSON.stringify(out.items)) {
  console.log(`News unchanged (${out.items.length} item(s)).`)
} else {
  writeFileSync(dataUrl('news.json'), JSON.stringify(out) + '\n')
  console.log(`Wrote news.json (${out.items.length} item(s)).`)
}
