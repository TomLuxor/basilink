/** Bounding box in WGS84 longitude/latitude. */
export type BBox = [west: number, south: number, east: number, north: number]

/**
 * The area Basilink covers: Basel city and agglomeration, including Liestal, Dittingen
 * airfield and the Swiss side of the EuroAirport. Used by the data script to select zones
 * and by the map for the initial view.
 */
export const REGION_BBOX: BBox = [7.45, 47.42, 7.82, 47.65]

/** How far the map can be panned: the region plus some margin, so the border area stays visible. */
export const MAP_MAX_BOUNDS: BBox = [7.2, 47.3, 8.1, 47.8]
