/** Bounding box in WGS84 longitude/latitude. */
export type BBox = [west: number, south: number, east: number, north: number]

/**
 * The area Basilink covers: Basel city and agglomeration, including Liestal, Dittingen
 * airfield and the Swiss side of the EuroAirport. Used by the data script to select zones
 * and by the map to limit panning.
 */
export const REGION_BBOX: BBox = [7.45, 47.42, 7.82, 47.65]

/** Initial map centre (Basel, near the Rhine) as [longitude, latitude]. */
export const REGION_CENTER: [number, number] = [7.59, 47.555]
