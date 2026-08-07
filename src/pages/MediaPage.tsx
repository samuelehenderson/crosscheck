// Media hub concept demo: a creator-powered publishing page. Content lives as
// data in the repo (src/data/media.json) — the same content-in-repo pipeline
// the roster refresh uses, which is exactly how a real version could work:
// creators submit → content lands in the repo/CMS → the site redeploys.

import { useMemo, useState } from 'react'
import mediaData from '../data/media.json'
import { initials } from '../lib/format'

interface MediaItem {
  id: string
  type: 'article' | 'graphic' | 'report'
  title: string
  summary: string
  body?: string[]
  creator: { name: string; handle: string }
  tags: string[]
  publishedAt: string
  readMinutes?: number
  featured?: boolean
}

type Filter = 'all' | 'article' | 'graphic' | 'report'

const DATA = mediaData as { brand: string; tagline: string; items: MediaItem[] }

const TYPE_META: Record<MediaItem['type'], { label: string; tone: string; icon: string }> = {
  article: { label: 'Article', tone: 'bg-ice-400/15 text-ice-300 ring-ice-400/30', icon: '📝' },
  graphic: { label: 'Graphic', tone: 'bg-amber-400/15 text-amber-300 ring-amber-400/30', icon: '📊' },
  report: { label: 'Report', tone: 'bg-up/15 text-up ring-up/30', icon: '📋' },
}

function fmtDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function CreatorChip({ creator }: { creator: MediaItem['creator'] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="grid h-6 w-6 place-items-center rounded-full bg-rink-700 text-[9px] font-bold text-slate-200">
        {initials(creator.name)}
      </span>
      <span className="text-xs font-medium text-slate-300">{creator.name}</span>
      <span className="text-[11px] text-slate-500">{creator.handle}</span>
    </span>
  )
}

function TypeBadge({ type }: { type: MediaItem['type'] }) {
  const m = TYPE_META[type]
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1 ${m.tone}`}>
      {m.icon} {m.label}
    </span>
  )
}

function ReaderModal({ item, onClose }: { item: MediaItem; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-rink-700 bg-rink-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <TypeBadge type={item.type} />
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded text-slate-400 hover:bg-rink-700 hover:text-white"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <h2 className="text-xl font-black leading-snug text-white">{item.title}</h2>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <CreatorChip creator={item.creator} />
            <span>{fmtDate(item.publishedAt)}</span>
            {item.readMinutes && <span>{item.readMinutes} min read</span>}
          </div>
          <div className="space-y-3 pt-1 text-sm leading-relaxed text-slate-300">
            {(item.body ?? [item.summary]).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <p className="pt-2 text-[11px] text-slate-600">
            Sample content — this is a concept demo of a creator media hub.
          </p>
        </div>
      </div>
    </div>
  )
}

export function MediaPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [reading, setReading] = useState<MediaItem | null>(null)

  const featured = DATA.items.find((i) => i.featured) ?? DATA.items[0]
  const rest = useMemo(
    () =>
      DATA.items
        .filter((i) => i.id !== featured.id)
        .filter((i) => filter === 'all' || i.type === filter),
    [featured.id, filter],
  )

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-black text-white">{DATA.brand}</h1>
          <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 ring-1 ring-amber-400/30">
            Concept demo
          </span>
        </div>
        <p className="text-sm text-slate-400">{DATA.tagline}</p>
      </div>

      {/* Featured */}
      <button
        onClick={() => setReading(featured)}
        className="block w-full overflow-hidden rounded-2xl border border-rink-700 text-left transition hover:border-ice-400/40"
        style={{ background: 'linear-gradient(135deg, #1a2436 0%, #131b2b 50%, #0e1420 100%)' }}
      >
        <div className="space-y-3 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <span className="rounded bg-down/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-down">
              Featured
            </span>
            <TypeBadge type={featured.type} />
          </div>
          <h2 className="text-xl font-black leading-snug text-white sm:text-2xl">{featured.title}</h2>
          <p className="max-w-2xl text-sm text-slate-400">{featured.summary}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            <CreatorChip creator={featured.creator} />
            <span>{fmtDate(featured.publishedAt)}</span>
            {featured.readMinutes && <span>{featured.readMinutes} min read</span>}
          </div>
        </div>
      </button>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        {(['all', 'article', 'graphic', 'report'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
              filter === f
                ? 'bg-ice-400 text-rink-950'
                : 'bg-rink-850 text-slate-400 ring-1 ring-rink-700 hover:text-slate-200'
            }`}
          >
            {f === 'all' ? 'All content' : `${f}s`}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {rest.map((item) => (
          <button
            key={item.id}
            onClick={() => setReading(item)}
            className="flex flex-col gap-2.5 rounded-2xl border border-rink-700 bg-rink-900/40 p-4 text-left transition hover:border-ice-400/40 hover:bg-rink-850/60"
          >
            <div className="flex items-center justify-between gap-2">
              <TypeBadge type={item.type} />
              <span className="text-[11px] tabular-nums text-slate-500">{fmtDate(item.publishedAt)}</span>
            </div>
            <h3 className="font-bold leading-snug text-slate-100">{item.title}</h3>
            <p className="text-xs leading-relaxed text-slate-400">{item.summary}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
              <CreatorChip creator={item.creator} />
              {item.readMinutes && <span className="text-[11px] text-slate-500">{item.readMinutes} min</span>}
            </div>
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] leading-relaxed text-slate-600">
        How this would work for real: creators submit through a portal (or a shared repo/CMS), an
        editor approves, and the page redeploys automatically — the exact pipeline this site already
        uses for roster data. All content above is sample copy.
      </p>

      {reading && <ReaderModal item={reading} onClose={() => setReading(null)} />}
    </div>
  )
}
