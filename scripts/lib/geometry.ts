import type { Position } from 'geojson'

/** 6 decimal places in WGS84 ≈ 0.1 m. */
const DEFAULT_DECIMALS = 6

/**
 * Rounds coordinates of a ring or line and removes points that became duplicates through
 * rounding.
 */
export function roundPositions(positions: Position[], decimals = DEFAULT_DECIMALS): Position[] {
  const factor = 10 ** decimals
  const rounded: Position[] = []
  for (const [lon = NaN, lat = NaN] of positions) {
    const point = [Math.round(lon * factor) / factor, Math.round(lat * factor) / factor]
    const previous = rounded.at(-1)
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) rounded.push(point)
  }
  return rounded
}
