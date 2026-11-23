/**
 * Downloads the FOCA (BAZL) UAS geographical zones, keeps the zones that touch the Basel
 * region and writes them to public/data/ as static files for the app:
 *
 * - zones-basel.geojson  one feature per zone volume (see src/types/zone.ts)
 * - zones-meta.json      source, license and "data as of" date shown in the UI
 *
 * Run with `npm run data:zones`. A GitHub Action runs it daily and commits changes.
 * The source is resolved through the STAC catalogue of data.geo.admin.ch, so a renamed
 * download file does not break the script.
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { REGION_BBOX } from '../src/config/region.ts'
import type { ZoneCategory, ZoneDataMeta } from '../src/types/zone.ts'
import {
  parseExportDate,
  serializeFeatureCollection,
  simplifyZone,
  toZoneFeatures,
  type Ed269Collection,
} from './zones/transform.ts'

const COLLECTION_URL =
  'https://data.geo.admin.ch/api/stac/v1/collections/ch.bazl.einschraenkungen-drohnen'
const OUTPUT_DIR = new URL('../public/data/', import.meta.url)

interface StacItems {
  features: { assets: Record<string, { href: string }> }[]
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`GET ${url} failed: ${response.status} ${response.statusText}`)
  return (await response.json()) as T
}

/** Finds the ED-269 JSON file in WGS84 (asset name ends with "_4326.json"). */
async function findDownloadUrl(): Promise<string> {
  const items = await fetchJson<StacItems>(`${COLLECTION_URL}/items`)
  const assets = items.features.flatMap((item) => Object.entries(item.assets))
  const match = assets.find(([name]) => name.endsWith('_4326.json'))
  if (!match) throw new Error(`No "*_4326.json" asset found in ${COLLECTION_URL}/items`)
  return match[1].href
}

const downloadUrl = await findDownloadUrl()
console.log(`Downloading ${downloadUrl}`)
const source = await fetchJson<Ed269Collection>(downloadUrl)

// Guard against a silent format switch (e.g. to ED-318): the transform expects ED-269.
if (!source.description.includes('ED-269')) {
  throw new Error(`Unexpected source format: "${source.description}"`)
}
const dataAsOf = parseExportDate(source.title)
if (!dataAsOf) throw new Error(`Could not read the export date from title "${source.title}"`)

const zones = toZoneFeatures(source, REGION_BBOX).map(simplifyZone)

const meta: ZoneDataMeta = {
  dataAsOf,
  sourceFormat: source.description,
  sourceName: 'Federal Office of Civil Aviation FOCA – Restrictions for drones',
  sourceUrl: 'https://www.bazl.admin.ch/en/geographical-flight-restrictions',
  downloadUrl,
  license: 'Opendata BY – free use, source must be provided',
  licenseUrl: 'https://opendata.swiss/en/terms-of-use#terms_by',
  regionBbox: REGION_BBOX,
  zoneCount: zones.length,
}

await mkdir(OUTPUT_DIR, { recursive: true })
await writeFile(new URL('zones-basel.geojson', OUTPUT_DIR), serializeFeatureCollection(zones))
await writeFile(new URL('zones-meta.json', OUTPUT_DIR), `${JSON.stringify(meta, null, 2)}\n`)

const perCategory: Partial<Record<ZoneCategory, number>> = {}
for (const zone of zones) {
  perCategory[zone.properties.category] = (perCategory[zone.properties.category] ?? 0) + 1
}
console.log(`Data as of ${dataAsOf}: ${source.features.length} zones in Switzerland`)
console.log(`Wrote ${zones.length} zone volumes for the Basel region:`, perCategory)
