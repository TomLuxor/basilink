<script setup lang="ts">
import { ref } from 'vue'
import BaseMap from '@/components/BaseMap.vue'
import BasemapSwitcher from '@/components/BasemapSwitcher.vue'
import DataSources from '@/components/DataSources.vue'
import FlightAssumptions from '@/components/FlightAssumptions.vue'
import MapLegend from '@/components/MapLegend.vue'
import PairSelect from '@/components/PairSelect.vue'
import ResultPanel from '@/components/ResultPanel.vue'
import SiteList from '@/components/SiteList.vue'
import { useCorridorCheck } from '@/composables/useCorridorCheck'
import type { BasemapId } from '@/config/basemaps'

const check = useCorridorCheck()
const { parameters } = check
const basemap = ref<BasemapId>('light')
const zonesVisible = ref(true)
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-white text-slate-900 md:h-dvh">
    <header class="border-b border-slate-200 px-4 py-3">
      <h1 class="text-xl font-bold">Basilink</h1>
      <p class="text-sm text-slate-700">Drone corridors for lab samples in the Basel region</p>
    </header>

    <main class="flex flex-1 flex-col md:min-h-0 md:flex-row">
      <section
        aria-label="Corridor check"
        class="space-y-6 border-slate-200 p-4 md:w-104 md:shrink-0 md:overflow-y-auto md:border-r"
      >
        <p
          role="note"
          class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          <strong>Pre-check only.</strong> Basilink does not replace an authorisation from FOCA or
          any other competent authority. Temporary restrictions (DABS/NOTAM) are not included.
        </p>

        <PairSelect
          :sites="check.sites"
          :from-id="check.fromId.value"
          :to-id="check.toId.value"
          @set-from="check.setFrom"
          @set-to="check.setTo"
          @swap="check.swap"
        />

        <ResultPanel
          :analysis="check.analysis.value"
          :from="check.from.value"
          :to="check.to.value"
          :route-summary="check.routeSummary.value"
          :route-index="check.routeIndex.value"
          :terrain-error="check.terrainError.value"
          :load-error="check.loadError.value"
        />

        <FlightAssumptions
          v-model="parameters"
          :volumes="check.volumes.value"
          @reset="check.resetParameters"
        />

        <MapLegend v-model:zones-visible="zonesVisible" />

        <SiteList
          :sites="check.sites"
          :from-id="check.fromId.value"
          :to-id="check.toId.value"
          @set-from="check.setFrom"
          @set-to="check.setTo"
        />

        <DataSources :meta="check.zoneMeta.value" :route-index="check.routeIndex.value" />
      </section>

      <section aria-label="Map" class="relative h-[60vh] md:h-auto md:flex-1">
        <BaseMap
          :basemap="basemap"
          :zones="check.zones.value"
          :zones-visible="zonesVisible"
          :sites="check.sites"
          :from-id="check.fromId.value"
          :to-id="check.toId.value"
          :analysis="check.analysis.value"
          :route="check.routeGeometry.value"
          @select-site="check.selectFromMap"
        />
        <div class="absolute top-3 left-3">
          <BasemapSwitcher v-model="basemap" />
        </div>
      </section>
    </main>
  </div>
</template>
