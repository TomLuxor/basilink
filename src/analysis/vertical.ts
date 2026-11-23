/**
 * Does the corridor overlap a zone vertically?
 *
 * The corridor reaches from the ground (take-off and landing pass through every height) up to
 * the top of the contingency volume, measured above ground (AGL). Zone limits are either AGL or
 * above mean sea level (AMSL). Comparing an AMSL limit with an AGL height needs the terrain
 * height along the corridor, which comes from the geo.admin profile service.
 *
 * Touching counts as overlapping: "prohibited from 120 m" includes 120 m itself.
 */
import type { ZoneProperties } from '@/types/zone'

/** Lowest and highest terrain (metres above sea level) along the corridor. */
export interface TerrainRange {
  minM: number
  maxM: number
}

export type VerticalRelation =
  /** The corridor and the zone share some height. */
  | 'overlaps'
  /** The whole corridor stays below the zone's lower limit (e.g. below a CTR). */
  | 'below'
  /** The whole corridor stays above the zone's upper limit. */
  | 'above'
  /** The zone uses AMSL limits and no terrain height is known yet. */
  | 'needs-terrain'

type Limits = Pick<
  ZoneProperties,
  'lowerLimitM' | 'lowerReference' | 'upperLimitM' | 'upperReference'
>

export function verticalRelation(
  zone: Limits,
  corridorTopAgl: number,
  terrain?: TerrainRange,
): VerticalRelation {
  if (zone.lowerReference === 'AGL' && zone.upperReference === 'AGL') {
    if (zone.lowerLimitM > corridorTopAgl) return 'below'
    // The corridor starts at the ground, so an AGL upper limit can never be below it.
    return 'overlaps'
  }

  if (!terrain) return 'needs-terrain'

  // Compare everything above sea level. Where terrain varies, use the values that make the
  // zone as large and the corridor as tall as possible, so an overlap is never missed.
  const corridorBottom = terrain.minM
  const corridorTop = terrain.maxM + corridorTopAgl
  const zoneBottom =
    zone.lowerReference === 'AGL' ? terrain.minM + zone.lowerLimitM : zone.lowerLimitM
  const zoneTop =
    zone.upperLimitM === null
      ? Infinity
      : zone.upperReference === 'AGL'
        ? terrain.maxM + zone.upperLimitM
        : zone.upperLimitM

  if (zoneBottom > corridorTop) return 'below'
  if (zoneTop < corridorBottom) return 'above'
  return 'overlaps'
}
