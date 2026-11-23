<script setup lang="ts">
/**
 * The map: swisstopo base map rendered with MapLibre GL JS, plus Basilink's overlays
 * (src/map/overlays.ts). Everything shown here is also available as text in the side panel.
 */
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { LngLatBounds, Map, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 computes its worker path at runtime, which breaks once Vite bundles the library.
// Importing the worker with `?url` makes Vite ship it as a file and tells MapLibre where it is.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import type { CorridorAnalysis } from '@/analysis/analyse'
import { BASEMAPS, type BasemapId } from '@/config/basemaps'
import { MAP_MAX_BOUNDS, REGION_BBOX } from '@/config/region'
import type { Site } from '@/data/sites'
import {
  addOverlays,
  show3d,
  showCorridor,
  showSites,
  showZones,
  SITES_LAYER,
} from '@/map/overlays'

setWorkerUrl(workerUrl)

const props = defineProps<{
  basemap: BasemapId
  zones: FeatureCollection | null
  zonesVisible: boolean
  sites: Site[]
  fromId: string | null
  toId: string | null
  analysis: CorridorAnalysis | null
  route: Feature<LineString> | null
  view3d: boolean
}>()

const emit = defineEmits<{ selectSite: [id: string] }>()

const container = useTemplateRef<HTMLDivElement>('container')
const errorMessage = ref<string | null>(null)
let map: Map | null = null

const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Below the `md` breakpoint the page scrolls past the map (see App.vue). There, one finger must
// scroll the page and two fingers move the map ("cooperative gestures"), or the map traps the
// scroll. On wide screens the map has its own column and reacts to every gesture.
const narrowScreen = window.matchMedia('(max-width: 47.99rem)')
function updateGestures() {
  if (!map) return
  if (narrowScreen.matches) map.cooperativeGestures.enable()
  else map.cooperativeGestures.disable()
}

/** Draws all overlays from the current props. Safe to call before the style has loaded. */
function render() {
  if (!map?.getSource('basilink-zones')) return
  showZones(map, props.zones, props.zonesVisible)
  showSites(map, props.sites, props.fromId, props.toId)
  showCorridor(map, props.analysis, props.route)
  show3d(map, props.view3d)
}

/**
 * Camera for the current view. In 3D the map is tilted and turned so that the corridor is seen
 * from the side, start on the left: the corridor's direction then points to the right.
 */
function camera(): { pitch: number; bearing: number } {
  if (!props.view3d) return { pitch: 0, bearing: 0 }
  const line = props.analysis?.lineLv95
  if (!line) return { pitch: 60, bearing: map?.getBearing() ?? 0 }
  const [[x1, y1], [x2, y2]] = line
  const azimuth = (Math.atan2(x2 - x1, y2 - y1) * 180) / Math.PI // clockwise from north
  return { pitch: 60, bearing: azimuth - 90 }
}

const duration = () => (prefersReducedMotion() ? 0 : 800)

/** Zooms to start and destination once both are chosen. */
function fitToPair() {
  const from = props.sites.find((site) => site.id === props.fromId)
  const to = props.sites.find((site) => site.id === props.toId)
  if (!map || !from || !to) return
  const bounds = new LngLatBounds(from.position, from.position).extend(to.position)
  map.fitBounds(bounds, { padding: 80, maxZoom: 15, duration: duration(), ...camera() })
}

/** Switches between the top view and the 3D view. */
function updateView() {
  if (!map) return
  render()
  if (props.fromId && props.toId) fitToPair()
  else map.easeTo({ ...camera(), duration: duration() })
}

onMounted(() => {
  if (!container.value) return
  try {
    map = new Map({
      container: container.value,
      style: BASEMAPS[props.basemap].styleUrl,
      bounds: REGION_BBOX,
      fitBoundsOptions: { padding: 16 },
      maxBounds: MAP_MAX_BOUNDS,
      cooperativeGestures: narrowScreen.matches,
      // Without `compact`, MapLibre shows the full line on wide maps and an expandable button on
      // narrow ones, where the line would cover the scale bar.
      attributionControl: {
        customAttribution:
          'Zones © FOCA · Routes © openrouteservice.org by HeiGIT, OSM contributors',
      },
    })
  } catch (error) {
    // MapLibre 6 needs WebGL 2. Without it the rest of the app must still be usable.
    console.error(error)
    errorMessage.value =
      'The map cannot be displayed in this browser (WebGL 2 is required). All results are also available as text.'
    return
  }
  narrowScreen.addEventListener('change', updateGestures)
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
  map.on('error', (event) => console.warn('Map error:', event.error))

  // A new base map style removes custom layers, so add them again after every style load.
  map.on('style.load', () => {
    if (!map) return
    addOverlays(map)
    render()
  })

  map.on('click', SITES_LAYER, (event) => {
    const id = event.features?.[0]?.properties?.id
    if (typeof id === 'string') emit('selectSite', id)
  })
  map.on('mouseenter', SITES_LAYER, () => map && (map.getCanvas().style.cursor = 'pointer'))
  map.on('mouseleave', SITES_LAYER, () => map && (map.getCanvas().style.cursor = ''))
})

watch(
  () => props.basemap,
  (basemap) => map?.setStyle(BASEMAPS[basemap].styleUrl, { diff: false }),
)
watch(
  () => [props.zones, props.zonesVisible, props.fromId, props.toId, props.analysis, props.route],
  render,
)
watch(() => [props.fromId, props.toId], fitToPair)
watch(() => props.view3d, updateView)

onBeforeUnmount(() => {
  narrowScreen.removeEventListener('change', updateGestures)
  map?.remove()
  map = null
})
</script>

<template>
  <div class="relative h-full w-full">
    <!-- MapLibre gives its canvas the role "region" and the name "Map". The landmark around it
         is the map section in App.vue, which refers to the hint below. -->
    <div ref="container" class="h-full w-full" />
    <p id="map-keyboard-hint" class="sr-only">
      Sites can also be chosen with the keyboard: in the start and destination fields or in the site
      list.
    </p>
    <p
      v-if="errorMessage"
      class="absolute inset-0 flex items-center justify-center bg-slate-100 p-6 text-center text-slate-800"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
