<script setup lang="ts">
/**
 * The analysis result as text. It must make sense without the map (screen readers, list view):
 * verdict, flight vs. road time, the zones by category and who to contact.
 */
import { computed } from 'vue'
import { groupByCategory, type CorridorAnalysis, type ZoneRelation } from '@/analysis/analyse'
import { ZONE_CATEGORIES } from '@/config/zoneCategories'
import type { RouteIndex, RouteSummary } from '@/data/routes'
import type { Site } from '@/data/sites'
import { formatDate, formatDistance, formatDuration, formatZoneHeights } from '@/format'

const props = defineProps<{
  analysis: CorridorAnalysis | null
  from: Site | null
  to: Site | null
  routeSummary: RouteSummary | null
  routeIndex: RouteIndex | null
  terrainError: boolean
  loadError: string | null
}>()

const zoneFindings = computed(() =>
  groupByCategory(
    props.analysis?.findings.filter((f) => f.relation !== 'ground-risk-buffer') ?? [],
  ),
)
const bufferFindings = computed(
  () => props.analysis?.findings.filter((f) => f.relation === 'ground-risk-buffer') ?? [],
)
const passedCount = computed(
  () =>
    props.analysis?.findings.filter(
      (f) => f.relation === 'passes-below' || f.relation === 'passes-above',
    ).length ?? 0,
)
const conflictCount = computed(
  () => props.analysis?.findings.filter((f) => f.relation === 'conflict').length ?? 0,
)

const verdict = computed(() => {
  switch (props.analysis?.verdict) {
    case 'authorisation-needed':
      return {
        title: 'Exemption needed',
        text: `The corridor crosses ${conflictCount.value} restriction ${conflictCount.value === 1 ? 'zone' : 'zones'}. Flying requires permission from the authorities listed below.`,
        style: 'border-red-700 bg-red-50 text-red-950',
      }
    case 'outside-vertical-limits':
      return {
        title: 'No zone conflict',
        text: `The corridor stays below ${passedCount.value} ${passedCount.value === 1 ? 'zone' : 'zones'} (for example a control zone starting at 120 m) and crosses no other zone.`,
        style: 'border-green-700 bg-green-50 text-green-950',
      }
    default:
      return {
        title: 'No zone conflict',
        text: 'The corridor touches no restriction zone.',
        style: 'border-green-700 bg-green-50 text-green-950',
      }
  }
})

const comparison = computed(() => {
  if (!props.analysis || !props.routeSummary) return null
  const difference = props.routeSummary.durationS - props.analysis.flightTimeS
  return difference >= 0
    ? `The drone is about ${formatDuration(difference)} faster.`
    : `Driving is about ${formatDuration(-difference)} faster.`
})

const RELATION_LABELS: Record<ZoneRelation, string> = {
  conflict: 'Conflict',
  'passes-below': 'Passes below',
  'passes-above': 'Passes above',
  'ground-risk-buffer': 'Ground risk buffer only',
}
const RELATION_STYLES: Record<ZoneRelation, string> = {
  conflict: 'bg-red-700 text-white',
  'passes-below': 'bg-green-700 text-white',
  'passes-above': 'bg-green-700 text-white',
  'ground-risk-buffer': 'bg-slate-600 text-white',
}
</script>

<template>
  <section aria-labelledby="result-title" class="space-y-4">
    <h2 id="result-title" class="text-lg font-semibold">Result</h2>

    <p v-if="loadError" role="alert" class="rounded-md border border-red-700 bg-red-50 p-3 text-sm">
      {{ loadError }}
    </p>
    <p v-else-if="!analysis || !from || !to" class="text-sm text-slate-700">
      Choose a start and a destination to check the direct drone corridor between them.
    </p>

    <template v-else>
      <!-- Short summary, announced by screen readers whenever the result changes. -->
      <div aria-live="polite" aria-atomic="true" class="space-y-3">
        <div :class="['rounded-md border-l-4 p-3', verdict.style]">
          <p class="font-semibold">{{ verdict.title }}: {{ from.name }} → {{ to.name }}</p>
          <p class="text-sm">{{ verdict.text }}</p>
        </div>

        <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt class="font-medium">Drone</dt>
          <dd>
            {{ formatDuration(analysis.flightTimeS) }}
            <span class="text-slate-600">
              ({{ formatDistance(analysis.distanceM) }} direct line at
              {{ Math.round(analysis.volumes.speedMs * 3.6) }} km/h)
            </span>
          </dd>
          <dt class="font-medium">Road</dt>
          <dd v-if="routeSummary">
            {{ formatDuration(routeSummary.durationS) }}
            <span class="text-slate-600">
              ({{ formatDistance(routeSummary.distanceM) }}, without traffic)
            </span>
          </dd>
          <dd v-else class="text-slate-600">Not available yet for this pair.</dd>
        </dl>
        <p v-if="comparison" class="text-sm font-medium">{{ comparison }}</p>
      </div>

      <p
        v-if="analysis.leavesSwitzerland"
        class="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950"
      >
        <strong>The corridor leaves Switzerland.</strong> Restriction zones in Germany or France are
        not included in this check.
      </p>
      <p
        v-if="analysis.needsTerrain"
        class="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950"
      >
        {{
          terrainError
            ? 'Terrain heights could not be loaded. Zones with limits above sea level are treated as conflicts.'
            : 'Loading terrain heights for zones with limits above sea level …'
        }}
      </p>

      <div v-if="zoneFindings.length" class="space-y-3">
        <h3 class="font-semibold">Zones along the corridor</h3>
        <div v-for="group in zoneFindings" :key="group.category">
          <h4 class="text-sm font-semibold tracking-wide text-slate-700 uppercase">
            {{ ZONE_CATEGORIES[group.category].label }}
          </h4>
          <ul class="space-y-2">
            <li v-for="{ zone, relation } in group.findings" :key="zone.id" class="text-sm">
              <p>
                <span
                  :class="[
                    'mr-1 rounded px-1.5 py-0.5 text-xs font-semibold',
                    RELATION_STYLES[relation],
                  ]"
                >
                  {{ RELATION_LABELS[relation] }}
                </span>
                <strong>{{ zone.name }}</strong>
              </p>
              <p class="text-slate-700">Height: {{ formatZoneHeights(zone) }}</p>
              <p class="text-slate-700">{{ zone.restriction }}</p>
              <p v-if="!zone.permanent && zone.validFrom && zone.validTo" class="text-slate-700">
                Temporary: {{ formatDate(zone.validFrom) }} – {{ formatDate(zone.validTo) }}
              </p>
            </li>
          </ul>
        </div>
      </div>

      <details v-if="bufferFindings.length" class="text-sm">
        <summary class="cursor-pointer font-medium">
          {{ bufferFindings.length }} more {{ bufferFindings.length === 1 ? 'zone' : 'zones' }} only
          in the ground risk buffer
        </summary>
        <p class="mt-1 text-slate-700">
          No airspace conflict, but a drone that has to terminate its flight could come down there.
        </p>
        <ul class="mt-1 list-disc pl-5">
          <li v-for="{ zone } in bufferFindings" :key="zone.id">
            {{ zone.name }} ({{ ZONE_CATEGORIES[zone.category].label }})
          </li>
        </ul>
      </details>

      <div v-if="analysis.authorities.length" class="space-y-2">
        <h3 class="font-semibold">Who to ask for an exemption</h3>
        <ul class="space-y-2 text-sm">
          <li v-for="authority in analysis.authorities" :key="authority.name">
            <p>
              <strong>{{ authority.name }}</strong>
              <span v-if="authority.service">, {{ authority.service }}</span>
            </p>
            <p class="text-slate-700">For: {{ authority.zoneNames.join(', ') }}</p>
            <p class="flex flex-wrap gap-x-3">
              <a v-if="authority.email" :href="`mailto:${authority.email}`" class="underline">{{
                authority.email
              }}</a>
              <a v-if="authority.phone" :href="`tel:${authority.phone}`" class="underline">{{
                authority.phone
              }}</a>
              <a v-if="authority.url" :href="authority.url" class="underline">Website</a>
            </p>
          </li>
        </ul>
      </div>

      <p class="rounded-md bg-slate-100 p-3 text-xs text-slate-700">
        Checked volume: {{ Math.round(analysis.volumes.corridorHalfWidthM) }} m on each side of the
        direct line, from the ground up to {{ Math.round(analysis.volumes.contingencyTopM) }} m
        above ground (SORA 2.5). Independently of zones, a flight beyond visual line of sight always
        needs an operational authorisation from FOCA. Flight time excludes take-off, landing and
        handling.
        <template v-if="routeIndex">
          Road times: {{ routeIndex.provider }}, computed on
          {{ formatDate(routeIndex.computedOn) }}.
        </template>
      </p>
    </template>
  </section>
</template>
