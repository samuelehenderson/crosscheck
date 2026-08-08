// Admin portal, phase 1: GitHub-backed, no separate backend. Paste a
// fine-grained personal access token (contents read/write + actions on this
// repo) once; it lives in this browser's localStorage only. The portal then
// edits repo files through the GitHub API — announcements, media articles —
// and dispatches the data-refresh workflow. Every save commits to main, which
// redeploys the site (~2 min to live).

import { useEffect, useMemo, useState } from 'react'
import { TEAMS, nameKey } from '../data'
import type { Player } from '../types'

const OWNER = 'samuelehenderson'
const REPO = 'crosscheck'
const BRANCH = 'main'
const TOKEN_KEY = 'im.admin.token'

// --- GitHub plumbing ---------------------------------------------------------

function getToken(): string {
  try {
    return localStorage.getItem(TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

async function gh(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  })
}

function b64decode(b64: string): string {
  const bytes = Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function b64encode(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin)
}

/** Read a repo JSON file: parsed value plus the sha needed to write it back. */
async function readJson<T>(path: string): Promise<{ value: T; sha: string }> {
  const res = await gh(`/contents/${path}?ref=${BRANCH}`)
  if (!res.ok) throw new Error(`Read ${path}: HTTP ${res.status}`)
  const j = (await res.json()) as { content: string; sha: string }
  return { value: JSON.parse(b64decode(j.content)) as T, sha: j.sha }
}

async function writeJson(path: string, value: unknown, sha: string, message: string) {
  const res = await gh(`/contents/${path}`, {
    method: 'PUT',
    body: JSON.stringify({
      message,
      content: b64encode(JSON.stringify(value, null, 2) + '\n'),
      sha,
      branch: BRANCH,
    }),
  })
  if (!res.ok) throw new Error(`Write ${path}: HTTP ${res.status}`)
}

// --- Shared bits -------------------------------------------------------------

type Phase = { state: 'idle' | 'busy' | 'ok' | 'error'; note?: string }

function StatusNote({ phase }: { phase: Phase }) {
  if (phase.state === 'idle') return null
  const cls =
    phase.state === 'ok' ? 'text-up' : phase.state === 'error' ? 'text-down' : 'text-slate-400'
  return <p className={`text-xs font-semibold ${cls}`}>{phase.note}</p>
}

const inputCls =
  'w-full rounded-lg border border-rink-700 bg-rink-900 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-ice-400/60'
const labelCls = 'mb-1 block text-[11px] font-semibold uppercase tracking-widest text-slate-500'
const cardCls = 'space-y-3.5 rounded-2xl border border-rink-700 bg-rink-850/70 p-4 sm:p-5'
const primaryBtn =
  'rounded-lg bg-ice-400 px-4 py-2 text-sm font-bold text-rink-950 transition hover:bg-ice-300 disabled:cursor-not-allowed disabled:opacity-40'

// --- Token gate --------------------------------------------------------------

function TokenGate({ onReady }: { onReady: (user: string) => void }) {
  const [token, setToken] = useState('')
  const [phase, setPhase] = useState<Phase>({ state: 'idle' })

  const connect = async () => {
    setPhase({ state: 'busy', note: 'Checking token…' })
    try {
      localStorage.setItem(TOKEN_KEY, token.trim())
      const res = await gh('')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const who = await fetch('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${token.trim()}` },
      })
      const user = who.ok ? ((await who.json()) as { login: string }).login : 'connected'
      setPhase({ state: 'ok', note: `Connected as ${user}.` })
      onReady(user)
    } catch (e) {
      localStorage.removeItem(TOKEN_KEY)
      setPhase({
        state: 'error',
        note: `Couldn't access ${OWNER}/${REPO} with that token — check its repo permissions.`,
      })
    }
  }

  return (
    <div className={cardCls}>
      <h2 className="text-lg font-black text-white">Connect GitHub</h2>
      <p className="text-sm leading-relaxed text-slate-400">
        The portal edits the site through GitHub — no separate backend. Create a{' '}
        <a
          className="font-semibold text-ice-300 hover:text-ice-400"
          href="https://github.com/settings/personal-access-tokens/new"
          target="_blank"
          rel="noopener noreferrer"
        >
          fine-grained personal access token
        </a>{' '}
        scoped to <span className="font-mono text-slate-300">{OWNER}/{REPO}</span> with{' '}
        <strong>Contents: Read and write</strong> and <strong>Actions: Read and write</strong>.
        It's stored only in this browser.
      </p>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="github_pat_…"
        className={inputCls}
      />
      <div className="flex items-center justify-between gap-3">
        <StatusNote phase={phase} />
        <button onClick={connect} disabled={!token.trim() || phase.state === 'busy'} className={primaryBtn}>
          {phase.state === 'busy' ? 'Checking…' : 'Connect'}
        </button>
      </div>
    </div>
  )
}

// --- Announcements -----------------------------------------------------------

interface Announcement {
  id: string
  level?: string
  text: string
  until?: string
}

function AnnouncementsPanel() {
  const [items, setItems] = useState<Announcement[] | null>(null)
  const [sha, setSha] = useState('')
  const [text, setText] = useState('')
  const [level, setLevel] = useState('info')
  const [until, setUntil] = useState('')
  const [phase, setPhase] = useState<Phase>({ state: 'idle' })

  const load = async () => {
    try {
      const { value, sha } = await readJson<{ items: Announcement[] }>(
        'src/data/announcements.json',
      )
      setItems(value.items ?? [])
      setSha(sha)
    } catch (e) {
      setPhase({ state: 'error', note: String(e) })
    }
  }
  useEffect(() => {
    void load()
  }, [])

  const save = async (next: Announcement[], note: string) => {
    setPhase({ state: 'busy', note: 'Publishing…' })
    try {
      await writeJson('src/data/announcements.json', { items: next }, sha, note)
      setItems(next)
      setPhase({ state: 'ok', note: 'Published — live in ~2 minutes.' })
      await load() // refresh sha for the next edit
    } catch (e) {
      setPhase({ state: 'error', note: `${e}` })
    }
  }

  const post = () => {
    if (!text.trim() || !items) return
    const item: Announcement = {
      id: `a-${Date.now().toString(36)}`,
      level,
      text: text.trim(),
      ...(until ? { until } : {}),
    }
    void save([item, ...items], 'admin: post announcement')
    setText('')
  }

  return (
    <div className={cardCls}>
      <h2 className="text-lg font-black text-white">Announcements</h2>
      <div>
        <label className={labelCls}>Message</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={280}
          placeholder="What should every visitor see?"
          className={`${inputCls} resize-none`}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className={labelCls}>Style</label>
          <div className="flex gap-1.5">
            {['info', 'hot', 'alert'].map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                  level === l ? 'bg-ice-400 text-rink-950' : 'bg-rink-700 text-slate-300'
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={labelCls}>Expires (optional)</label>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} className={inputCls} />
        </div>
        <button onClick={post} disabled={!text.trim() || phase.state === 'busy'} className={primaryBtn}>
          Post
        </button>
      </div>
      <StatusNote phase={phase} />
      {items && items.length > 0 && (
        <ul className="space-y-1.5 border-t border-rink-700 pt-3">
          {items.map((it) => (
            <li key={it.id} className="flex items-center gap-2 text-xs text-slate-400">
              <span className="rounded bg-rink-700 px-1.5 py-0.5 text-[9px] font-bold uppercase">
                {it.level ?? 'info'}
              </span>
              <span className="min-w-0 flex-1 truncate">{it.text}</span>
              {it.until && <span className="text-slate-600">until {it.until}</span>}
              <button
                onClick={() => void save(items.filter((x) => x.id !== it.id), 'admin: remove announcement')}
                className="font-semibold text-down/80 hover:text-down"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// --- Media publisher ---------------------------------------------------------

interface MediaItem {
  id: string
  type: string
  title: string
  summary: string
  body?: string[]
  creator: { name: string; handle: string }
  tags: string[]
  publishedAt: string
  readMinutes?: number
  featured?: boolean
}

function MediaPanel() {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('article')
  const [creator, setCreator] = useState('')
  const [handle, setHandle] = useState('')
  const [featured, setFeatured] = useState(false)
  const [phase, setPhase] = useState<Phase>({ state: 'idle' })

  const publish = async () => {
    setPhase({ state: 'busy', note: 'Publishing…' })
    try {
      const { value, sha } = await readJson<{ brand: string; tagline: string; items: MediaItem[] }>(
        'src/data/media.json',
      )
      const paragraphs = body
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
      const item: MediaItem = {
        id: `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${Date.now().toString(36)}`,
        type,
        title: title.trim(),
        summary: summary.trim(),
        ...(paragraphs.length ? { body: paragraphs } : {}),
        creator: { name: creator.trim() || 'IceMetrix', handle: handle.trim() || '@IceMetrix' },
        tags: [],
        publishedAt: new Date().toISOString().slice(0, 10),
        readMinutes: Math.max(1, Math.round(paragraphs.join(' ').split(/\s+/).length / 200)),
        ...(featured ? { featured: true } : {}),
      }
      const items = featured
        ? [item, ...value.items.map((i) => ({ ...i, featured: false }))]
        : [item, ...value.items]
      await writeJson('src/data/media.json', { ...value, items }, sha, `admin: publish "${item.title}"`)
      setPhase({ state: 'ok', note: 'Published — live on the Wire in ~2 minutes.' })
      setTitle('')
      setSummary('')
      setBody('')
    } catch (e) {
      setPhase({ state: 'error', note: `${e}` })
    }
  }

  return (
    <div className={cardCls}>
      <h2 className="text-lg font-black text-white">Publish to IceMetrix Media</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls}>Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Summary (one sentence)</label>
          <input value={summary} onChange={(e) => setSummary(e.target.value)} className={inputCls} />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Body — blank line between paragraphs</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={6}
            className={`${inputCls} resize-y`}
          />
        </div>
        <div>
          <label className={labelCls}>Creator name</label>
          <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="IceMetrix" className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Handle</label>
          <input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@IceMetrix" className={inputCls} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          {['article', 'graphic', 'report'].map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                type === t ? 'bg-ice-400 text-rink-950' : 'bg-rink-700 text-slate-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
          Feature this
        </label>
        <button
          onClick={() => void publish()}
          disabled={!title.trim() || !summary.trim() || phase.state === 'busy'}
          className={`${primaryBtn} ml-auto`}
        >
          Publish
        </button>
      </div>
      <StatusNote phase={phase} />
    </div>
  )
}

// --- Player ratings ----------------------------------------------------------

interface Rating {
  overall: number
  offense: number | null
  defense: number | null
  finishing: number | null
  goaltending: number | null
}

const RATINGS_PATH = 'src/data/curatedRatings.json'

function RatingsPanel({ onNeedApply }: { onNeedApply: () => void }) {
  const [curated, setCurated] = useState<Record<string, Rating> | null>(null)
  const [sha, setSha] = useState('')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<{ player: Player; teamId: string } | null>(null)
  const [form, setForm] = useState<Rating | null>(null)
  const [phase, setPhase] = useState<Phase>({ state: 'idle' })

  const load = async () => {
    try {
      const res = await readJson<Record<string, Rating>>(RATINGS_PATH)
      setCurated(res.value)
      setSha(res.sha)
    } catch (e) {
      setPhase({ state: 'error', note: String(e) })
    }
  }
  useEffect(() => {
    void load()
  }, [])

  const pool = useMemo(
    () =>
      TEAMS.flatMap((t) => t.roster.map((player) => ({ player, teamId: t.id }))).sort(
        (a, b) => b.player.overall - a.player.overall,
      ),
    [],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return pool.filter(({ player }) => player.name.toLowerCase().includes(q)).slice(0, 8)
  }, [pool, query])

  const pick = (hit: { player: Player; teamId: string }) => {
    const key = nameKey(hit.player.name)
    const existing = curated?.[key]
    const p = hit.player
    setSelected(hit)
    setForm(
      existing ?? {
        overall: p.overall,
        offense: p.offense ?? null,
        defense: p.defense ?? null,
        finishing: p.finishing ?? null,
        goaltending: p.goaltending ?? null,
      },
    )
    setQuery('')
    setPhase({ state: 'idle' })
  }

  const save = async () => {
    if (!selected || !form || !curated) return
    setPhase({ state: 'busy', note: 'Saving…' })
    try {
      const key = nameKey(selected.player.name)
      const next = { ...curated, [key]: form }
      await writeJson(
        RATINGS_PATH,
        next,
        sha,
        `admin: rate ${selected.player.name} ${form.overall} OVR`,
      )
      setCurated(next)
      setPhase({
        state: 'ok',
        note: 'Override saved. Hit "Apply ratings" so the rosters rebuild with it.',
      })
      onNeedApply()
      await load()
    } catch (e) {
      setPhase({ state: 'error', note: `${e}` })
    }
  }

  const removeOverride = async () => {
    if (!selected || !curated) return
    const key = nameKey(selected.player.name)
    if (!curated[key]) return
    setPhase({ state: 'busy', note: 'Removing…' })
    try {
      const next = { ...curated }
      delete next[key]
      await writeJson(RATINGS_PATH, next, sha, `admin: clear rating override for ${selected.player.name}`)
      setCurated(next)
      setPhase({
        state: 'ok',
        note: 'Override removed — this player goes back to pure stat-derived ratings on apply.',
      })
      onNeedApply()
      await load()
    } catch (e) {
      setPhase({ state: 'error', note: `${e}` })
    }
  }

  const isGoalie = selected?.player.position === 'G'
  const num = (v: number | null) => (v == null ? '' : String(v))
  const setField = (field: keyof Rating, raw: string) => {
    if (!form) return
    const v = raw === '' ? null : Math.max(40, Math.min(99, Number(raw) || 0))
    setForm({ ...form, [field]: field === 'overall' ? (v ?? 40) : v })
  }

  return (
    <div className={cardCls}>
      <h2 className="text-lg font-black text-white">Player ratings</h2>
      <p className="text-sm leading-relaxed text-slate-400">
        Overrides beat the stat model. Saved changes bake into every roster on the next data
        refresh — use "Apply ratings" below when you're done editing.
      </p>
      <div>
        <label className={labelCls}>Find a player</label>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all rosters…"
          className={inputCls}
        />
        {results.length > 0 && (
          <div className="mt-1.5 overflow-hidden rounded-lg border border-rink-700 bg-rink-900">
            {results.map((hit) => {
              const overridden = curated && curated[nameKey(hit.player.name)]
              return (
                <button
                  key={`${hit.teamId}-${hit.player.id}`}
                  onClick={() => pick(hit)}
                  className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition hover:bg-rink-800"
                >
                  <span className="flex-1 truncate text-sm text-slate-200">{hit.player.name}</span>
                  {overridden && (
                    <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-300">
                      Override
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500">
                    {hit.teamId} · {hit.player.position} · {hit.player.overall}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {selected && form && (
        <div className="space-y-3 rounded-xl border border-rink-700 bg-rink-900/50 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold text-white">{selected.player.name}</div>
              <div className="text-[11px] text-slate-500">
                {selected.teamId} · {selected.player.position} · currently{' '}
                {selected.player.overall} OVR
                {curated?.[nameKey(selected.player.name)] ? ' · has override' : ' · stat-derived'}
              </div>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="text-slate-500 hover:text-slate-300"
              aria-label="Clear selection"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className={labelCls}>Overall</label>
              <input
                type="number"
                min={40}
                max={99}
                value={form.overall}
                onChange={(e) => setField('overall', e.target.value)}
                className={inputCls}
              />
            </div>
            {isGoalie ? (
              <div>
                <label className={labelCls}>Goaltending</label>
                <input
                  type="number"
                  min={40}
                  max={99}
                  value={num(form.goaltending)}
                  onChange={(e) => setField('goaltending', e.target.value)}
                  className={inputCls}
                />
              </div>
            ) : (
              <>
                <div>
                  <label className={labelCls}>Offense</label>
                  <input
                    type="number"
                    min={40}
                    max={99}
                    value={num(form.offense)}
                    onChange={(e) => setField('offense', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Defense</label>
                  <input
                    type="number"
                    min={40}
                    max={99}
                    value={num(form.defense)}
                    onChange={(e) => setField('defense', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className={labelCls}>Finishing</label>
                  <input
                    type="number"
                    min={40}
                    max={99}
                    value={num(form.finishing)}
                    onChange={(e) => setField('finishing', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex items-center justify-between gap-3">
            {curated?.[nameKey(selected.player.name)] ? (
              <button
                onClick={() => void removeOverride()}
                className="text-xs font-semibold text-down/80 hover:text-down"
              >
                Remove override
              </button>
            ) : (
              <span />
            )}
            <button onClick={() => void save()} disabled={phase.state === 'busy'} className={primaryBtn}>
              Save override
            </button>
          </div>
        </div>
      )}
      <StatusNote phase={phase} />
    </div>
  )
}

// --- Prospect board ----------------------------------------------------------

interface ProspectItem {
  rank: number
  name: string
  position: string
  rights: string
  league: string
  note?: string
}

const PROSPECTS_PATH = 'src/data/prospects.json'

function ProspectsPanel() {
  const [doc, setDoc] = useState<{
    updatedAt: string
    title: string
    note?: string
    items: ProspectItem[]
  } | null>(null)
  const [sha, setSha] = useState('')
  const [dirty, setDirty] = useState(false)
  const [phase, setPhase] = useState<Phase>({ state: 'idle' })
  const [draft, setDraft] = useState({ name: '', position: 'C', rights: '', league: '', note: '' })

  const load = async () => {
    try {
      const res = await readJson<NonNullable<typeof doc>>(PROSPECTS_PATH)
      setDoc(res.value)
      setSha(res.sha)
      setDirty(false)
    } catch (e) {
      setPhase({ state: 'error', note: String(e) })
    }
  }
  useEffect(() => {
    void load()
  }, [])

  const renumber = (items: ProspectItem[]) => items.map((it, i) => ({ ...it, rank: i + 1 }))

  const mutate = (items: ProspectItem[]) => {
    if (!doc) return
    setDoc({ ...doc, items: renumber(items) })
    setDirty(true)
  }

  const move = (i: number, dir: -1 | 1) => {
    if (!doc) return
    const items = [...doc.items]
    const j = i + dir
    if (j < 0 || j >= items.length) return
    ;[items[i], items[j]] = [items[j], items[i]]
    mutate(items)
  }

  const add = () => {
    if (!doc || !draft.name.trim()) return
    mutate([
      ...doc.items,
      {
        rank: doc.items.length + 1,
        name: draft.name.trim(),
        position: draft.position.trim() || 'C',
        rights: draft.rights.trim() || 'Draft',
        league: draft.league.trim() || '—',
        ...(draft.note.trim() ? { note: draft.note.trim() } : {}),
      },
    ])
    setDraft({ name: '', position: 'C', rights: '', league: '', note: '' })
  }

  const save = async () => {
    if (!doc) return
    setPhase({ state: 'busy', note: 'Publishing board…' })
    try {
      const out = {
        ...doc,
        updatedAt: new Date().toISOString().slice(0, 10),
        note: undefined, // drop the "sample board" note once a real board ships
      }
      await writeJson(PROSPECTS_PATH, out, sha, 'admin: update prospect board')
      setPhase({ state: 'ok', note: 'Board published — live in ~2 minutes.' })
      await load()
    } catch (e) {
      setPhase({ state: 'error', note: `${e}` })
    }
  }

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-black text-white">Prospect board</h2>
        <button onClick={() => void save()} disabled={!dirty || phase.state === 'busy'} className={primaryBtn}>
          Publish board
        </button>
      </div>
      {doc ? (
        <>
          <ul className="space-y-1">
            {doc.items.map((it, i) => (
              <li key={`${it.name}-${i}`} className="flex items-center gap-2 rounded-lg bg-rink-900/50 px-2 py-1.5 text-xs">
                <span className="w-5 text-right font-black tabular-nums text-ice-400">{it.rank}</span>
                <span className="min-w-0 flex-1 truncate text-slate-200">
                  <span className="font-semibold">{it.name}</span>{' '}
                  <span className="text-slate-500">
                    {it.position} · {it.league} · {it.rights}
                  </span>
                </span>
                <button onClick={() => move(i, -1)} className="text-slate-500 hover:text-white" aria-label="Move up">
                  ▲
                </button>
                <button onClick={() => move(i, 1)} className="text-slate-500 hover:text-white" aria-label="Move down">
                  ▼
                </button>
                <button
                  onClick={() => mutate(doc.items.filter((_, j) => j !== i))}
                  className="font-semibold text-down/80 hover:text-down"
                >
                  remove
                </button>
              </li>
            ))}
          </ul>
          <div className="space-y-2 rounded-xl border border-rink-700 bg-rink-900/50 p-3">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Name"
                className={`${inputCls} col-span-2`}
              />
              <input
                value={draft.position}
                onChange={(e) => setDraft({ ...draft, position: e.target.value })}
                placeholder="Pos"
                className={inputCls}
              />
              <input
                value={draft.league}
                onChange={(e) => setDraft({ ...draft, league: e.target.value })}
                placeholder="League"
                className={inputCls}
              />
              <input
                value={draft.rights}
                onChange={(e) => setDraft({ ...draft, rights: e.target.value })}
                placeholder="Rights (TOR / 2026 Draft)"
                className={`${inputCls} col-span-2`}
              />
              <input
                value={draft.note}
                onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                placeholder="One-line scouting note (optional)"
                className={`${inputCls} col-span-2`}
              />
            </div>
            <button
              onClick={add}
              disabled={!draft.name.trim()}
              className="w-full rounded-lg bg-rink-700 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-rink-600 disabled:opacity-40"
            >
              Add to board
            </button>
          </div>
        </>
      ) : (
        <p className="text-xs text-slate-500">Loading board…</p>
      )}
      <StatusNote phase={phase} />
    </div>
  )
}

// --- Data refresh ------------------------------------------------------------

function RefreshPanel() {
  const [phase, setPhase] = useState<Phase>({ state: 'idle' })

  const run = async () => {
    setPhase({ state: 'busy', note: 'Dispatching…' })
    try {
      const res = await gh('/actions/workflows/refresh-rosters.yml/dispatches', {
        method: 'POST',
        body: JSON.stringify({ ref: BRANCH }),
      })
      if (res.status !== 204) throw new Error(`HTTP ${res.status}`)
      setPhase({
        state: 'ok',
        note: 'Refresh running — rosters, stats, schedules & news update in a few minutes.',
      })
    } catch (e) {
      setPhase({ state: 'error', note: `${e}` })
    }
  }

  return (
    <div className={cardCls}>
      <h2 className="text-lg font-black text-white">Data refresh</h2>
      <p className="text-sm text-slate-400">
        Pulls fresh rosters, stats, injuries, schedules, and news from the league feeds right now
        instead of waiting for the 6-hour cycle.
      </p>
      <div className="flex items-center justify-between gap-3">
        <StatusNote phase={phase} />
        <button onClick={() => void run()} disabled={phase.state === 'busy'} className={primaryBtn}>
          Refresh now
        </button>
      </div>
    </div>
  )
}

// --- Page --------------------------------------------------------------------

type Tab = 'publish' | 'ratings' | 'prospects' | 'data'

const TABS: { key: Tab; label: string }[] = [
  { key: 'publish', label: 'Publish' },
  { key: 'ratings', label: 'Ratings' },
  { key: 'prospects', label: 'Prospects' },
  { key: 'data', label: 'Data' },
]

function ApplyRatingsBar({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>({ state: 'idle' })
  const apply = async () => {
    setPhase({ state: 'busy', note: 'Dispatching rebuild…' })
    try {
      const res = await gh('/actions/workflows/refresh-rosters.yml/dispatches', {
        method: 'POST',
        body: JSON.stringify({ ref: BRANCH }),
      })
      if (res.status !== 204) throw new Error(`HTTP ${res.status}`)
      setPhase({ state: 'ok', note: 'Rebuilding — new ratings live in a few minutes.' })
      window.setTimeout(onDone, 4000)
    } catch (e) {
      setPhase({ state: 'error', note: `${e}` })
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5">
      <span className="text-xs font-semibold text-amber-300">
        {phase.state === 'idle'
          ? 'Rating overrides saved — apply them so rosters rebuild.'
          : (phase.note ?? '')}
      </span>
      <button onClick={() => void apply()} disabled={phase.state === 'busy'} className={primaryBtn}>
        Apply ratings
      </button>
    </div>
  )
}

export function AdminPage() {
  const [user, setUser] = useState<string | null>(null)
  const hasToken = useMemo(() => Boolean(getToken()), [])
  const [ready, setReady] = useState(hasToken)
  const [tab, setTab] = useState<Tab>('publish')
  const [needApply, setNeedApply] = useState(false)

  const signOut = () => {
    try {
      localStorage.removeItem(TOKEN_KEY)
    } catch {
      // ignore
    }
    setReady(false)
    setUser(null)
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Admin</h1>
          <p className="text-sm text-slate-400">
            Announcements, media, player ratings, the prospect board, and data — all straight
            through GitHub.
          </p>
        </div>
        {ready && (
          <button onClick={signOut} className="text-xs font-semibold text-slate-500 hover:text-slate-300">
            {user ? `${user} · ` : ''}sign out
          </button>
        )}
      </div>

      {!ready ? (
        <TokenGate
          onReady={(u) => {
            setUser(u)
            setReady(true)
          }}
        />
      ) : (
        <>
          <div className="flex gap-1.5">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  tab === t.key ? 'bg-ice-400 text-rink-950' : 'bg-rink-700 text-slate-300 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {needApply && <ApplyRatingsBar onDone={() => setNeedApply(false)} />}

          {tab === 'publish' && (
            <>
              <AnnouncementsPanel />
              <MediaPanel />
            </>
          )}
          {tab === 'ratings' && <RatingsPanel onNeedApply={() => setNeedApply(true)} />}
          {tab === 'prospects' && <ProspectsPanel />}
          {tab === 'data' && <RefreshPanel />}

          <p className="text-center text-[11px] leading-relaxed text-slate-600">
            Every save is a commit to <span className="font-mono">{OWNER}/{REPO}</span> — the site
            redeploys itself, so changes are live in about two minutes. Rating overrides
            additionally need "Apply ratings" (a data rebuild) to bake into rosters.
          </p>
        </>
      )}
    </div>
  )
}
