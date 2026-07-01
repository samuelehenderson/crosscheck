// Tiny shared presentational primitives.

import type { Delta } from '../lib/format'

export function DeltaBadge({ delta, className = '' }: { delta: Delta; className?: string }) {
  const color =
    delta.direction === 'up'
      ? 'text-up'
      : delta.direction === 'down'
        ? 'text-down'
        : 'text-slate-500'
  return <span className={`tabular-nums font-semibold ${color} ${className}`}>{delta.label}</span>
}

/** The rounded, slightly-inset value pill used throughout the stat tables. */
export function ValuePill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'before' | 'after'
}) {
  const tones: Record<string, string> = {
    default: 'bg-rink-700 text-slate-200',
    before: 'bg-rink-700/70 text-slate-300',
    after: 'bg-ice-400/20 text-ice-300 ring-1 ring-ice-400/30',
  }
  return (
    <span
      className={`inline-flex min-w-[3.25rem] justify-center rounded-md px-2 py-1 text-sm font-semibold tabular-nums ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Arrow() {
  return <span className="px-1 text-slate-500">→</span>
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
      {children}
    </div>
  )
}
