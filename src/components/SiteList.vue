<script setup lang="ts">
/** All sites as a list: the text alternative to the dots on the map, with their sources. */
import type { Site } from '@/data/sites'

defineProps<{ sites: Site[]; fromId: string | null; toId: string | null }>()
const emit = defineEmits<{ setFrom: [id: string]; setTo: [id: string] }>()

const groups = [
  { kind: 'hospital', label: 'Hospitals' },
  { kind: 'lab', label: 'Laboratories' },
] as const

const buttonClass =
  'rounded border px-2 py-1 text-xs font-medium focus-visible:outline-2 focus-visible:outline-sky-600 aria-pressed:border-slate-900 aria-pressed:bg-slate-900 aria-pressed:text-white border-slate-500 bg-white hover:bg-slate-50'
</script>

<template>
  <section aria-labelledby="site-list-title" class="space-y-3">
    <h2 id="site-list-title" class="text-lg font-semibold">All sites</h2>
    <div v-for="group in groups" :key="group.kind">
      <h3 class="text-sm font-semibold tracking-wide text-slate-700 uppercase">
        {{ group.label }}
      </h3>
      <ul class="divide-y divide-slate-200">
        <li
          v-for="site in sites.filter((s) => s.kind === group.kind)"
          :key="site.id"
          class="flex items-start justify-between gap-3 py-2"
        >
          <div class="min-w-0 text-sm">
            <p class="font-medium">{{ site.name }}</p>
            <p class="text-slate-600">{{ site.category }} · {{ site.address }}</p>
            <p class="text-xs text-slate-600">
              Source: <a :href="site.source.url" class="underline">{{ site.source.label }}</a>
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button
              type="button"
              :class="buttonClass"
              :aria-pressed="site.id === fromId"
              :aria-label="`Set ${site.name} as start`"
              @click="emit('setFrom', site.id)"
            >
              Start
            </button>
            <button
              type="button"
              :class="buttonClass"
              :aria-pressed="site.id === toId"
              :aria-label="`Set ${site.name} as destination`"
              @click="emit('setTo', site.id)"
            >
              Destination
            </button>
          </div>
        </li>
      </ul>
    </div>
  </section>
</template>
