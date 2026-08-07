// Admin portal, phase 1: GitHub-backed, no separate backend. Paste a
// fine-grained personal access token (contents read/write + actions on this
// repo) once; it lives in this browser's localStorage only. The portal then
// edits repo files through the GitHub API — announcements, media articles —
// and dispatches the data-refresh workflow. Every save commits to main, which
// redeploys the site (~2 min to live).

import { useEffect, useMemo, useState } from 'react'

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

export function AdminPage() {
  const [user, setUser] = useState<string | null>(null)
  const hasToken = useMemo(() => Boolean(getToken()), [])
  const [ready, setReady] = useState(hasToken)

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
            Publish announcements and media, and refresh the data — straight through GitHub.
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
          <AnnouncementsPanel />
          <MediaPanel />
          <RefreshPanel />
          <p className="text-center text-[11px] leading-relaxed text-slate-600">
            Every save is a commit to <span className="font-mono">{OWNER}/{REPO}</span> — the site
            redeploys itself, so changes are live in about two minutes.
          </p>
        </>
      )}
    </div>
  )
}
