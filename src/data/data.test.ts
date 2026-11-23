/**
 * Checks that the generated files in public/data/ fit the curated sites and each other. These
 * files are rewritten by scripts and GitHub Actions, so a broken update should fail here.
 */
import { existsSync, readFileSync } from 'node:fs'
import type { FeatureCollection } from 'geojson'
import { describe, expect, it } from 'vitest'
import { REGION_BBOX } from '@/config/region'
import { ZONE_CATEGORY_ORDER } from '@/config/zoneCategories'
import type { ZoneDataMeta, ZoneProperties } from '@/types/zone'
import { ROUTE_INDEX_PATH, routeGeometryPath, routeKey, type RouteIndex } from './routes'
import { SITES } from './sites'

const publicFile = (path: string) => new URL(`../../public/${path}`, import.meta.url)
const readJson = <T>(path: string): T => JSON.parse(readFileSync(publicFile(path), 'utf8')) as T

describe('sites', () => {
  it('have unique ids', () => {
    expect(new Set(SITES.map((site) => site.id)).size).toBe(SITES.length)
  })

  it('lie inside the region of the zone data', () => {
    const [west, south, east, north] = REGION_BBOX
    for (const { id, position } of SITES) {
      const [lon, lat] = position
      expect({ id, inside: lon > west && lon < east && lat > south && lat < north }).toEqual({
        id,
        inside: true,
      })
    }
  })

  it('name a source', () => {
    for (const site of SITES) expect(site.source.url).toMatch(/^https:\/\//)
  })
})

describe('driving routes', () => {
  const index = readJson<RouteIndex>(ROUTE_INDEX_PATH)
  const pairs = SITES.flatMap((from) =>
    SITES.filter((to) => to.id !== from.id).map((to) => [from.id, to.id] as const),
  )

  it('exist for every ordered pair of sites, and only for those', () => {
    expect(Object.keys(index.routes).sort()).toEqual(
      pairs.map(([from, to]) => routeKey(from, to)).sort(),
    )
  })

  it('have a geometry file and plausible values', () => {
    for (const [from, to] of pairs) {
      const route = index.routes[routeKey(from, to)]!
      expect(existsSync(publicFile(routeGeometryPath(from, to))), `${from} → ${to}`).toBe(true)
      expect(route.distanceM).toBeGreaterThan(0)
      expect(route.durationS).toBeGreaterThan(0)
    }
  })
})

describe('restriction zones', () => {
  const zones = readJson<FeatureCollection<null, ZoneProperties>>('data/zones-basel.geojson')
  const meta = readJson<ZoneDataMeta>('data/zones-meta.json')

  it('match the metadata', () => {
    expect(zones.features).toHaveLength(meta.zoneCount)
    expect(meta.regionBbox).toEqual(REGION_BBOX)
  })

  it('have unique ids and a known category', () => {
    const ids = zones.features.map((zone) => zone.properties.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const zone of zones.features) {
      expect(ZONE_CATEGORY_ORDER).toContain(zone.properties.category)
    }
  })
})
