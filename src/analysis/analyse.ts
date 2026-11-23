/**
 * The corridor check: which restriction zones does a direct drone flight between two sites
 * touch, and how long does it take?
 *
 * Steps:
 * 1. Convert start and destination to LV95 (metres).
 * 2. Size the operational volume and the ground risk buffer with SORA 2.5 (sora.ts).
 * 3. Build both as polygons around the direct line (corridor.ts).
 * 4. For every zone that overlaps horizontally, compare the heights (vertical.ts).
 * 5. Summarise: verdict, authorities to contact, flight time, border warning.
 */
import booleanIntersects from '@turf/boolean-intersects'
import booleanWithin from '@turf/boolean-within'
import type { MultiPolygon, Polygon, Position } from 'geojson'
import type { FlightParameters } from '@/config/flight'
import { ZONE_CATEGORY_ORDER } from '@/config/zoneCategories'
import type { ZoneCategory, ZoneFeature, ZoneProperties } from '@/types/zone'
import { corridorRing, distanceM } from './corridor'
import { ringsToLv95, ringsToWgs84, toLv95, type Lv95Point } from './lv95'
import { computeVolumes, type FlightVolumes } from './sora'
import { verticalRelation, type TerrainRange } from './vertical'

type Bounds = [minX: number, minY: number, maxX: number, maxY: number]

/** A zone converted to LV95 once, with its bounding box for a quick pre-check. */
export interface PreparedZone {
  properties: ZoneProperties
  geometry: Polygon
  bounds: Bounds
}

export type ZoneRelation =
  /** Operational volume overlaps the zone horizontally and vertically. */
  | 'conflict'
  /** Horizontal overlap, but the corridor stays below the zone's lower limit. */
  | 'passes-below'
  /** Horizontal overlap, but the corridor stays above the zone's upper limit. */
  | 'passes-above'
  /** Only the ground risk buffer touches the zone: a note, not an airspace conflict. */
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
  switzerland?: Polygon[]
  /** Terrain heights along the corridor; only needed for zones with AMSL limits. */
  terrain?: TerrainRange
}

export interface CorridorAnalysis {
  distanceM: number
  flightTimeS: number
  volumes: FlightVolumes
  /** WGS84 polygons and line for the map. */
  operationalVolume: Polygon
  groundRiskArea: Polygon
  line: Position[]
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

// --- Preparation (done once after loading the data) ---

function boundsOf(ring: Lv95Point[]): Bounds {
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
}

function boundsOverlap(a: Bounds, b: Bounds): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
}

export function prepareZones(zones: ZoneFeature[]): PreparedZone[] {
  return zones.map((zone) => {
    const rings = ringsToLv95(zone.geometry.coordinates)
    return {
      properties: zone.properties,
      geometry: { type: 'Polygon', coordinates: rings },
      bounds: boundsOf(rings[0] ?? []),
    }
  })
}

/** Converts an area such as Swiss territory to LV95, one polygon per part. */
export function prepareArea(geometry: Polygon | MultiPolygon): Polygon[] {
  const parts = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return parts.map((rings) => ({ type: 'Polygon', coordinates: ringsToLv95(rings) }))
}

// --- Analysis ---

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

export function analyseCorridor(input: AnalysisInput): CorridorAnalysis {
  const start = toLv95(input.from)
  const end = toLv95(input.to)
  const volumes = computeVolumes(input.parameters)
  const distance = distanceM(start, end)

  const operationalRing = corridorRing(start, end, volumes.corridorHalfWidthM)
  const groundRiskRing = corridorRing(
    start,
    end,
    volumes.corridorHalfWidthM + volumes.groundRiskBufferM,
  )
  const operational: Polygon = { type: 'Polygon', coordinates: [operationalRing] }
  const groundRisk: Polygon = { type: 'Polygon', coordinates: [groundRiskRing] }
  const operationalBounds = boundsOf(operationalRing)
  const groundRiskBounds = boundsOf(groundRiskRing)

  const findings: ZoneFinding[] = []
  let needsTerrain = false

  for (const zone of input.zones) {
    // Cheap bounding-box test first; most zones are far away.
    if (!boundsOverlap(zone.bounds, groundRiskBounds)) continue

    const inOperationalVolume =
      boundsOverlap(zone.bounds, operationalBounds) && booleanIntersects(operational, zone.geometry)

    if (inOperationalVolume) {
      const vertical = verticalRelation(zone.properties, volumes.contingencyTopM, input.terrain)
      if (vertical === 'needs-terrain') needsTerrain = true
      const relation =
        vertical === 'below' ? 'passes-below' : vertical === 'above' ? 'passes-above' : 'conflict'
      findings.push({ zone: zone.properties, relation })
    } else if (booleanIntersects(groundRisk, zone.geometry)) {
      findings.push({ zone: zone.properties, relation: 'ground-risk-buffer' })
    }
  }
  findings.sort(compareFindings)

  const hasConflict = findings.some((f) => f.relation === 'conflict')
  const passesZones = findings.some(
    (f) => f.relation === 'passes-below' || f.relation === 'passes-above',
  )

  return {
    distanceM: distance,
    flightTimeS: distance / volumes.speedMs,
    volumes,
    operationalVolume: { type: 'Polygon', coordinates: ringsToWgs84([operationalRing]) },
    groundRiskArea: { type: 'Polygon', coordinates: ringsToWgs84([groundRiskRing]) },
    line: [input.from, input.to],
    lineLv95: [start, end],
    findings,
    verdict: hasConflict
      ? 'authorisation-needed'
      : passesZones
        ? 'outside-vertical-limits'
        : 'no-zones',
    authorities: collectAuthorities(findings),
    leavesSwitzerland: input.switzerland
      ? !input.switzerland.some((part) => booleanWithin(operational, part))
      : null,
    needsTerrain,
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
