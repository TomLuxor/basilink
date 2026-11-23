<script setup lang="ts">
import { ref } from 'vue'
import { Drone, Info } from '@lucide/vue'
import BaseMap from '@/components/BaseMap.vue'
import BasemapSwitcher from '@/components/BasemapSwitcher.vue'
import DataSources from '@/components/DataSources.vue'
import FlightAssumptions from '@/components/FlightAssumptions.vue'
import MapLegend from '@/components/MapLegend.vue'
import PairSelect from '@/components/PairSelect.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import SiteList from '@/components/SiteList.vue'
import View3dToggle from '@/components/View3dToggle.vue'
import { useCorridorCheck } from '@/composables/useCorridorCheck'
import type { BasemapId } from '@/config/basemaps'

const check = useCorridorCheck()
const { parameters } = check
const basemap = ref<BasemapId>('light')
const zonesVisible = ref(true)
const view3d = ref(false)
</script>

<template>
  <!--
    The source order is the reading order on a phone: choose a pair, see it on the map, then read
    the result and the details. On wide screens the map gets its own column on the right and
    stays in view (sticky) while the page scrolls.
  -->
  <main
    class="grid min-h-dvh bg-white text-slate-900 md:grid-cols-[26rem_1fr] md:grid-rows-[auto_1fr]"
  >
    <section aria-labelledby="app-title" class="space-y-4 p-4 md:border-r md:border-slate-200">
      <header class="flex items-center gap-3">
        <span class="rounded-lg bg-teal-700 p-1.5 text-white">
          <Drone class="size-6" />
        </span>
        <div>
          <h1 id="app-title" class="text-xl leading-tight font-bold">Basilink</h1>
          <p class="text-sm text-slate-600">Drone corridors for lab samples in Basel</p>
        </div>
      </header>

      <p role="note" class="flex items-center gap-2 text-sm text-amber-900">
        <Info class="size-4 shrink-0" />
        <span><strong>Pre-check only</strong>, not an authorisation by FOCA.</span>
      </p>

      <PairSelect
        :sites="check.sites"
        :from-id="check.fromId.value"
        :to-id="check.toId.value"
        @set-from="check.setFrom"
        @set-to="check.setTo"
        @swap="check.swap"
      />
    </section>

    <section
      aria-label="Map of the Basel region"
      aria-describedby="map-keyboard-hint"
      class="relative h-[60svh] md:sticky md:top-0 md:col-start-2 md:row-span-2 md:row-start-1 md:h-dvh"
    >
      <BaseMap
        :basemap="basemap"
        :zones="check.zones.value"
        :zones-visible="zonesVisible"
        :sites="check.sites"
        :from-id="check.fromId.value"
        :to-id="check.toId.value"
        :analysis="check.analysis.value"
        :route="check.routeGeometry.value"
        :view3d="view3d"
        @select-site="check.selectFromMap"
      />
      <div class="absolute top-3 left-3 flex flex-col items-start gap-2">
        <div class="flex gap-2">
          <BasemapSwitcher v-model="basemap" />
          <View3dToggle v-model="view3d" />
        </div>
        <MapLegend v-model:zones-visible="zonesVisible" />
      </div>
    </section>

    <div class="space-y-6 p-4 md:border-r md:border-slate-200">
      <ResultPanel
        :analysis="check.analysis.value"
        :from="check.from.value"
        :to="check.to.value"
        :route-summary="check.routeSummary.value"
        :terrain-error="check.terrainError.value"
        :load-error="check.loadError.value"
      />

      <FlightAssumptions
        v-model="parameters"
        :volumes="check.volumes.value"
        @reset="check.resetParameters"
      />

      <SiteList
        :sites="check.sites"
        :from-id="check.fromId.value"
        :to-id="check.toId.value"
        @set-from="check.setFrom"
        @set-to="check.setTo"
      />

      <DataSources :meta="check.zoneMeta.value" :route-index="check.routeIndex.value" />
    </div>
  </main>
</template>
