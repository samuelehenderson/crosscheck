// Feedback / bug-report widget: a header button opening a small modal that
// posts to /api/feedback, which relays to a private webhook. Captures the
// current page and browser automatically so bug reports arrive with context.

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

type FeedbackType = 'bug' | 'idea' | 'other'
type Phase = 'idle' | 'sending' | 'sent' | 'error'

const TYPE_OPTIONS: { key: FeedbackType; label: string }[] = [
  { key: 'bug', label: 'Bug' },
  { key: 'idea', label: 'Idea' },
  { key: 'other', label: 'Other' },
]

export function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [type, setType] = useState<FeedbackType>('bug')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [note, setNote] = useState('')

  const close = () => {
    setOpen(false)
    setPhase('idle')
    setNote('')
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const submit = async () => {
    if (!message.trim() || phase === 'sending') return
    setPhase('sending')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message: message.trim(),
          contact: contact.trim(),
          page: window.location.hash || '#/',
          ua: navigator.userAgent,
        }),
      })
      const j = (await res.json()) as { ok: boolean; reason?: string }
      if (j.ok) {
        setPhase('sent')
        setMessage('')
        window.setTimeout(close, 1800)
      } else {
        setPhase('error')
        setNote(
          j.reason === 'not-configured'
            ? "Feedback isn't hooked up yet — check back soon."
            : "Couldn't send right now — please try again.",
        )
      }
    } catch {
      setPhase('error')
      setNote("Couldn't send right now — please try again.")
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-300 ring-1 ring-rink-700 transition hover:text-white"
        aria-label="Send feedback or report a bug"
        title="Feedback / report a bug"
      >
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
          <path
            d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H9l-4.2 3.4A.6.6 0 0 1 4 20V6Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M8.5 9h7M8.5 12.5h4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Portal: the header's backdrop-blur creates a containing block that
          would trap position:fixed, so the modal mounts on <body>. */}
      {open &&
        createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={close}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-rink-700 bg-rink-850 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-white">Feedback</h2>
                <p className="text-xs text-slate-400">
                  Spotted a bug or have an idea? It goes straight to the team.
                </p>
              </div>
              <button
                onClick={close}
                className="text-slate-500 transition hover:text-slate-300"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {phase === 'sent' ? (
              <div className="mt-6 rounded-lg border border-up/30 bg-up/10 px-4 py-3 text-sm font-semibold text-up">
                Sent — thank you!
              </div>
            ) : (
              <div className="mt-4 space-y-3.5">
                <div className="flex gap-1.5">
                  {TYPE_OPTIONS.map((o) => (
                    <button
                      key={o.key}
                      onClick={() => setType(o.key)}
                      className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                        type === o.key
                          ? 'bg-ice-400 text-rink-950'
                          : 'bg-rink-700 text-slate-300 hover:text-white'
                      }`}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>

                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder={
                    type === 'bug'
                      ? 'What happened, and what did you expect instead?'
                      : 'Tell us what you’re thinking…'
                  }
                  className="w-full resize-none rounded-lg border border-rink-700 bg-rink-900 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-ice-400/60"
                />

                <input
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  maxLength={200}
                  placeholder="Contact (optional — email or @handle)"
                  className="w-full rounded-lg border border-rink-700 bg-rink-900 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-ice-400/60"
                />

                {phase === 'error' && <p className="text-xs font-semibold text-down">{note}</p>}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] text-slate-600">
                    Includes the page you're on, so bugs are easy to trace.
                  </span>
                  <button
                    onClick={submit}
                    disabled={!message.trim() || phase === 'sending'}
                    className="rounded-lg bg-ice-400 px-4 py-2 text-sm font-bold text-rink-950 transition hover:bg-ice-300 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {phase === 'sending' ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
