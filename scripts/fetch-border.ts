/**
 * Downloads the Swiss national boundary (swisstopo swissBOUNDARIES3D), keeps the part inside
 * the map area around Basel and writes public/data/switzerland-basel.geojson.
 *
 * The app uses it to warn when a corridor leaves Swiss territory, because the FOCA zones stop
 * at the border (docs/decisions.md, D8). The border hardly ever changes, so this script is
 * run by hand: `npm run data:border`.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import bboxClip from '@turf/bbox-clip'
import simplify from '@turf/simplify'
import type { Feature, MultiPolygon, Polygon } from 'geojson'
import { MAP_MAX_BOUNDS } from '../src/config/region.ts'
import { roundRing } from './lib/geometry.ts'

const SOURCE_URL =
  'https://api3.geo.admin.ch/rest/services/api/MapServer/ch.swisstopo.swissboundaries3d-land-flaeche.fill/CH?geometryFormat=geojson&sr=4326'
const OUTPUT = new URL('../public/data/switzerland-basel.geojson', import.meta.url)

/** About 2 m: plenty for a border warning. */
const SIMPLIFY_TOLERANCE_DEG = 0.00002

const response = await fetch(SOURCE_URL)
if (!response.ok) throw new Error(`GET ${SOURCE_URL} failed: ${response.status}`)
const { feature } = (await response.json()) as { feature: Feature<Polygon | MultiPolygon> }
if (!feature?.geometry) throw new Error('Unexpected response: no feature geometry')

const clipped = bboxClip(feature, MAP_MAX_BOUNDS)
const { geometry } = simplify(clipped, { tolerance: SIMPLIFY_TOLERANCE_DEG })
if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
  throw new Error(`Unexpected geometry type "${geometry.type}"`)
}
const parts = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

// Clipping can leave empty or degenerate rings at the edge of the box; drop them.
const coordinates = parts
  .map((rings) => rings.map((ring) => roundRing(ring)).filter((ring) => ring.length >= 4))
  .filter((rings) => rings.length > 0)

const output: Feature<MultiPolygon> = {
  type: 'Feature',
  properties: {
    name: 'Switzerland, clipped to the map area around Basel',
    source: 'swisstopo swissBOUNDARIES3D (national boundaries)',
    license: 'Free use, source must be provided',
    licenseUrl:
      'https://www.geocat.ch/geonetwork/srv/eng/catalog.search#/metadata/c5bd42e6-033f-4d43-a398-320b42538798',
  },
  geometry: { type: 'MultiPolygon', coordinates },
}

await mkdir(new URL('.', OUTPUT), { recursive: true })
await writeFile(OUTPUT, `${JSON.stringify(output)}\n`)
const vertices = coordinates.flat(2).length
console.log(`Wrote ${coordinates.length} part(s) with ${vertices} vertices to ${OUTPUT.pathname}`)
