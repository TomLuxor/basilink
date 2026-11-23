<script setup lang="ts">
/** Required attributions and data freshness, as a small footer. Details are in DATA_SOURCES.md. */
import type { RouteIndex } from '@/data/routes'
import { formatDate } from '@/format'
import type { ZoneDataMeta } from '@/types/zone'

defineProps<{ meta: ZoneDataMeta | null; routeIndex: RouteIndex | null }>()

const REPO_URL = 'https://github.com/TomLuxor/basilink'
</script>

<template>
  <footer class="space-y-1 border-t border-slate-200 pt-3 text-xs text-slate-600">
    <h2 class="sr-only">Data sources</h2>
    <p>
      Zones © <a :href="meta?.sourceUrl" class="underline">FOCA</a
      ><template v-if="meta">
        (as of <time :datetime="meta.dataAsOf">{{ formatDate(meta.dataAsOf) }}</time
        >)</template
      >
      · Maps, border and terrain © swisstopo · Routes © openrouteservice.org by HeiGIT, map data ©
      OpenStreetMap contributors<template v-if="routeIndex">
        ({{ formatDate(routeIndex.computedOn) }})</template
      >
      · Times with traffic ©
      <a href="https://www.mapbox.com/about/maps/" class="underline">Mapbox</a> (asked live, not
      stored)
    </p>
    <p>
      <a :href="`${REPO_URL}/blob/main/DATA_SOURCES.md`" class="underline">Sources and licences</a>
      · <a :href="REPO_URL" class="underline">Source code</a>
    </p>
  </footer>
</template>
