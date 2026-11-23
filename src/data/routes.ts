/**
 * Pre-computed driving routes (docs/decisions.md, D16).
 * Shared between the app and scripts/fetch-routes.ts, so keep it free of browser APIs.
 *
 * Files in public/data/routes/:
 * - index.json                 one RouteSummary per ordered site pair
 * - <from>__<to>.geojson       the road geometry of that pair (GeoJSON LineString feature)
 */

export interface RouteSummary {
  distanceM: number
  durationS: number
}

export interface RouteIndex {
  /** e.g. "openrouteservice, profile driving-car" */
  provider: string
  attribution: string
  /** Date of the computation, YYYY-MM-DD. */
  computedOn: string
  routes: Record<string, RouteSummary>
}

/** Key of an ordered pair; also the file name of its geometry. Driving A→B may differ from B→A. */
export function routeKey(fromId: string, toId: string): string {
  return `${fromId}__${toId}`
}

/** Path of a route geometry file, relative to the site root (prefix with the base URL). */
export function routeGeometryPath(fromId: string, toId: string): string {
  return `data/routes/${routeKey(fromId, toId)}.geojson`
}

export const ROUTE_INDEX_PATH = 'data/routes/index.json'
