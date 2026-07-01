// Regenerates api/_seed.js from the division JSON files. The serverless
// function embeds the seed as a JS module (rather than importing JSON) so it
// loads reliably on Vercel's ESM runtime. Run: npm run gen:seed
import { readFileSync, writeFileSync } from 'node:fs'

const files = ['atlantic', 'metropolitan', 'central', 'pacific']
const combined = files.flatMap((f) =>
  JSON.parse(readFileSync(new URL(`../src/data/${f}.json`, import.meta.url), 'utf8')),
)

const header = `// AUTO-GENERATED from src/data/*.json — do not edit by hand.
// Regenerate with: npm run gen:seed
// Embedded as a JS module (not a JSON import) so the Vercel serverless
// function loads reliably across Node/ESM versions.

`

writeFileSync(
  new URL('../api/_seed.js', import.meta.url),
  header + 'export const SEED = ' + JSON.stringify(combined) + '\n',
)

const players = combined.reduce((n, t) => n + t.roster.length, 0)
console.log(`wrote api/_seed.js with ${combined.length} teams, ${players} players`)
