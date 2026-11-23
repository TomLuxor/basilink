/**
 * Basilink's own map layers on top of the swisstopo base map: restriction zones, the checked
 * corridor, the road route and the sites. Colours of the corridor follow the convention in
 * JARUS SORA 2.5 Annex A (flight geography green, contingency volume yellow, ground risk
 * buffer red).
 *
 * The base map style can be switched, which removes all custom layers. That is why
 * `addOverlays` is called after every style load, followed by the update functions.
 */
import type { Feature, FeatureCollection, LineString } from 'geojson'
import type {
  ExpressionSpecification,
  FilterSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
} from 'maplibre-gl'
import type { CorridorAnalysis } from '@/analysis/analyse'
import { ZONE_CATEGORIES } from '@/config/zoneCategories'
import type { Site } from '@/data/sites'

export const CORRIDOR_COLOURS = {
  line: '#15803d',
  operationalVolume: '#ca8a04',
  groundRiskBuffer: '#dc2626',
  route: '#1d4ed8',
}

export const SITE_COLOURS = { hospital: '#0f766e', lab: '#7c3aed' }

const SOURCE = {
  zones: 'basilink-zones',
  corridor: 'basilink-corridor',
  route: 'basilink-route',
  sites: 'basilink-sites',
}

export const SITES_LAYER = 'basilink-sites'

const ZONE_LAYERS = ['basilink-zones-fill', 'basilink-zones-line']

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Matches no zone (every zone has a non-empty id). */
const NO_ZONE: FilterSpecification = ['==', ['get', 'id'], '']

const zoneColour: ExpressionSpecification = [
  'match',
  ['get', 'category'],
  'aerodrome',
  ZONE_CATEGORIES.aerodrome.colour,
  'ctr',
  ZONE_CATEGORIES.ctr.colour,
  'sensitive',
  ZONE_CATEGORIES.sensitive.colour,
  'nature',
  ZONE_CATEGORIES.nature.colour,
  ZONE_CATEGORIES.other.colour,
]

const isPart = (part: string): FilterSpecification => ['==', ['get', 'part'], part]

export function addOverlays(map: MapLibreMap) {
  for (const id of Object.values(SOURCE)) map.addSource(id, { type: 'geojson', data: EMPTY })

  // Restriction zones, coloured by category. The airport zone and the control zone cover
  // most of Basel, so they get a lighter fill to keep the base map readable.
  map.addLayer({
    id: 'basilink-zones-fill',
    type: 'fill',
    source: SOURCE.zones,
    paint: {
      'fill-color': zoneColour,
      'fill-opacity': ['match', ['get', 'category'], 'ctr', 0.05, 'aerodrome', 0.1, 0.2],
    },
  })
  map.addLayer({
    id: 'basilink-zones-line',
    type: 'line',
    source: SOURCE.zones,
    paint: { 'line-color': zoneColour, 'line-width': 1, 'line-opacity': 0.8 },
  })
  // Zones in the result: solid outline for conflicts, dashed for "passes below/above".
  map.addLayer({
    id: 'basilink-zones-conflict',
    type: 'line',
    source: SOURCE.zones,
    filter: NO_ZONE,
    paint: { 'line-color': zoneColour, 'line-width': 3.5 },
  })
  map.addLayer({
    id: 'basilink-zones-passed',
    type: 'line',
    source: SOURCE.zones,
    filter: NO_ZONE,
    paint: { 'line-color': zoneColour, 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
  })

  // The checked corridor.
  map.addLayer({
    id: 'basilink-ground-risk-line',
    type: 'line',
    source: SOURCE.corridor,
    filter: isPart('ground-risk-buffer'),
    paint: {
      'line-color': CORRIDOR_COLOURS.groundRiskBuffer,
      'line-width': 1.5,
      'line-dasharray': [3, 2],
    },
  })
  map.addLayer({
    id: 'basilink-operational-fill',
    type: 'fill',
    source: SOURCE.corridor,
    filter: isPart('operational-volume'),
    paint: { 'fill-color': CORRIDOR_COLOURS.operationalVolume, 'fill-opacity': 0.3 },
  })
  map.addLayer({
    id: 'basilink-operational-line',
    type: 'line',
    source: SOURCE.corridor,
    filter: isPart('operational-volume'),
    paint: { 'line-color': CORRIDOR_COLOURS.operationalVolume, 'line-width': 1.5 },
  })
  map.addLayer({
    id: 'basilink-flight-line',
    type: 'line',
    source: SOURCE.corridor,
    filter: isPart('line'),
    paint: { 'line-color': CORRIDOR_COLOURS.line, 'line-width': 3 },
  })

  // The road route.
  map.addLayer({
    id: 'basilink-route',
    type: 'line',
    source: SOURCE.route,
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': CORRIDOR_COLOURS.route, 'line-width': 4, 'line-opacity': 0.85 },
  })

  // Sites: larger dots for start and destination, labels from zoom 12.5 (always for the pair).
  map.addLayer({
    id: SITES_LAYER,
    type: 'circle',
    source: SOURCE.sites,
    paint: {
      'circle-radius': ['case', ['==', ['get', 'role'], ''], 6, 9],
      'circle-color': ['match', ['get', 'kind'], 'lab', SITE_COLOURS.lab, SITE_COLOURS.hospital],
      'circle-stroke-color': ['case', ['==', ['get', 'role'], ''], '#ffffff', '#0f172a'],
      'circle-stroke-width': ['case', ['==', ['get', 'role'], ''], 2, 3],
    },
  })
  map.addLayer({
    id: 'basilink-site-labels',
    type: 'symbol',
    source: SOURCE.sites,
    layout: {
      'text-field': [
        'step',
        ['zoom'],
        ['case', ['==', ['get', 'role'], ''], '', ['get', 'label']],
        12.5,
        ['get', 'label'],
      ],
      'text-font': ['Frutiger Neue Regular'],
      'text-size': 12,
      'text-anchor': 'top',
      'text-offset': [0, 1],
      'text-optional': true,
      // When labels collide, start and destination win (lower sort key = placed first).
      'symbol-sort-key': ['case', ['==', ['get', 'role'], ''], 1, 0],
    },
    paint: { 'text-color': '#0f172a', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
  })
}

function setData(map: MapLibreMap, source: string, data: FeatureCollection | Feature) {
  ;(map.getSource(source) as GeoJSONSource | undefined)?.setData(data)
}

export function showZones(map: MapLibreMap, zones: FeatureCollection | null, visible: boolean) {
  setData(map, SOURCE.zones, zones ?? EMPTY)
  for (const id of ZONE_LAYERS)
    map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none')
}

export function showSites(
  map: MapLibreMap,
  sites: Site[],
  fromId: string | null,
  toId: string | null,
) {
  setData(map, SOURCE.sites, {
    type: 'FeatureCollection',
    features: sites.map((site) => {
      const role = site.id === fromId ? 'start' : site.id === toId ? 'destination' : ''
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: site.position },
        properties: {
          id: site.id,
          kind: site.kind,
          role,
          label: role ? `${site.name} (${role})` : site.name,
        },
      }
    }),
  })
}

export function showCorridor(
  map: MapLibreMap,
  analysis: CorridorAnalysis | null,
  route: Feature<LineString> | null,
) {
  const ids = (relations: string[]) =>
    analysis?.findings.filter((f) => relations.includes(f.relation)).map((f) => f.zone.id) ?? []
  const zoneFilter = (zoneIds: string[]): FilterSpecification =>
    zoneIds.length ? ['in', ['get', 'id'], ['literal', zoneIds]] : NO_ZONE

  if (map.getLayer('basilink-zones-conflict')) {
    map.setFilter('basilink-zones-conflict', zoneFilter(ids(['conflict'])))
    map.setFilter('basilink-zones-passed', zoneFilter(ids(['passes-below', 'passes-above'])))
  }

  setData(
    map,
    SOURCE.corridor,
    analysis
      ? {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: { part: 'ground-risk-buffer' },
              geometry: analysis.groundRiskArea,
            },
            {
              type: 'Feature',
              properties: { part: 'operational-volume' },
              geometry: analysis.operationalVolume,
            },
            {
              type: 'Feature',
              properties: { part: 'line' },
              geometry: { type: 'LineString', coordinates: analysis.line },
            },
          ],
        }
      : EMPTY,
  )
  setData(map, SOURCE.route, route ?? EMPTY)
}
