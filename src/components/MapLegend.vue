<script setup lang="ts">
/** Layer switch for the restriction zones and the legend of everything drawn on the map. */
import { ZONE_CATEGORIES, ZONE_CATEGORY_ORDER } from '@/config/zoneCategories'
import { CORRIDOR_COLOURS, SITE_COLOURS } from '@/map/overlays'

const zonesVisible = defineModel<boolean>('zonesVisible', { required: true })

const corridorItems = [
  { label: 'Direct flight line', colour: CORRIDOR_COLOURS.line, shape: 'line' },
  {
    label: 'Checked operational volume',
    colour: CORRIDOR_COLOURS.operationalVolume,
    shape: 'area',
  },
  { label: 'Ground risk buffer', colour: CORRIDOR_COLOURS.groundRiskBuffer, shape: 'dashed' },
  { label: 'Road route', colour: CORRIDOR_COLOURS.route, shape: 'line' },
  { label: 'Hospital', colour: SITE_COLOURS.hospital, shape: 'dot' },
  { label: 'Laboratory', colour: SITE_COLOURS.lab, shape: 'dot' },
]
</script>

<template>
  <section aria-labelledby="legend-title" class="space-y-2 text-sm">
    <h2 id="legend-title" class="text-lg font-semibold">Map</h2>
    <label class="flex items-center gap-2 font-medium">
      <input v-model="zonesVisible" type="checkbox" class="size-4 accent-slate-800" />
      Show drone restriction zones (FOCA)
    </label>
    <ul class="grid grid-cols-1 gap-1 sm:grid-cols-2">
      <li v-for="category in ZONE_CATEGORY_ORDER" :key="category" class="flex items-center gap-2">
        <span
          aria-hidden="true"
          class="inline-block size-4 shrink-0 rounded-sm border-2"
          :style="{
            borderColor: ZONE_CATEGORIES[category].colour,
            backgroundColor: `${ZONE_CATEGORIES[category].colour}33`,
          }"
        />
        {{ ZONE_CATEGORIES[category].label }}
      </li>
    </ul>
    <p class="text-slate-600">
      Zones in the result have a thick outline (conflict) or a dashed outline (passed below).
    </p>
    <ul class="grid grid-cols-1 gap-1 sm:grid-cols-2">
      <li v-for="item in corridorItems" :key="item.label" class="flex items-center gap-2">
        <span
          v-if="item.shape === 'dot'"
          aria-hidden="true"
          class="inline-block size-3.5 shrink-0 rounded-full border-2 border-white ring-1 ring-slate-400"
          :style="{ backgroundColor: item.colour }"
        />
        <span
          v-else-if="item.shape === 'area'"
          aria-hidden="true"
          class="inline-block h-3 w-5 shrink-0 border"
          :style="{ borderColor: item.colour, backgroundColor: `${item.colour}55` }"
        />
        <span
          v-else
          aria-hidden="true"
          class="inline-block w-5 shrink-0 border-t-[3px]"
          :style="{
            borderColor: item.colour,
            borderTopStyle: item.shape === 'dashed' ? 'dashed' : 'solid',
          }"
        />
        {{ item.label }}
      </li>
    </ul>
  </section>
</template>
