/**
 * Turns the FOCA (BAZL) UAS zone export in ED-269 format into the GeoJSON file the app loads.
 *
 * Everything here is a pure function (no network, no files), so it can be unit-tested.
 * The script that downloads and writes the data is scripts/fetch-zones.ts.
 *
 * The functions fail loudly when the source data looks different from what we verified in
 * the Phase 0 spike (docs/phase-0-spike.md), e.g. a new unit or geometry type. A failing
 * update job is better than silently wrong zones.
 */
import simplify from '@turf/simplify'
import type { Position } from 'geojson'
import type { BBox } from '../../src/config/region.ts'
import type {
  VerticalReference,
  ZoneCategory,
  ZoneFeature,
  ZoneProperties,
} from '../../src/types/zone.ts'
import { roundRing } from '../lib/geometry.ts'

// --- Input: the part of the ED-269 format (version 1.0) that we use ---

export interface Ed269Volume {
  uomDimensions: string
  lowerLimit: number
  lowerVerticalReference: string
  upperLimit: number
  upperVerticalReference: string
  horizontalProjection: { type: string; coordinates: Position[][] }
}

export interface Ed269Zone {
  identifier: string
  name: string
  reason: string[]
  restrictionConditions: string[]
  message: string
  applicability: { permanent: string; startDateTime?: string; endDateTime?: string }[]
  zoneAuthority: { name: string; service: string; email: string; phone: string; siteURL: string }[]
  geometry: Ed269Volume[]
}

export interface Ed269Collection {
  title: string
  description: string
  features: Ed269Zone[]
}

// --- Constants ---

/** ED-269 encodes "no upper limit" as 99999. */
const UNLIMITED = 99999
const METRES_PER_FOOT = 0.3048

/**
 * Simplification tolerance in degrees (about 1 m). The FOCA polygons have points roughly
 * every metre along curves; dropping detail below 1 m does not change any analysis result.
 */
const SIMPLIFY_TOLERANCE_DEG = 0.00001

// --- Small helpers ---

/**
 * Maps ED-269 reason codes to the categories the app colours and groups by.
 * Air traffic zones are split: control zones (CTR, identifier starts with "CTR") usually
 * start at 120 m above ground, while aerodrome zones start at the ground.
 */
export function categorize(reasons: string[], identifier: string): ZoneCategory {
  if (reasons.includes('AIR_TRAFFIC')) return identifier.startsWith('CTR') ? 'ctr' : 'aerodrome'
  if (reasons.includes('SENSITIVE')) return 'sensitive'
  if (reasons.includes('NATURE')) return 'nature'
  return 'other'
}

/** Converts a limit to metres, rounded to 0.1 m. */
export function toMetres(value: number, unit: string): number {
  if (unit === 'M') return value
  if (unit === 'FT') return Math.round(value * METRES_PER_FOOT * 10) / 10
  throw new Error(`Unsupported unit "${unit}"`)
}

function toReference(value: string): VerticalReference {
  if (value === 'AGL' || value === 'AMSL') return value
  throw new Error(`Unsupported vertical reference "${value}"`)
}

/** Bounding box of a polygon ring. */
export function ringBBox(ring: Position[]): BBox {
  const lons = ring.map((p) => p[0] ?? NaN)
  const lats = ring.map((p) => p[1] ?? NaN)
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)]
}

export function bboxesOverlap(a: BBox, b: BBox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]
}

/** Reads the export timestamp from a title like "SwissUASGeozones - created on 2026-11-20T16:05:46.782+01:00". */
export function parseExportDate(title: string): string | null {
  const match = /created on (\S+)/.exec(title)
  const value = match?.[1]
  return value && !Number.isNaN(Date.parse(value)) ? value : null
}

// --- Main transformation ---

/**
 * Converts every zone volume that touches `region` into one GeoJSON feature.
 * Zones are selected by bounding box, not clipped, so their shapes stay complete.
 * The result is sorted by id so repeated runs produce identical files.
 */
export function toZoneFeatures(collection: Ed269Collection, region: BBox): ZoneFeature[] {
  const features: ZoneFeature[] = []

  for (const zone of collection.features) {
    const where = `zone ${zone.identifier}`
    const applicability = zone.applicability[0]
    const authority = zone.zoneAuthority[0]
    if (!applicability || !authority)
      throw new Error(`${where}: missing applicability or authority`)
    const permanent = applicability.permanent === 'YES'
    const hasSeveralVolumes = zone.geometry.length > 1

    zone.geometry.forEach((volume, index) => {
      const { horizontalProjection: shape } = volume
      if (shape.type !== 'Polygon')
        throw new Error(`${where}: unsupported geometry "${shape.type}"`)
      const outerRing = shape.coordinates[0]
      if (!outerRing) throw new Error(`${where}: polygon without coordinates`)
      if (!bboxesOverlap(ringBBox(outerRing), region)) return

      const properties: ZoneProperties = {
        id: hasSeveralVolumes ? `${zone.identifier}-${index + 1}` : zone.identifier,
        zoneId: zone.identifier,
        name: zone.name,
        category: categorize(zone.reason, zone.identifier),
        reason: zone.reason.join(', '),
        restriction: zone.restrictionConditions.join(' '),
        message: zone.message,
        permanent,
        validFrom: permanent ? null : (applicability.startDateTime ?? null),
        validTo: permanent ? null : (applicability.endDateTime ?? null),
        lowerLimitM: toMetres(volume.lowerLimit, volume.uomDimensions),
        lowerReference: toReference(volume.lowerVerticalReference),
        upperLimitM:
          volume.upperLimit === UNLIMITED
            ? null
            : toMetres(volume.upperLimit, volume.uomDimensions),
        upperReference: toReference(volume.upperVerticalReference),
        authorityName: authority.name,
        authorityService: authority.service,
        authorityEmail: authority.email,
        authorityPhone: authority.phone,
        authorityUrl: authority.siteURL,
      }

      features.push({
        type: 'Feature',
        properties,
        geometry: { type: 'Polygon', coordinates: shape.coordinates },
      })
    })
  }

  return features.sort((a, b) => a.properties.id.localeCompare(b.properties.id))
}

/** Reduces file size: drops detail below ~1 m and rounds coordinates to ~0.1 m. */
export function simplifyZone(zone: ZoneFeature): ZoneFeature {
  const simplified = simplify(zone, { tolerance: SIMPLIFY_TOLERANCE_DEG, mutate: false })
  const coordinates = simplified.geometry.coordinates.map((ring) => roundRing(ring))
  if (coordinates.some((ring) => ring.length < 4)) {
    throw new Error(`zone ${zone.properties.id}: ring collapsed during simplification`)
  }
  return { ...simplified, geometry: { type: 'Polygon', coordinates } }
}

/**
 * Writes a FeatureCollection with one feature per line: compact enough for the browser,
 * and git diffs show exactly which zones changed when the data is updated.
 */
export function serializeFeatureCollection(features: ZoneFeature[]): string {
  const lines = features.map((feature) => JSON.stringify(feature))
  return `{"type":"FeatureCollection","features":[\n${lines.join(',\n')}\n]}\n`
}
