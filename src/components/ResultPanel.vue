<script setup lang="ts">
/**
 * The analysis result. It must make sense without the map: verdict, drone vs. car, the zones
 * along the corridor and who to contact. Details (restriction texts, buffer zones) open on demand.
 */
import { computed } from 'vue'
import { MapPin, ShieldAlert, ShieldCheck, TriangleAlert } from '@lucide/vue'
import { groupByCategory, type CorridorAnalysis } from '@/analysis/analyse'
import AuthorityList from '@/components/AuthorityList.vue'
import TravelTimes from '@/components/TravelTimes.vue'
import ZoneList from '@/components/ZoneList.vue'
import type { DriveTimes } from '@/data/driveTimes'
import type { RouteSummary } from '@/data/routes'
import type { Site } from '@/data/sites'
import { formatDuration } from '@/format'

const props = defineProps<{
  analysis: CorridorAnalysis | null
  from: Site | null
  to: Site | null
  routeSummary: RouteSummary | null
  driveTimes: DriveTimes | null
  driveTimesError: boolean
  terrainError: boolean
  loadError: string | null
}>()
const trafficOpen = defineModel<boolean>('trafficOpen', { required: true })

const findings = computed(() => props.analysis?.findings ?? [])
/** Zones in the airspace of the corridor, air traffic first (see ZONE_CATEGORY_ORDER). */
const zoneFindings = computed(() =>
  groupByCategory(findings.value.filter((f) => f.relation !== 'ground-risk-buffer')).flatMap(
    (group) => group.findings,
  ),
)
const bufferFindings = computed(() =>
  findings.value.filter((f) => f.relation === 'ground-risk-buffer'),
)

const zones = (count: number) => `${count} ${count === 1 ? 'zone' : 'zones'}`

const verdict = computed(() => {
  const count = (relation: string) => findings.value.filter((f) => f.relation === relation).length
  switch (props.analysis?.verdict) {
    case 'authorisation-needed':
      return {
        title: 'Exemption needed',
        detail: `Crosses ${zones(count('conflict'))}`,
        icon: ShieldAlert,
        style: 'bg-red-50 text-red-950 ring-red-200',
        iconStyle: 'text-red-700',
      }
    case 'outside-vertical-limits':
      return {
        title: 'No zone conflict',
        detail:
          count('passes-above') === 0
            ? `Passes below ${zones(count('passes-below'))}`
            : `Clear of ${zones(count('passes-below') + count('passes-above'))} by height`,
        icon: ShieldCheck,
        style: 'bg-green-50 text-green-950 ring-green-200',
        iconStyle: 'text-green-700',
      }
    default:
      return {
        title: 'No zone conflict',
        detail: 'No zones along the corridor',
        icon: ShieldCheck,
        style: 'bg-green-50 text-green-950 ring-green-200',
        iconStyle: 'text-green-700',
      }
  }
})

/**
 * One sentence for screen readers whenever the result changes. It lives in an element that is
 * always rendered, because a live region that appears together with its content is often not
 * announced.
 */
const announcement = computed(() => {
  if (!props.analysis || !props.from || !props.to) return ''
  const road = props.routeSummary ? `, car ${formatDuration(props.routeSummary.durationS)}` : ''
  return `${verdict.value.title}: ${props.from.name} to ${props.to.name}. ${verdict.value.detail}. Drone ${formatDuration(props.analysis.flightTimeS)}${road}.`
})
</script>

<template>
  <section aria-labelledby="result-title" class="space-y-4">
    <h2 id="result-title" class="sr-only">Result</h2>
    <p class="sr-only" aria-live="polite">{{ announcement }}</p>

    <p v-if="loadError" role="alert" class="rounded-lg bg-red-50 p-3 text-sm ring-1 ring-red-200">
      {{ loadError }}
    </p>
    <p v-else-if="!analysis || !from || !to" class="flex items-center gap-2 text-sm text-slate-600">
      <MapPin class="size-4 shrink-0" />
      Choose a start and a destination, or click two sites on the map.
    </p>

    <template v-else>
      <div :class="['flex items-center gap-3 rounded-lg p-3 ring-1', verdict.style]">
        <component :is="verdict.icon" :class="['size-7 shrink-0', verdict.iconStyle]" />
        <div>
          <p class="font-semibold">{{ verdict.title }}</p>
          <p class="text-sm">{{ verdict.detail }}</p>
        </div>
      </div>

      <TravelTimes
        v-model:traffic-open="trafficOpen"
        :flight-time-s="analysis.flightTimeS"
        :flight-distance-m="analysis.distanceM"
        :speed-kmh="Math.round(analysis.volumes.speedMs * 3.6)"
        :road="routeSummary"
        :drive-times="driveTimes"
        :drive-times-error="driveTimesError"
      />

      <p
        v-if="analysis.leavesSwitzerland"
        class="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-700" />
        <span>
          Leaves Switzerland (dark on the map). Zones there are not checked, and that part also
          needs approval from the
          <abbr title="Luftfahrt-Bundesamt">LBA</abbr> (Germany) or the
          <abbr title="Direction générale de l'Aviation civile">DGAC</abbr> (France).
        </span>
      </p>
      <p
        v-if="analysis.needsTerrain"
        class="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-amber-200"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-700" />
        <span>
          {{
            terrainError
              ? 'Terrain heights unavailable. Zones with limits above sea level count as conflicts.'
              : 'Loading terrain heights …'
          }}
        </span>
      </p>

      <div v-if="zoneFindings.length" class="space-y-2">
        <h3 class="text-sm font-semibold">Zones along the corridor</h3>
        <ZoneList :findings="zoneFindings" />
      </div>

      <details v-if="bufferFindings.length" class="text-sm">
        <summary class="cursor-pointer text-slate-700">
          + {{ zones(bufferFindings.length) }} in the ground risk buffer only
        </summary>
        <p class="mt-1 text-xs text-slate-600">
          No airspace conflict, but a drone that ends its flight early could come down there.
        </p>
        <ZoneList :findings="bufferFindings" class="mt-2" />
      </details>

      <AuthorityList v-if="analysis.authorities.length" :authorities="analysis.authorities" />

      <p class="text-xs text-slate-600">
        Checked ±{{ Math.round(analysis.volumes.corridorHalfWidthM) }} m around the line, up to
        {{ Math.round(analysis.volumes.contingencyTopM) }} m above ground (SORA 2.5). Not included:
        DABS/NOTAM and zones abroad. Flights beyond visual line of sight always need a FOCA
        authorisation.
      </p>
    </template>
  </section>
</template>
