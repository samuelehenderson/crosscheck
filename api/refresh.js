// POST /api/refresh — kicks the "Refresh rosters" GitHub Action so the site's
// data re-pulls from the NHL/ESPN feeds on demand.
//
// Requires a GITHUB_REFRESH_TOKEN env var on Vercel (a fine-grained PAT with
// Actions read/write on this repo). Without it, the endpoint reports
// not-configured and the in-app button falls back to check-and-reload only.
//
// A 5-minute cooldown (checked against the workflow's own run history) keeps
// strangers from burning Action minutes by spamming the button.

const OWNER = 'samuelehenderson'
const REPO = 'icemetrix'
const WORKFLOW = 'refresh-rosters.yml'
const COOLDOWN_MS = 5 * 60 * 1000

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'method-not-allowed' })
    return
  }

  const token = process.env.GITHUB_REFRESH_TOKEN
  if (!token) {
    res.status(200).json({ ok: false, reason: 'not-configured' })
    return
  }

  const gh = (path, init = {}) =>
    fetch(`https://api.github.com/repos/${OWNER}/${REPO}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'icemetrix-refresh-button',
        ...(init.headers || {}),
      },
    })

  try {
    // Cooldown: if a run started recently (or is in flight), don't dispatch.
    const runsRes = await gh(`/actions/workflows/${WORKFLOW}/runs?per_page=1`)
    if (runsRes.ok) {
      const runs = await runsRes.json()
      const latest = runs.workflow_runs?.[0]
      if (latest) {
        const startedAgo = Date.now() - new Date(latest.run_started_at).getTime()
        if (latest.status !== 'completed' || startedAgo < COOLDOWN_MS) {
          res.status(200).json({ ok: true, reason: 'already-running' })
          return
        }
      }
    }

    const dispatch = await gh(`/actions/workflows/${WORKFLOW}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref: 'main' }),
    })
    if (dispatch.status === 204) {
      res.status(200).json({ ok: true, reason: 'triggered' })
    } else {
      res.status(200).json({ ok: false, reason: `github-${dispatch.status}` })
    }
  } catch (err) {
    res.status(200).json({ ok: false, reason: err instanceof Error ? err.message : 'error' })
  }
}
