<script setup lang="ts">
/** Start and destination as two native selects: fast, and fully usable with keyboard and screen readers. */
import type { Site } from '@/data/sites'

defineProps<{ sites: Site[]; fromId: string | null; toId: string | null }>()
const emit = defineEmits<{ setFrom: [id: string | null]; setTo: [id: string | null]; swap: [] }>()

const groups = [
  { kind: 'hospital', label: 'Hospitals' },
  { kind: 'lab', label: 'Laboratories' },
] as const

const valueOf = (event: Event) => (event.target as HTMLSelectElement).value || null
</script>

<template>
  <section aria-labelledby="pair-title" class="space-y-3">
    <h2 id="pair-title" class="text-lg font-semibold">Start and destination</h2>
    <div class="flex items-end gap-2">
      <div class="grid min-w-0 flex-1 gap-2">
        <label
          v-for="field in [
            { id: 'from', label: 'Start', value: fromId, other: toId },
            { id: 'to', label: 'Destination', value: toId, other: fromId },
          ]"
          :key="field.id"
          class="grid gap-1 text-sm font-medium"
        >
          {{ field.label }}
          <select
            :value="field.value ?? ''"
            class="w-full min-w-0 rounded-md border border-slate-400 bg-white px-2 py-1.5 text-base font-normal focus-visible:outline-2 focus-visible:outline-sky-600"
            @change="
              field.id === 'from'
                ? emit('setFrom', valueOf($event))
                : emit('setTo', valueOf($event))
            "
          >
            <option value="">Choose a site …</option>
            <optgroup v-for="group in groups" :key="group.kind" :label="group.label">
              <option
                v-for="site in sites.filter((s) => s.kind === group.kind)"
                :key="site.id"
                :value="site.id"
                :disabled="site.id === field.other"
              >
                {{ site.name }}
              </option>
            </optgroup>
          </select>
        </label>
      </div>
      <button
        type="button"
        class="rounded-md border border-slate-400 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50"
        :disabled="!fromId && !toId"
        aria-label="Swap start and destination"
        title="Swap start and destination"
        @click="emit('swap')"
      >
        <span aria-hidden="true">⇅</span>
      </button>
    </div>
    <p class="text-sm text-slate-600">
      Or click two sites on the map, or use the site list further down.
    </p>
  </section>
</template>
