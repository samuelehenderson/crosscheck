// POST /api/feedback — relays in-app feedback / bug reports to a webhook so
// the webhook URL never ships to the browser.
//
// Requires a FEEDBACK_WEBHOOK_URL env var on Vercel. Discord and Slack
// webhook URLs are formatted natively ({content} / {text}); anything else
// receives the raw JSON payload. Without the env var the endpoint reports
// not-configured and the in-app form tells the user.

const MAX_MESSAGE = 2000
const TYPES = new Set(['bug', 'idea', 'other'])

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, reason: 'method-not-allowed' })
    return
  }

  const url = process.env.FEEDBACK_WEBHOOK_URL
  if (!url) {
    res.status(200).json({ ok: false, reason: 'not-configured' })
    return
  }

  const body = req.body ?? {}
  const type = TYPES.has(body.type) ? body.type : 'other'
  const message = String(body.message ?? '').trim().slice(0, MAX_MESSAGE)
  const contact = String(body.contact ?? '').trim().slice(0, 200)
  const page = String(body.page ?? '').trim().slice(0, 300)
  const ua = String(body.ua ?? '').trim().slice(0, 300)
  if (!message) {
    res.status(200).json({ ok: false, reason: 'empty-message' })
    return
  }

  const label = { bug: '🐛 Bug report', idea: '💡 Idea', other: '💬 Feedback' }[type]
  const lines = [
    `**${label}** — PuckPayroll`,
    message,
    contact && `— contact: ${contact}`,
    page && `— page: ${page}`,
    ua && `— ua: ${ua}`,
  ].filter(Boolean)
  const text = lines.join('\n')

  // Discord caps content at 2000 chars; Slack is fine with more but keep parity.
  const payload = url.includes('discord.com/api/webhooks')
    ? { content: text.slice(0, 1990) }
    : url.includes('hooks.slack.com')
      ? { text: text.slice(0, 1990) }
      : { type, message, contact, page, ua }

  try {
    const hook = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (hook.ok || hook.status === 204) {
      res.status(200).json({ ok: true })
    } else {
      res.status(200).json({ ok: false, reason: `webhook-${hook.status}` })
    }
  } catch (err) {
    res.status(200).json({ ok: false, reason: err instanceof Error ? err.message : 'error' })
  }
}
