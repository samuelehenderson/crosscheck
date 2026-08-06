# CrossCheck

An NHL roster & trade simulator for **all 32 teams**. Pick a team, see its
projected points, playoff odds, and Stanley Cup odds — then build trades and
watch the projections update in real time (before → after).

Inspired by the classic team-projection card format, rebuilt as an extensible
foundation you can keep building on.

## Features

- **All 32 teams**, grouped by division, each with a full roster laid out by
  position (LW / C / RW / LD / RD / G), live season stat lines, and injuries.
- **Projections** — projected points, playoff odds, Stanley Cup odds, and
  draft-lottery odds from a transparent, tunable engine (`src/sim/engine.ts`),
  plus a **Monte Carlo simulator** (`src/sim/monteCarlo.ts`) that plays out 500
  seasons behind the "Run Simulation" button.
- **Trade machine** — flip on Trade mode and move any player; tap a player
  normally for their detail card (ratings breakdown, stats, injury).
- **Signable free agents** — a live list of unrostered players; sign one to any
  team and the projections move just like trades.
- **Shareable scenarios** — the Share button encodes your trades + signings
  into a URL anyone can open.
- **Power Rankings, League Leaders, player search** across rostered players
  and free agents.
- **Ratings** — hand-curated for established stars, otherwise derived from a
  3-year recency-weighted two-way stat model (production → offense/finishing,
  plus/minus → defense, save % for goalies).

## Tech

- Vite + React + TypeScript
- Tailwind CSS (dark "rink" theme)
- Fully client-side — no backend, deploys as static files.

## Getting started

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## How the simulation works

Each team's roster is reduced to four component strengths — **offense**,
**defense**, **finishing**, and **goaltending** — via weighted averages of its
best players at each spot. Those combine into a composite strength that maps to
projected points, and the whole league is ranked to produce playoff / cup /
draft odds. It is deterministic, so the same roster always yields the same
numbers, which is what makes the before → after trade comparison meaningful.

All the knobs live in the `TUNING` block at the top of `src/sim/engine.ts`.

## Data & staying up to date

Rosters stay current automatically. A scheduled GitHub Action
(`.github/workflows/refresh-rosters.yml`) runs every 6 hours, pulls each team's
current roster from the official NHL feed (`api-web.nhle.com`), and commits the
refreshed `src/data/*.json` back to `main` — which triggers a redeploy. (The
Action runs from GitHub's network because the NHL API blocks requests from many
cloud/serverless IPs, so a runtime fetch from the host isn't reliable.)

Because no NHL feed provides player **ratings**, the refresh script keeps our
curated ratings (matched by name) and assigns a position-based baseline to
players we don't have yet — so edits you make to ratings flow through to live
players automatically. The header shows when the rosters were last refreshed.

Run it manually with `npm run fetch:rosters` (needs open internet), or trigger
the "Refresh rosters" workflow from the GitHub Actions tab.

## Roadmap / build-on ideas

- Salary cap & contracts, so trades have to be cap-legal
- Draft-pick assets in trades and a draft board
- Multi-team trades and a dedicated trade-builder page
- Real player headshots / official logos (currently stylized crests)
- Save & share trade scenarios via URL
- A full Monte-Carlo season simulator behind "Run Simulation"

## License & data notes

MIT licensed — take it, remix it, build on it. Roster/stat/injury data comes
from the NHL's and ESPN's public feeds at refresh time; team names and logos
are trademarks of the NHL and its member clubs (displayed from the league's own
assets — swap them out if you use this commercially). Player ratings are this
project's own estimates and are not official.
