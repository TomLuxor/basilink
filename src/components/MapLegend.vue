<script setup lang="ts">
/** Map overlay: switch for the restriction zones and the legend of everything drawn on the map. */
import { ChevronDown, Layers } from '@lucide/vue'
import { ZONE_CATEGORIES, ZONE_CATEGORY_ORDER } from '@/config/zoneCategories'
import {
  CORRIDOR_COLOURS,
  SITE_COLOURS,
  VERTICAL_EXAGGERATION,
  ZONE_3D_HEADROOM_M,
} from '@/map/overlays'

const zonesVisible = defineModel<boolean>('zonesVisible', { required: true })

const corridorItems = [
  { label: 'Flight line', colour: CORRIDOR_COLOURS.line, shape: 'line' },
  { label: 'Checked volume', colour: CORRIDOR_COLOURS.operationalVolume, shape: 'area' },
  { label: 'Ground risk buffer', colour: CORRIDOR_COLOURS.groundRiskBuffer, shape: 'dashed' },
  { label: 'Outside Switzerland', colour: CORRIDOR_COLOURS.abroad, shape: 'area' },
  { label: 'Road route', colour: CORRIDOR_COLOURS.route, shape: 'line' },
  { label: 'Zone in conflict', colour: '#0f172a', shape: 'thick' },
  { label: 'Zone passed below', colour: '#0f172a', shape: 'dashed' },
  { label: 'Hospital', colour: SITE_COLOURS.hospital, shape: 'dot' },
  { label: 'Laboratory', colour: SITE_COLOURS.lab, shape: 'dot' },
]
</script>

<template>
  <details class="group w-max max-w-64 rounded-md bg-white text-sm shadow-md">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 rounded-md px-3 py-1.5 font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"
    >
      <Layers class="size-4" />
      Legend
      <ChevronDown
        class="size-4 transition-transform group-open:rotate-180 motion-reduce:transition-none"
      />
    </summary>
    <div class="max-h-[45svh] space-y-3 overflow-y-auto border-t border-slate-200 px-3 py-2">
      <label class="flex items-center gap-2 font-medium">
        <input v-model="zonesVisible" type="checkbox" class="size-4 accent-slate-800" />
        Restriction zones
      </label>
      <ul class="space-y-1">
        <li v-for="category in ZONE_CATEGORY_ORDER" :key="category" class="flex items-center gap-2">
          <span
            aria-hidden="true"
            class="inline-block size-3.5 shrink-0 rounded-sm border-2"
            :style="{
              borderColor: ZONE_CATEGORIES[category].colour,
              backgroundColor: `${ZONE_CATEGORIES[category].colour}33`,
            }"
          />
          {{ ZONE_CATEGORIES[category].label }}
        </li>
      </ul>
      <ul class="space-y-1 border-t border-slate-200 pt-2">
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
            class="inline-block w-5 shrink-0"
            :style="{
              borderTop: `${item.shape === 'thick' ? 4 : 3}px ${item.shape === 'dashed' ? 'dashed' : 'solid'} ${item.colour}`,
            }"
          />
          {{ item.label }}
        </li>
      </ul>
      <p class="border-t border-slate-200 pt-2 text-xs text-slate-600">
        3D: heights ×{{ VERTICAL_EXAGGERATION }}. Zones around the corridor only, cut
        {{ ZONE_3D_HEADROOM_M }} m above the checked volume.
      </p>
    </div>
  </details>
</template>
