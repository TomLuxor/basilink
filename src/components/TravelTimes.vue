<script setup lang="ts">
/**
 * Drone vs. car as two bars in the colours of the map, so the difference shows at a glance.
 * "Car by time of day" adds typical traffic, asked live from Mapbox when opened (D29).
 */
import { computed } from 'vue'
import { Car, Clock, Drone } from '@lucide/vue'
import MapboxLogo from '@/components/MapboxLogo.vue'
import type { DriveTimes } from '@/data/driveTimes'
import type { RouteSummary } from '@/data/routes'
import { formatDate, formatDistance, formatDuration } from '@/format'
import { CORRIDOR_COLOURS } from '@/map/overlays'

const props = defineProps<{
  flightTimeS: number
  flightDistanceM: number
  speedKmh: number
  road: RouteSummary | null
  driveTimes: DriveTimes | null
  driveTimesError: boolean
}>()
const trafficOpen = defineModel<boolean>('trafficOpen', { required: true })

const barWidth = (seconds: number, longest: number) => `${Math.max(2, (seconds / longest) * 100)}%`

const rows = computed(() => {
  const longest = Math.max(props.flightTimeS, props.road?.durationS ?? 0)
  return [
    {
      label: 'Drone',
      icon: Drone,
      colour: CORRIDOR_COLOURS.line,
      time: formatDuration(props.flightTimeS),
      width: barWidth(props.flightTimeS, longest),
      detail: `${formatDistance(props.flightDistanceM)} straight line at ${props.speedKmh} km/h`,
    },
    {
      label: 'Car',
      icon: Car,
      colour: CORRIDOR_COLOURS.route,
      time: props.road ? formatDuration(props.road.durationS) : '–',
      width: props.road ? barWidth(props.road.durationS, longest) : '0%',
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

/** One bar per departure time, plus the drone for comparison, all on the same scale. */
const trafficRows = computed(() => {
  if (!props.driveTimes) return []
  const longest = Math.max(props.flightTimeS, ...props.driveTimes.times.map((t) => t.durationS))
  return [
    ...props.driveTimes.times.map((t) => ({
      label: t.departure,
      srLabel: `Car at ${t.departure}`,
      colour: CORRIDOR_COLOURS.route,
      time: formatDuration(t.durationS),
      width: barWidth(t.durationS, longest),
    })),
    {
      label: '',
      srLabel: 'Drone',
      colour: CORRIDOR_COLOURS.line,
      time: formatDuration(props.flightTimeS),
      width: barWidth(props.flightTimeS, longest),
    },
  ]
})

const trafficStatus = computed(() => {
  if (props.driveTimesError) return 'Times with traffic are not available right now.'
  return props.driveTimes ? '' : 'Asking Mapbox …'
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

    <details
      :open="trafficOpen"
      class="text-sm"
      @toggle="trafficOpen = ($event.target as HTMLDetailsElement).open"
    >
      <summary class="cursor-pointer text-slate-700">
        <Clock class="mb-0.5 inline size-4" /> Car by time of day
      </summary>
      <div class="mt-2 space-y-2">
        <p aria-live="polite" class="text-xs text-slate-600 empty:hidden">{{ trafficStatus }}</p>
        <template v-if="driveTimes">
          <ul class="space-y-1.5">
            <li
              v-for="row in trafficRows"
              :key="row.srLabel"
              class="grid grid-cols-[2.75rem_1fr_4.5rem] items-center gap-x-3"
            >
              <span class="text-xs text-slate-700 tabular-nums">
                <Drone v-if="!row.label" class="size-4" />{{ row.label }}
              </span>
              <div class="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
                <div
                  class="h-full rounded-full"
                  :style="{ width: row.width, backgroundColor: row.colour }"
                />
              </div>
              <span class="text-right font-semibold tabular-nums">
                <span class="sr-only">{{ row.srLabel }}: </span>{{ row.time }}
              </span>
            </li>
          </ul>
          <p class="text-xs text-slate-600">
            Typical traffic on Tuesday,
            <time :datetime="driveTimes.date">{{ formatDate(driveTimes.date) }}</time
            >. Another routing service than above, so even the night can differ. Estimates only: on
            the road, signs and traffic rules apply (<a
              href="https://www.mapbox.com/legal/tos"
              class="underline"
              >Mapbox terms</a
            >).
          </p>
          <p class="flex items-center gap-1.5 text-xs text-slate-600">
            Directions powered by
            <a href="https://www.mapbox.com/about/maps/" class="text-slate-900">
              <MapboxLogo class="h-4" />
            </a>
          </p>
        </template>
      </div>
    </details>
  </div>
</template>
