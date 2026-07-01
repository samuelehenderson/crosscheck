# CrossCheck

An NHL roster & trade simulator for **all 32 teams**. Pick a team, see its
projected points, playoff odds, and Stanley Cup odds — then build trades and
watch the projections update in real time (before → after).

Inspired by the classic team-projection card format, rebuilt as an extensible
foundation you can keep building on.

## Features

- **All 32 teams**, grouped by division, each with a full roster laid out by
  position (LW / C / RW / LD / RD / G).
- **Projections** — projected points, playoff odds, Stanley Cup odds, and
  draft-lottery odds, derived from player ratings by a transparent, tunable
  simulation engine (`src/sim/engine.ts`).
- **Trade machine** — click any player to send them to another team. The
  before/after columns, roster ranks, and league power rankings all recompute
  instantly. Trades persist across refreshes.
- **Power Rankings** — a sortable league-wide table of every team by projected
  strength, including pending trades.

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

## Data

Rosters live as JSON per division under `src/data/` and are approximate,
editable snapshots of 2025-26 NHL lineups. Player ratings are our own
estimates, not official — edit the JSON to correct or extend them.

## Roadmap / build-on ideas

- Salary cap & contracts, so trades have to be cap-legal
- Draft-pick assets in trades and a draft board
- Multi-team trades and a dedicated trade-builder page
- Real player headshots / official logos (currently stylized crests)
- Save & share trade scenarios via URL
- A full Monte-Carlo season simulator behind "Run Simulation"
