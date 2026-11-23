import type { Feature, Polygon } from 'geojson'
import type { BBox } from '../config/region.ts'

/**
 * Zone category used for colours and for grouping analysis results.
 * Derived from the ED-269 `reason` field (see scripts/zones/transform.ts), because the
 * FOCA data uses the same `type` and `restriction` value for every zone.
 */
export type ZoneCategory = 'aerodrome' | 'ctr' | 'sensitive' | 'nature' | 'other'

/** Vertical reference of a limit: above ground level or above mean sea level. */
export type VerticalReference = 'AGL' | 'AMSL'

/**
 * Properties of one zone volume in public/data/zones-basel.geojson.
 * Kept flat (no nested objects) so MapLibre style expressions can use every field.
 */
export interface ZoneProperties {
  /** Unique per volume: the ED-269 identifier, with "-1", "-2" … if a zone has several volumes. */
  id: string
  /** Zone identifier as published by FOCA, e.g. "CTR0016". */
  zoneId: string
  name: string
  category: ZoneCategory
  /** Raw ED-269 reason codes, e.g. "AIR_TRAFFIC". */
  reason: string
  /** Free-text restriction, e.g. a weight threshold. Shown verbatim in the UI. */
  restriction: string
  /** Free-text hint from the authority, e.g. how to apply for an exemption. */
  message: string
  permanent: boolean
  /** ISO 8601 start and end of temporary zones; null for permanent zones. */
  validFrom: string | null
  validTo: string | null
  /** Lower limit in metres. */
  lowerLimitM: number
  lowerReference: VerticalReference
  /** Upper limit in metres; null means "no upper limit" (ED-269 encodes this as 99999). */
  upperLimitM: number | null
  upperReference: VerticalReference
  authorityName: string
  authorityService: string
  authorityEmail: string
  authorityPhone: string
  authorityUrl: string
}

export type ZoneFeature = Feature<Polygon, ZoneProperties>

/** Content of public/data/zones-meta.json: where the zone data comes from and how fresh it is. */
export interface ZoneDataMeta {
  /** When FOCA created the export, ISO 8601 (taken from the ED-269 file title). */
  dataAsOf: string
  /** Format declared by the source file, e.g. "… according to ED-269 - format version 1.0". */
  sourceFormat: string
  sourceName: string
  sourceUrl: string
  downloadUrl: string
  license: string
  licenseUrl: string
  regionBbox: BBox
  zoneCount: number
}
