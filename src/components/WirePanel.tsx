// "The Wire": recent trade/lineup/injury tweets from NHL insider accounts,
// pulled by the X pipeline. Renders nothing until wire.json has tweets
// (i.e. until the X_BEARER_TOKEN secret is configured).

import { WIRE } from '../data'

function ago(iso: string | null): string {
  if (!iso) return ''
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 60) return `${mins}m`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.round(hrs / 24)}d`
}

export function WirePanel() {
  if (WIRE.tweets.length === 0) return null

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-white">The Wire</h2>
        <p className="text-sm text-slate-400">
          Latest trade, lineup, and injury chatter from NHL insiders — straight from X.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {WIRE.tweets.slice(0, 8).map((t) => (
          <a
            key={t.id}
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-2xl border border-rink-700 bg-rink-850/60 p-4 transition hover:border-ice-400/40"
          >
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-bold text-white">{t.author}</span>
              <span className="shrink-0 text-[11px] text-slate-500">
                @{t.handle} · {ago(t.createdAt)}
              </span>
            </div>
            <p className="mt-1.5 line-clamp-4 text-sm leading-relaxed text-slate-300">{t.text}</p>
            <span className="mt-2 inline-block text-[11px] font-semibold text-ice-300 opacity-0 transition group-hover:opacity-100">
              Open on X →
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
