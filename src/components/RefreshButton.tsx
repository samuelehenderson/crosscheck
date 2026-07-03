// The header freshness badge, now interactive: shows when rosters were last
// refreshed, and on tap (1) asks the backend to kick the data-refresh pipeline
// and (2) polls the deployed timestamp, auto-reloading the page the moment a
// fresh deploy is live. Even without the trigger configured it still detects
// newer deploys and reloads.

import { useEffect, useRef, useState } from 'react'
import { UPDATED_AT } from '../data'

type Phase = 'idle' | 'working' | 'upToDate' | 'error'

function relTime(date: Date): string {
  const mins = Math.max(1, Math.round((Date.now() - date.getTime()) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/** True when the statically-served timestamp is newer than the bundled one —
 *  i.e. a fresh deployment is live and a reload will pick it up. */
async function deployIsNewer(): Promise<boolean> {
  try {
    const res = await fetch(`/updatedAt.json?cb=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) return false
    const j = (await res.json()) as { updatedAt?: string }
    if (!j.updatedAt) return false
    return new Date(j.updatedAt).getTime() > new Date(UPDATED_AT).getTime() + 1000
  } catch {
    return false
  }
}

export function RefreshButton() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [note, setNote] = useState('')
  const pollRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current)
  }, [])

  const date = new Date(UPDATED_AT)
  const freshness = Number.isNaN(date.getTime()) ? '' : relTime(date)

  const run = async () => {
    if (phase === 'working') return
    setPhase('working')
    setNote('Checking…')

    // Fast path: a newer deploy already exists (e.g. a scheduled refresh
    // landed since this tab loaded) — just reload into it.
    if (await deployIsNewer()) {
      setNote('Updating…')
      window.location.reload()
      return
    }

    // Ask the backend to kick the refresh pipeline.
    let triggered = false
    try {
      const res = await fetch('/api/refresh', { method: 'POST' })
      const j = (await res.json()) as { ok: boolean; reason: string }
      triggered = j.ok
      if (!j.ok && j.reason === 'not-configured') {
        setPhase('upToDate')
        setNote('Up to date')
        window.setTimeout(() => setPhase('idle'), 2500)
        return
      }
    } catch {
      /* endpoint unavailable (local preview) — fall through to up-to-date */
    }

    if (!triggered) {
      setPhase('upToDate')
      setNote('Up to date')
      window.setTimeout(() => setPhase('idle'), 2500)
      return
    }

    // Pipeline kicked: poll for the new deploy (~4 min budget), then reload.
    setNote('Refreshing…')
    let tries = 0
    pollRef.current = window.setInterval(async () => {
      tries++
      if (await deployIsNewer()) {
        if (pollRef.current) window.clearInterval(pollRef.current)
        setNote('Updating…')
        window.location.reload()
      } else if (tries >= 16) {
        if (pollRef.current) window.clearInterval(pollRef.current)
        setPhase('upToDate')
        setNote('Refresh queued — new data lands in a few minutes')
        window.setTimeout(() => setPhase('idle'), 4000)
      }
    }, 15000)
  }

  const label =
    phase === 'working' || phase === 'upToDate' ? note : freshness ? `Rosters · ${freshness}` : 'Refresh'

  return (
    <button
      onClick={run}
      disabled={phase === 'working'}
      title="Refresh rosters, stats, injuries & free agents from the NHL feed"
      className="inline-flex items-center gap-1.5 rounded-full bg-rink-850 px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-rink-700 transition hover:text-slate-200 disabled:opacity-80"
    >
      <span className={phase === 'working' ? 'animate-spin' : ''}>↻</span>
      <span className="hidden md:inline">{label}</span>
    </button>
  )
}
