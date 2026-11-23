/**
 * Driving routes from OpenRouteService (HeiGIT), profile "driving-car".
 *
 * This is the only file that knows about ORS. A provider with traffic-dependent times
 * (stretch goal) would be a second file with the same `RoutingProvider` shape.
 */
import type { LineString, Position } from 'geojson'

export interface Route {
  distanceM: number
  durationS: number
  geometry: LineString
}

export interface RoutingProvider {
  name: string
  attribution: string
  getRoute(from: Position, to: Position): Promise<Route>
}

/** HeiGIT's API host; api.openrouteservice.org is the older host for the same service. */
const DIRECTIONS_URL = 'https://api.heigit.org/openrouteservice/v2/directions/driving-car/geojson'

/** Thrown on HTTP 429 so the caller can wait and retry. */
export class RateLimitError extends Error {}

/** Extracts distance, duration and geometry from an ORS GeoJSON directions response. */
export function parseDirectionsResponse(body: unknown): Route {
  const feature = (body as { features?: unknown[] })?.features?.[0] as
    | {
        geometry?: LineString
        properties?: { summary?: { distance?: number; duration?: number } }
      }
    | undefined
  const summary = feature?.properties?.summary
  if (
    feature?.geometry?.type !== 'LineString' ||
    typeof summary?.distance !== 'number' ||
    typeof summary?.duration !== 'number'
  ) {
    throw new Error('Unexpected ORS response: no route with distance, duration and geometry')
  }
  return { distanceM: summary.distance, durationS: summary.duration, geometry: feature.geometry }
}

export function openRouteService(apiKey: string): RoutingProvider {
  return {
    name: 'openrouteservice, profile driving-car',
    attribution: '© openrouteservice.org by HeiGIT | Map data © OpenStreetMap contributors',
    async getRoute(from, to) {
      const response = await fetch(DIRECTIONS_URL, {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/geo+json',
        },
        body: JSON.stringify({ coordinates: [from, to] }),
      })
      if (response.status === 429) throw new RateLimitError('ORS rate limit reached')
      if (!response.ok) {
        throw new Error(`ORS request failed: HTTP ${response.status} ${await response.text()}`)
      }
      return parseDirectionsResponse(await response.json())
    },
  }
}
