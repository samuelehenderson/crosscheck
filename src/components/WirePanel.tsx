// "The Wire": a single live feed merging NHL headlines from public RSS
// outlets (news.json — free, keyless) with insider posts from the X API
// (wire.json — needs the paid X_BEARER_TOKEN). Sorted newest-first; renders
// nothing until at least one pipeline has produced items.

import { NEWS, WIRE } from '../data'

interface FeedItem {
  key: string
  source: string
  handle: string | null
  text: string
  url: string
  time: string | null
}

function ago(iso: string | null): string {
  if (!iso) return ''
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.round(hrs / 24)}d`
}

export function WirePanel() {
  const items: FeedItem[] = [
    ...WIRE.tweets.map((t) => ({
      key: `x-${t.id}`,
      source: t.author,
      handle: t.handle ? `@${t.handle}` : null,
      text: t.text,
      url: t.url,
      time: t.createdAt,
    })),
    ...NEWS.items.map((n) => ({
      key: `news-${n.url}`,
      source: n.source,
      handle: null,
      text: n.title,
      url: n.url,
      time: n.publishedAt,
    })),
  ].sort((a, b) => {
    const ta = a.time ? new Date(a.time).getTime() : 0
    const tb = b.time ? new Date(b.time).getTime() : 0
    return tb - ta
  })

  if (items.length === 0) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white">The Wire</h2>
        <p className="text-sm text-slate-400">
          Live trade, signing, and injury news — pulled automatically from league-wide outlets
          {WIRE.tweets.length > 0 ? ' and NHL insiders on X' : ''}.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {items.slice(0, 10).map((it) => (
          <a
            key={it.key}
            href={it.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-rink-700 bg-rink-850/60 p-4 transition hover:border-ice-400/40"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-bold text-white">{it.source}</span>
              <span className="shrink-0 text-[11px] text-slate-500">
                {it.handle ? `${it.handle} · ` : ''}
                {ago(it.time)}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-slate-300">{it.text}</p>
            <span className="mt-2 inline-block text-[11px] font-semibold text-ice-300 opacity-0 transition group-hover:opacity-100">
              Read →
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
