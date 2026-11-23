<script setup lang="ts">
/** Where every piece of data comes from, how fresh it is, and the required attributions. */
import type { RouteIndex } from '@/data/routes'
import { formatDate } from '@/format'
import type { ZoneDataMeta } from '@/types/zone'

defineProps<{ meta: ZoneDataMeta | null; routeIndex: RouteIndex | null }>()

const SORA_ANNEX_A =
  'http://jarus-rpas.org/wp-content/uploads/2024/06/SORA-v2.5-Annex-A-Release.JAR_doc_26-pdf.pdf'
</script>

<template>
  <section aria-labelledby="data-sources-title" class="space-y-1 text-sm text-slate-700">
    <h2 id="data-sources-title" class="text-lg font-semibold text-slate-900">Data sources</h2>
    <ul class="list-disc space-y-1 pl-5">
      <li v-if="meta">
        Drone restriction zones:
        <a :href="meta.sourceUrl" class="underline">FOCA</a>, data as of
        <time :datetime="meta.dataAsOf">{{ formatDate(meta.dataAsOf) }}</time
        >, <a :href="meta.licenseUrl" class="underline">{{ meta.license }}</a
        >.
      </li>
      <li>Base map, aerial imagery, national border and terrain heights: © swisstopo.</li>
      <li>
        Road routes: © openrouteservice.org by HeiGIT, map data © OpenStreetMap
        contributors<template v-if="routeIndex"
          >, computed on {{ formatDate(routeIndex.computedOn) }}</template
        >.
      </li>
      <li>
        Sites: Canton of Basel-Stadt open data, swisstopo, Viollier and Unilabs (see site list).
      </li>
      <li>
        Corridor dimensions:
        <a :href="SORA_ANNEX_A" class="underline">JARUS SORA 2.5 Annex A</a>, section A.5.2.
      </li>
    </ul>
  </section>
</template>
