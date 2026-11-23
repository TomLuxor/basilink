<script setup lang="ts">
/** Zones along the corridor, one compact row each. The official restriction text opens on demand. */
import { ArrowDownToLine, ArrowUpToLine, ChevronDown, CircleX, TriangleAlert } from '@lucide/vue'
import type { ZoneFinding, ZoneRelation } from '@/analysis/analyse'
import { ZONE_CATEGORIES } from '@/config/zoneCategories'
import { formatDate, formatHeightRange } from '@/format'

defineProps<{ findings: ZoneFinding[] }>()

const RELATIONS: Record<ZoneRelation, { label: string; icon: typeof CircleX; style: string }> = {
  conflict: { label: 'Conflict', icon: CircleX, style: 'bg-red-50 text-red-800 ring-red-200' },
  'passes-below': {
    label: 'Passes below',
    icon: ArrowDownToLine,
    style: 'bg-green-50 text-green-800 ring-green-200',
  },
  'passes-above': {
    label: 'Passes above',
    icon: ArrowUpToLine,
    style: 'bg-green-50 text-green-800 ring-green-200',
  },
  'ground-risk-buffer': {
    label: 'Buffer only',
    icon: TriangleAlert,
    style: 'bg-slate-100 text-slate-800 ring-slate-200',
  },
}
</script>

<template>
  <ul class="divide-y divide-slate-200 rounded-lg ring-1 ring-slate-200">
    <li v-for="{ zone, relation } in findings" :key="zone.id">
      <details class="group">
        <summary
          class="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"
        >
          <span
            aria-hidden="true"
            class="size-3 shrink-0 rounded-sm"
            :style="{ backgroundColor: ZONE_CATEGORIES[zone.category].colour }"
          />
          <span class="min-w-0 flex-1">
            <span class="block text-sm font-medium">{{ zone.name }}</span>
            <span class="block text-xs text-slate-600">
              {{ ZONE_CATEGORIES[zone.category].label }} · {{ formatHeightRange(zone) }}
            </span>
          </span>
          <span
            :class="[
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1',
              RELATIONS[relation].style,
            ]"
          >
            <component :is="RELATIONS[relation].icon" class="size-3.5" />
            {{ RELATIONS[relation].label }}
          </span>
          <ChevronDown
            class="size-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
          />
        </summary>
        <div class="space-y-1 px-3 pb-3 pl-9 text-sm text-slate-700">
          <p>{{ zone.restriction }}</p>
          <p v-if="!zone.permanent && zone.validFrom && zone.validTo">
            Temporary: {{ formatDate(zone.validFrom) }} – {{ formatDate(zone.validTo) }}
          </p>
        </div>
      </details>
    </li>
  </ul>
</template>
