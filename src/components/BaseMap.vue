<script setup lang="ts">
/**
 * The map: swisstopo base map rendered with MapLibre GL JS.
 * Overlays (zones, sites, corridor) are added in later steps.
 */
import { onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import { Map, NavigationControl, ScaleControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
// MapLibre 6 computes its worker path at runtime, which breaks once Vite bundles the library.
// Importing the worker with `?url` makes Vite ship it as a file and tells MapLibre where it is.
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { BASEMAPS, type BasemapId } from '@/config/basemaps'
import { MAP_MAX_BOUNDS, REGION_BBOX } from '@/config/region'

setWorkerUrl(workerUrl)

const props = defineProps<{ basemap: BasemapId }>()

const container = useTemplateRef<HTMLDivElement>('container')
const errorMessage = ref<string | null>(null)
let map: Map | null = null

onMounted(() => {
  if (!container.value) return
  try {
    map = new Map({
      container: container.value,
      style: BASEMAPS[props.basemap].styleUrl,
      bounds: REGION_BBOX,
      fitBoundsOptions: { padding: 16 },
      maxBounds: MAP_MAX_BOUNDS,
      attributionControl: { compact: false },
    })
  } catch (error) {
    // MapLibre 6 needs WebGL 2. Without it the rest of the app must still be usable.
    console.error(error)
    errorMessage.value =
      'The map cannot be displayed in this browser (WebGL 2 is required). All results are also available as text.'
    return
  }
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
  map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left')
  map.on('error', (event) => console.warn('Map error:', event.error))
})

watch(
  () => props.basemap,
  (basemap) => map?.setStyle(BASEMAPS[basemap].styleUrl),
)

onBeforeUnmount(() => {
  map?.remove()
  map = null
})
</script>

<template>
  <div class="relative h-full w-full">
    <div ref="container" class="h-full w-full" role="region" aria-label="Map of the Basel region" />
    <p
      v-if="errorMessage"
      class="absolute inset-0 flex items-center justify-center bg-slate-100 p-6 text-center text-slate-800"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>
