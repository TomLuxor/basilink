/**
 * Server side of the driving times with typical traffic (docs/decisions.md, D29). It runs only in
 * the Vercel Function api/drive-times.ts, which passes in the Mapbox token. The browser never
 * sees the token.
 *
 * Mapbox's terms allow requests only in response to a user action, and forbid storing or caching
 * the results (Product Terms 1.9 and 2.10.1). So nothing is cached here: every call asks Mapbox.
 *
 * Imports are relative and end in `.js`, because Vercel compiles this file without Vite: it does
 * not know the `@/` alias, and Node needs the file extension of the compiled file.
 */
import { DEPARTURE_TIMES, type DriveTimes } from '../data/driveTimes.js'
import { SITES } from '../data/sites.js'

const DIRECTIONS_URL = 'https://api.mapbox.com/directions/v5/mapbox/driving-traffic'
const PROVIDER = 'Mapbox Directions, profile driving-traffic'

/**
 * The next Tuesday at least two days ahead, as YYYY-MM-DD. For departures close to now Mapbox
 * mixes in live traffic. Two days ahead gives the typical traffic of a normal working day.
 */
export function typicalWeekday(now: Date): string {
  const TUESDAY = 2
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const daysAhead = (TUESDAY - day.getUTCDay() + 7) % 7
  day.setUTCDate(day.getUTCDate() + (daysAhead < 2 ? daysAhead + 7 : daysAhead))
  return day.toISOString().slice(0, 10)
}

/**
 * Mapbox request for one departure. A time without an offset is local time at the start
 * (Mapbox docs), which is Swiss time for all sites.
 */
export function directionsUrl(
  from: [number, number],
  to: [number, number],
  departAt: string,
  token: string,
): string {
  const query = new URLSearchParams({ depart_at: departAt, overview: 'false', access_token: token })
  return `${DIRECTIONS_URL}/${from.join(',')};${to.join(',')}?${query}`
}

interface MapboxResponse {
  code?: string
  message?: string
  routes?: { duration: number; distance: number }[]
}

/** Answers GET /api/drive-times?from=<site id>&to=<site id>. Only listed sites are accepted. */
export async function handleDriveTimes(
  query: URLSearchParams,
  token: string | undefined,
  now = new Date(),
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const from = SITES.find((site) => site.id === query.get('from'))
  const to = SITES.find((site) => site.id === query.get('to'))
  if (!from || !to || from === to) return json({ error: 'Choose two different listed sites.' }, 400)
  if (!token) return json({ error: 'Driving times with traffic are not set up.' }, 503)

  const date = typicalWeekday(now)
  try {
    const times = await Promise.all(
      DEPARTURE_TIMES.map(async (departure) => {
        const url = directionsUrl(from.position, to.position, `${date}T${departure}`, token)
        const response = await fetchFn(url)
        const body = (await response.json()) as MapboxResponse
        const durationS = body.routes?.[0]?.duration
        if (!response.ok || body.code !== 'Ok' || durationS === undefined) {
          // Never log the URL: it contains the token.
          throw new Error(`HTTP ${response.status}, ${body.code ?? '-'}: ${body.message ?? '-'}`)
        }
        return { departure, durationS: Math.round(durationS) }
      }),
    )
    return json({ provider: PROVIDER, date, times } satisfies DriveTimes, 200)
  } catch (error) {
    console.error('Mapbox request failed:', error instanceof Error ? error.message : error)
    return json({ error: 'Mapbox did not return driving times.' }, 502)
  }
}

/** JSON response that no browser or CDN may keep (Mapbox forbids caching). */
function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}
