<script setup lang="ts">
import { ref } from 'vue'
import BaseMap from '@/components/BaseMap.vue'
import BasemapSwitcher from '@/components/BasemapSwitcher.vue'
import DataSources from '@/components/DataSources.vue'
import type { BasemapId } from '@/config/basemaps'

const basemap = ref<BasemapId>('light')
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
        class="space-y-6 border-slate-200 p-4 md:w-96 md:shrink-0 md:overflow-y-auto md:border-r"
      >
        <p
          role="note"
          class="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
        >
          <strong>Pre-check only.</strong> Basilink does not replace an authorisation from FOCA or
          any other competent authority. Temporary restrictions (DABS/NOTAM) are not included.
        </p>
        <p>
          Basilink checks whether a direct drone corridor between a hospital and a lab crosses
          official drone restriction zones, and compares the flight time with the driving time.
        </p>
        <DataSources />
      </section>

      <section aria-label="Map" class="relative h-[60vh] md:h-auto md:flex-1">
        <BaseMap :basemap="basemap" />
        <div class="absolute top-3 left-3">
          <BasemapSwitcher v-model="basemap" />
        </div>
      </section>
    </main>
  </div>
</template>
