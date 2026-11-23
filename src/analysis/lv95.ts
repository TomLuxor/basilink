/**
 * Conversion between WGS84 (longitude/latitude, used by the map and the data files) and the
 * Swiss national grid LV95 (EPSG:2056, metres). The analysis works in LV95 so that buffers and
 * distances are plain metric geometry, and the geo.admin height API only accepts LV95.
 */
import proj4 from 'proj4'
import type { Position } from 'geojson'

/** [easting, northing] in metres. */
export type Lv95Point = [number, number]

/** A polygon in LV95 as its rings: the outer ring first, then any holes. */
export type Lv95Polygon = Lv95Point[][]

// Official EPSG:2056 definition (Swiss oblique Mercator on the Bessel ellipsoid).
const LV95 =
  '+proj=somerc +lat_0=46.9524055555556 +lon_0=7.43958333333333 +k_0=1 +x_0=2600000 +y_0=1200000 +ellps=bessel +towgs84=674.374,15.056,405.346,0,0,0,0 +units=m +no_defs +type=crs'

const converter = proj4('EPSG:4326', LV95)

export function toLv95(position: Position): Lv95Point {
  const [east, north] = converter.forward([position[0] ?? NaN, position[1] ?? NaN])
  return [east, north]
}

export function toWgs84(point: Lv95Point): [number, number] {
  const [lon, lat] = converter.inverse(point)
  return [lon, lat]
}

/** Converts every ring of a polygon. */
export function ringsToLv95(rings: Position[][]): Lv95Point[][] {
  return rings.map((ring) => ring.map(toLv95))
}

export function ringsToWgs84(rings: Lv95Point[][]): [number, number][][] {
  return rings.map((ring) => ring.map(toWgs84))
}
