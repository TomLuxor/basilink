<script setup lang="ts">
/** Start and destination as two native selects: fast, and fully usable with keyboard and screen readers. */
import { ArrowUpDown } from '@lucide/vue'
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
  <section aria-labelledby="pair-title">
    <h2 id="pair-title" class="sr-only">Start and destination</h2>
    <div class="flex items-center gap-2">
      <div class="grid min-w-0 flex-1 gap-2">
        <label
          v-for="field in [
            { id: 'from', label: 'Start', value: fromId, other: toId },
            { id: 'to', label: 'Destination', value: toId, other: fromId },
          ]"
          :key="field.id"
          class="grid gap-0.5 text-xs font-medium text-slate-700"
        >
          {{ field.label }}
          <select
            :value="field.value ?? ''"
            class="w-full min-w-0 rounded-md border border-slate-500 bg-white px-2 py-1.5 text-base font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-sky-600"
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
        class="mt-4 rounded-md border border-slate-500 bg-white p-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 disabled:opacity-50"
        :disabled="!fromId && !toId"
        aria-label="Swap start and destination"
        title="Swap start and destination"
        @click="emit('swap')"
      >
        <ArrowUpDown class="size-4" />
      </button>
    </div>
  </section>
</template>
