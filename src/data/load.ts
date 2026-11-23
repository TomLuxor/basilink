/**
 * Loading the static data files from public/data/ and the terrain profile from geo.admin.
 * All own files are fetched relative to Vite's base URL, so the app also works under a sub-path.
 */
import type { Feature, FeatureCollection, LineString, MultiPolygon, Polygon } from 'geojson'
import type { Lv95Point } from '@/analysis/lv95'
import type { TerrainRange } from '@/analysis/vertical'
import type { ZoneDataMeta, ZoneProperties } from '@/types/zone'
import { ROUTE_INDEX_PATH, routeGeometryPath, type RouteIndex } from './routes'

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${import.meta.env.BASE_URL}${path}`)
  if (!response.ok) throw new Error(`Loading ${path} failed: HTTP ${response.status}`)
  return (await response.json()) as T
}

export const loadZones = () =>
  getJson<FeatureCollection<Polygon, ZoneProperties>>('data/zones-basel.geojson')

export const loadZoneMeta = () => getJson<ZoneDataMeta>('data/zones-meta.json')

export const loadSwitzerland = () =>
  getJson<Feature<MultiPolygon>>('data/switzerland-basel.geojson')

/** The route index, or null if the routes have not been computed yet. */
export async function loadRouteIndex(): Promise<RouteIndex | null> {
  try {
    return await getJson<RouteIndex>(ROUTE_INDEX_PATH)
  } catch {
    return null
  }
}

export const loadRouteGeometry = (fromId: string, toId: string) =>
  getJson<Feature<LineString>>(routeGeometryPath(fromId, toId))

/**
 * Lowest and highest terrain along the direct line, from the geo.admin profile service
 * (which accepts LV95 coordinates only). Needed only for zones with limits above sea level.
 */
export async function loadTerrainRange(line: [Lv95Point, Lv95Point]): Promise<TerrainRange> {
  const geometry = JSON.stringify({ type: 'LineString', coordinates: line })
  const url = `https://api3.geo.admin.ch/rest/services/profile.json?sr=2056&nb_points=100&geom=${encodeURIComponent(geometry)}`
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Terrain profile failed: HTTP ${response.status}`)
  const points = (await response.json()) as { alts: { COMB: number } }[]
  const heights = points.map((point) => point.alts.COMB)
  return { minM: Math.min(...heights), maxM: Math.max(...heights) }
}
