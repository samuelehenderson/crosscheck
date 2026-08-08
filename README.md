# IceMetrix

**icemetricstemp.vercel.app** — NHL rosters, trades, contracts & live news for
all 32 teams. One neutral model, live data, zero favorites.

## What's inside

- **Trade Center** — NHL-game-style deal builder: stack pieces on both sides
  and watch each team's letter grade (A+ → F) move live, driven by a
  transparent value model (exponential in rating, age curve, diminishing
  depth pieces).
- **Projections** — projected points, playoff / Cup / lottery odds from a
  deterministic engine (`src/sim/engine.ts`) plus a Monte Carlo simulator
  behind "Run Simulation". Identical math for every club.
- **Rosters as real lineups** — forwards balanced into Lines 1–4 (surplus
  natural centers shift to the wings like real depth charts), defense pairs,
  starter/backup goalies.
- **PuckPayroll** — the contract engine: project a market AAV × term for any
  player, with cap share and the CBA 20% clamp.
- **The Wire** — live NHL headlines from public RSS feeds (ESPN, Sportsnet,
  Daily Faceoff, CBC), optional X insider posts, and the IceMetrix Media
  creator hub.
- **Prospects** — the IceMetrix prospect board plus a draft lottery simulator
  running the modern NHL rules (two weighted draws, ten-spot max jump) over
  the current projections.
- **Free agents, league leaders, schedules, game-day cards** — full-season
  schedules per team; official lineups, starting goalies, and scores flow in
  automatically on game days.
- **Admin portal** (`/#/admin`) — GitHub-backed: announcements, media
  publishing, player-rating overrides, the prospect board, and on-demand data
  refreshes. Every edit is a commit; the site redeploys itself.

## Tech

- Vite + React + TypeScript, Tailwind CSS (CSS-variable theme, light/dark)
- Fully client-side — deploys as static files; the only serverless pieces are
  tiny relays (`api/feedback.js`, `api/refresh.js`).

## Data pipeline

A scheduled GitHub Action (`.github/workflows/refresh-rosters.yml`) runs every
6 hours from GitHub's network (the NHL API blocks many cloud IPs), pulling
rosters, three seasons of stats, injuries, free agents, schedules, the daily
scoreboard, and news — and commits the refreshed `src/data/*.json`, which
triggers a redeploy. Ratings are hand-curated where overridden (admin portal)
and otherwise derived from a 3-year recency-weighted two-way stat model.

Optional repo secrets: `DISCORD_WEBHOOK` (pipeline alerts),
`VERCEL_DEPLOY_HOOK` (explicit deploys), `X_BEARER_TOKEN` (insider posts on
the Wire). Vercel env: `FEEDBACK_WEBHOOK_URL` (in-app feedback → Discord),
`GITHUB_REFRESH_TOKEN` (in-app refresh button).

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build to dist/
```

## License & data notes

MIT licensed. Roster/stat/injury data comes from the NHL's and ESPN's public
feeds at refresh time; team names and logos are trademarks of the NHL and its
member clubs. Ratings, projections, grades, and contract figures are this
project's own estimates and are not official.
