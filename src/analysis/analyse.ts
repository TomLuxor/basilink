/**
 * The corridor check: which restriction zones does a direct drone flight between two sites
 * touch, and how long does it take?
 *
 * Steps:
 * 1. Convert start and destination to LV95 (metres).
 * 2. Size the operational volume and the ground risk buffer with SORA 2.5 (sora.ts).
 * 3. Measure the distance from the flight line to every nearby zone (corridor.ts): within the
 *    half width of the operational volume the zone is in the corridor, within the ground risk
 *    buffer it is only near it.
 * 4. For zones in the corridor, compare the heights (vertical.ts).
 * 5. Summarise: verdict, authorities to contact, flight time, border warning.
 *
 * `checkCorridor` does only this and is fast enough to run for all site pairs.
 * `analyseCorridor` adds the polygons the map draws for one selected pair.
 */
import difference from '@turf/difference'
import intersect from '@turf/intersect'
import type { MultiPolygon, Polygon, Position } from 'geojson'
import type { FlightParameters } from '@/config/flight'
import { ZONE_CATEGORY_ORDER } from '@/config/zoneCategories'
import type { ZoneCategory, ZoneFeature, ZoneProperties } from '@/types/zone'
import {
  corridorRing,
  distanceM,
  distanceToOutlineM,
  distanceToPolygonM,
  insidePolygon,
} from './corridor'
import { ringsToLv95, ringsToWgs84, toLv95, type Lv95Point, type Lv95Polygon } from './lv95'
import { computeVolumes, type FlightVolumes } from './sora'
import { verticalRelation, type TerrainRange } from './vertical'

type Bounds = [minX: number, minY: number, maxX: number, maxY: number]

/** A zone converted to LV95 once, with its bounding box for a quick pre-check. */
export interface PreparedZone {
  properties: ZoneProperties
  polygon: Lv95Polygon
  bounds: Bounds
}

export type ZoneRelation =
  /** The zone is within the operational volume horizontally and overlaps it vertically. */
  | 'conflict'
  /** Horizontally in the volume, but the corridor stays below the zone's lower limit. */
  | 'passes-below'
  /** Horizontally in the volume, but the corridor stays above the zone's upper limit. */
  | 'passes-above'
  /** Only within the ground risk buffer: a note, not an airspace conflict. */
  | 'ground-risk-buffer'

export interface ZoneFinding {
  zone: ZoneProperties
  relation: ZoneRelation
}

export type Verdict =
  /** The operational volume touches no zone. */
  | 'no-zones'
  /** Zones are touched only where the corridor passes below (or above) them. */
  | 'outside-vertical-limits'
  /** At least one zone conflicts: an authorisation is needed. */
  | 'authorisation-needed'

export interface Authority {
  name: string
  service: string
  email: string
  phone: string
  url: string
  zoneNames: string[]
}

export interface AnalysisInput {
  /** WGS84 [longitude, latitude]. */
  from: Position
  to: Position
  parameters: FlightParameters
  zones: PreparedZone[]
  /** Swiss territory in LV95; omit if not loaded. */
  switzerland?: Lv95Polygon[]
  /** Terrain heights along the corridor; only needed for zones with AMSL limits. */
  terrain?: TerrainRange
}

/** The result of the check, without map geometry. */
export interface CorridorCheck {
  distanceM: number
  flightTimeS: number
  volumes: FlightVolumes
  /** Start and end in LV95, e.g. for the terrain profile request. */
  lineLv95: [Lv95Point, Lv95Point]
  findings: ZoneFinding[]
  verdict: Verdict
  authorities: Authority[]
  /** true if part of the operational volume lies outside Switzerland; null if unknown. */
  leavesSwitzerland: boolean | null
  /** true if a zone with AMSL limits was assumed to conflict because terrain is unknown. */
  needsTerrain: boolean
}

/** The check plus the WGS84 geometry the map draws. */
export interface CorridorAnalysis extends CorridorCheck {
  operationalVolume: Polygon
  groundRiskArea: Polygon
  line: Position[]
  /** The part of the operational volume outside Switzerland; null if there is none. */
  abroad: Polygon | MultiPolygon | null
  /**
   * For the 3D view: every zone in the operational volume, cut to the ground risk area.
   * Cutting keeps the 3D view on the corridor; some zones cover most of the region.
   */
  zoneSlices: { zone: ZoneProperties; geometry: Polygon | MultiPolygon }[]
}

// --- Preparation (done once after loading the data) ---

function boundsOf(points: Lv95Point[]): Bounds {
  const xs = points.map((p) => p[0])
  const ys = points.map((p) => p[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
}

export function prepareZones(zones: ZoneFeature[]): PreparedZone[] {
  return zones.map((zone) => {
    const polygon = ringsToLv95(zone.geometry.coordinates)
    return { properties: zone.properties, polygon, bounds: boundsOf(polygon[0] ?? []) }
  })
}

/** Converts an area such as Swiss territory to LV95, one polygon per part. */
export function prepareArea(geometry: Polygon | MultiPolygon): Lv95Polygon[] {
  const parts = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return parts.map((rings) => ringsToLv95(rings))
}

// --- The check ---

const RELATION_ORDER: ZoneRelation[] = [
  'conflict',
  'passes-below',
  'passes-above',
  'ground-risk-buffer',
]

function compareFindings(a: ZoneFinding, b: ZoneFinding): number {
  return (
    RELATION_ORDER.indexOf(a.relation) - RELATION_ORDER.indexOf(b.relation) ||
    ZONE_CATEGORY_ORDER.indexOf(a.zone.category) - ZONE_CATEGORY_ORDER.indexOf(b.zone.category) ||
    a.zone.name.localeCompare(b.zone.name)
  )
}

function collectAuthorities(findings: ZoneFinding[]): Authority[] {
  const byName = new Map<string, Authority>()
  for (const { zone, relation } of findings) {
    if (relation !== 'conflict') continue
    const authority = byName.get(zone.authorityName) ?? {
      name: zone.authorityName,
      service: zone.authorityService,
      email: zone.authorityEmail,
      phone: zone.authorityPhone,
      url: zone.authorityUrl,
      zoneNames: [],
    }
    if (!authority.zoneNames.includes(zone.name)) authority.zoneNames.push(zone.name)
    byName.set(zone.authorityName, authority)
  }
  return [...byName.values()]
}

export function checkCorridor(input: AnalysisInput): CorridorCheck {
  const start = toLv95(input.from)
  const end = toLv95(input.to)
  const volumes = computeVolumes(input.parameters)
  const distance = distanceM(start, end)

  const volumeReach = volumes.corridorHalfWidthM
  const bufferReach = volumes.corridorHalfWidthM + volumes.groundRiskBufferM
  const [minX, minY, maxX, maxY] = boundsOf([start, end])
  const searchBounds: Bounds = [
    minX - bufferReach,
    minY - bufferReach,
    maxX + bufferReach,
    maxY + bufferReach,
  ]

  const findings: ZoneFinding[] = []
  let needsTerrain = false

  for (const zone of input.zones) {
    // Cheap bounding-box test first; most zones are far away.
    if (!boundsOverlap(zone.bounds, searchBounds)) continue

    const gap = distanceToPolygonM(start, end, zone.polygon)
    if (gap <= volumeReach) {
      const vertical = verticalRelation(zone.properties, volumes.contingencyTopM, input.terrain)
      if (vertical === 'needs-terrain') needsTerrain = true
      const relation =
        vertical === 'below' ? 'passes-below' : vertical === 'above' ? 'passes-above' : 'conflict'
      findings.push({ zone: zone.properties, relation })
    } else if (gap <= bufferReach) {
      findings.push({ zone: zone.properties, relation: 'ground-risk-buffer' })
    }
  }
  findings.sort(compareFindings)

  const hasConflict = findings.some((f) => f.relation === 'conflict')
  const passesZones = findings.some(
    (f) => f.relation === 'passes-below' || f.relation === 'passes-above',
  )

  // The operational volume stays in Switzerland if the line starts inside a Swiss part and
  // never comes closer to that part's outline than the volume reaches.
  const leavesSwitzerland = input.switzerland
    ? !input.switzerland.some(
        (part) => insidePolygon(start, part) && distanceToOutlineM(start, end, part) > volumeReach,
      )
    : null

  return {
    distanceM: distance,
    flightTimeS: distance / volumes.speedMs,
    volumes,
    lineLv95: [start, end],
    findings,
    verdict: hasConflict
      ? 'authorisation-needed'
      : passesZones
        ? 'outside-vertical-limits'
        : 'no-zones',
    authorities: collectAuthorities(findings),
    leavesSwitzerland,
    needsTerrain,
  }
}

// --- Map geometry for one pair ---

const asPolygon = (polygon: Lv95Polygon): Polygon => ({ type: 'Polygon', coordinates: polygon })

const collection = (polygons: Lv95Polygon[]) => ({
  type: 'FeatureCollection' as const,
  features: polygons.map((polygon) => ({
    type: 'Feature' as const,
    properties: {},
    geometry: asPolygon(polygon),
  })),
})

function geometryToWgs84(geometry: Polygon | MultiPolygon): Polygon | MultiPolygon {
  return geometry.type === 'Polygon'
    ? { type: 'Polygon', coordinates: ringsToWgs84(geometry.coordinates as Lv95Polygon) }
    : {
        type: 'MultiPolygon',
        coordinates: geometry.coordinates.map((rings) => ringsToWgs84(rings as Lv95Polygon)),
      }
}

export function analyseCorridor(input: AnalysisInput): CorridorAnalysis {
  const check = checkCorridor(input)
  const [start, end] = check.lineLv95
  const { corridorHalfWidthM, groundRiskBufferM } = check.volumes

  const operational: Lv95Polygon = [corridorRing(start, end, corridorHalfWidthM)]
  const groundRisk: Lv95Polygon = [corridorRing(start, end, corridorHalfWidthM + groundRiskBufferM)]

  // Polygon clipping (Turf, planar in LV95) is slower than the distance check, so it runs
  // only here, for the zones and the border of the selected pair.
  const zonesById = new Map(input.zones.map((zone) => [zone.properties.id, zone]))
  const zoneSlices: CorridorAnalysis['zoneSlices'] = []
  for (const { zone, relation } of check.findings) {
    const polygon = zonesById.get(zone.id)?.polygon
    if (relation === 'ground-risk-buffer' || !polygon) continue
    const slice = intersect(collection([polygon, groundRisk]))
    if (slice) zoneSlices.push({ zone, geometry: geometryToWgs84(slice.geometry) })
  }

  const abroad =
    check.leavesSwitzerland && input.switzerland
      ? (difference(collection([operational, ...input.switzerland]))?.geometry ?? null)
      : null

  return {
    ...check,
    operationalVolume: asPolygon(ringsToWgs84(operational)),
    groundRiskArea: asPolygon(ringsToWgs84(groundRisk)),
    line: [input.from, input.to],
    abroad: abroad && geometryToWgs84(abroad),
    zoneSlices,
  }
}

/** Groups findings by zone category, in the fixed category order. Empty groups are left out. */
export function groupByCategory(
  findings: ZoneFinding[],
): { category: ZoneCategory; findings: ZoneFinding[] }[] {
  return ZONE_CATEGORY_ORDER.map((category) => ({
    category,
    findings: findings.filter((f) => f.zone.category === category),
  })).filter((group) => group.findings.length > 0)
}
