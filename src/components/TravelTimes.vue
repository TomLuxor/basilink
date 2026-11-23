<script setup lang="ts">
/** Drone vs. car as two bars in the colours of the map, so the difference shows at a glance. */
import { computed } from 'vue'
import { Car, Drone } from '@lucide/vue'
import type { RouteSummary } from '@/data/routes'
import { formatDistance, formatDuration } from '@/format'
import { CORRIDOR_COLOURS } from '@/map/overlays'

const props = defineProps<{
  flightTimeS: number
  flightDistanceM: number
  speedKmh: number
  road: RouteSummary | null
}>()

const rows = computed(() => {
  const longest = Math.max(props.flightTimeS, props.road?.durationS ?? 0)
  const width = (seconds: number) => `${Math.max(2, (seconds / longest) * 100)}%`
  return [
    {
      label: 'Drone',
      icon: Drone,
      colour: CORRIDOR_COLOURS.line,
      time: formatDuration(props.flightTimeS),
      width: width(props.flightTimeS),
      detail: `${formatDistance(props.flightDistanceM)} straight line at ${props.speedKmh} km/h`,
    },
    {
      label: 'Car',
      icon: Car,
      colour: CORRIDOR_COLOURS.route,
      time: props.road ? formatDuration(props.road.durationS) : '–',
      width: props.road ? width(props.road.durationS) : '0%',
      detail: props.road
        ? `${formatDistance(props.road.distanceM)} by road, without traffic`
        : 'No road route for this pair yet',
    },
  ]
})

const difference = computed(() => {
  if (!props.road) return null
  const seconds = props.road.durationS - props.flightTimeS
  return seconds >= 0
    ? { text: `Drone ${formatDuration(seconds)} faster`, drone: true }
    : { text: `Car ${formatDuration(-seconds)} faster`, drone: false }
})
</script>

<template>
  <div class="space-y-2">
    <ul class="space-y-2">
      <li
        v-for="row in rows"
        :key="row.label"
        class="grid grid-cols-[1.25rem_1fr_4.5rem] items-center gap-x-3"
      >
        <component :is="row.icon" class="size-5 text-slate-700" />
        <div class="h-2.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div
            class="h-full rounded-full"
            :style="{ width: row.width, backgroundColor: row.colour }"
          />
        </div>
        <span class="text-right text-sm font-semibold tabular-nums">
          <span class="sr-only">{{ row.label }}: </span>{{ row.time }}
        </span>
        <span class="col-span-2 col-start-2 text-xs text-slate-600">{{ row.detail }}</span>
      </li>
    </ul>
    <p
      v-if="difference"
      :class="[
        'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold',
        difference.drone ? 'bg-green-50 text-green-800' : 'bg-slate-100 text-slate-800',
      ]"
    >
      {{ difference.text }}
    </p>
  </div>
</template>
