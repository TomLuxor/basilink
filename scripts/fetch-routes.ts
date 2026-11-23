/**
 * Pre-computes the driving route for every ordered pair of sites (docs/decisions.md, D16)
 * and writes them to public/data/routes/. The browser never calls the routing API, so the
 * API key stays secret.
 *
 * Usage:
 *   npm run data:routes              all pairs (17 sites → 272 routes, about 8 minutes)
 *   npm run data:routes -- --missing only pairs not computed yet, e.g. after adding a site
 *
 * The key is read from ORS_API_KEY: locally from .env.local, in GitHub Actions from a secret.
 */
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import simplify from '@turf/simplify'
import type { Feature, LineString } from 'geojson'
import { routeKey, type RouteIndex } from '../src/data/routes.ts'
import { SITES } from '../src/data/sites.ts'
import { roundPositions } from './lib/geometry.ts'
import { openRouteService, RateLimitError, type Route } from './routes/openrouteservice.ts'

const OUTPUT_DIR = new URL('../public/data/routes/', import.meta.url)
const INDEX_FILE = new URL('index.json', OUTPUT_DIR)

/** The free ORS plan allows 40 directions requests per minute; 1.6 s keeps us at 37.5. */
const PAUSE_MS = 1600
/** After HTTP 429, wait a full minute before retrying. */
const RATE_LIMIT_WAIT_MS = 60_000
/** About 2 m: keeps the files small without visibly changing the route. */
const SIMPLIFY_TOLERANCE_DEG = 0.00002

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function readExistingIndex(): Promise<RouteIndex | null> {
  try {
    return JSON.parse(await readFile(INDEX_FILE, 'utf8')) as RouteIndex
  } catch {
    return null
  }
}

async function getRouteWithRetry(getRoute: () => Promise<Route>): Promise<Route> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await getRoute()
    } catch (error) {
      if (!(error instanceof RateLimitError) || attempt === 3) throw error
      console.log(`Rate limit reached, waiting ${RATE_LIMIT_WAIT_MS / 1000} s …`)
      await sleep(RATE_LIMIT_WAIT_MS)
    }
  }
}

function toGeometryFile(route: Route): Feature<LineString> {
  const simplified = simplify(route.geometry, { tolerance: SIMPLIFY_TOLERANCE_DEG })
  return {
    type: 'Feature',
    properties: { distanceM: route.distanceM, durationS: route.durationS },
    geometry: { type: 'LineString', coordinates: roundPositions(simplified.coordinates) },
  }
}

/** Writes the index with sorted keys so that unchanged routes give an unchanged file. */
async function writeIndex(index: RouteIndex) {
  const routes = Object.fromEntries(
    Object.entries(index.routes).sort(([a], [b]) => a.localeCompare(b)),
  )
  await writeFile(INDEX_FILE, `${JSON.stringify({ ...index, routes }, null, 2)}\n`)
}

const apiKey = process.env.ORS_API_KEY
if (!apiKey) {
  console.error('ORS_API_KEY is not set. Put it in .env.local (local) or a repository secret (CI).')
  process.exit(1)
}

const onlyMissing = process.argv.includes('--missing')
const provider = openRouteService(apiKey)
const existing = onlyMissing ? await readExistingIndex() : null
const pairs = SITES.flatMap((from) =>
  SITES.filter((to) => to.id !== from.id).map((to) => ({ from, to })),
)

const index: RouteIndex = {
  provider: provider.name,
  attribution: provider.attribution,
  computedOn: new Date().toISOString().slice(0, 10),
  routes: {},
}
await mkdir(OUTPUT_DIR, { recursive: true })

let requests = 0
for (const [i, { from, to }] of pairs.entries()) {
  const key = routeKey(from.id, to.id)
  const known = existing?.routes[key]
  if (known) {
    index.routes[key] = known
    continue
  }
  if (requests > 0) await sleep(PAUSE_MS)
  requests++

  const route = await getRouteWithRetry(() => provider.getRoute(from.position, to.position))
  index.routes[key] = {
    distanceM: Math.round(route.distanceM),
    durationS: Math.round(route.durationS),
  }
  await writeFile(
    new URL(`${key}.geojson`, OUTPUT_DIR),
    `${JSON.stringify(toGeometryFile(route))}\n`,
  )
  // Save progress after every route, so an interrupted run can continue with --missing.
  await writeIndex({ ...index, routes: { ...existing?.routes, ...index.routes } })
  console.log(
    `${i + 1}/${pairs.length} ${from.id} → ${to.id}: ` +
      `${(route.distanceM / 1000).toFixed(1)} km, ${Math.round(route.durationS / 60)} min`,
  )
}

// Final index contains exactly the current pairs; remove files of pairs that no longer exist.
await writeIndex(index)
const wanted = new Set(Object.keys(index.routes).map((key) => `${key}.geojson`))
for (const file of await readdir(OUTPUT_DIR)) {
  if (file.endsWith('.geojson') && !wanted.has(file)) await rm(new URL(file, OUTPUT_DIR))
}
console.log(`Done: ${requests} requests, ${Object.keys(index.routes).length} routes in the index.`)
