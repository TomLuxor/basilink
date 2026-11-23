<script setup lang="ts">
/** All sites as a list: the text alternative to the dots on the map, each with its source. */
import { ChevronDown, ExternalLink, MapPin } from '@lucide/vue'
import type { Site } from '@/data/sites'

defineProps<{ sites: Site[]; fromId: string | null; toId: string | null }>()
const emit = defineEmits<{ setFrom: [id: string]; setTo: [id: string] }>()

const groups = [
  { kind: 'hospital', label: 'Hospitals' },
  { kind: 'lab', label: 'Laboratories' },
] as const

const buttonClass =
  'rounded border border-slate-500 bg-white px-2 py-0.5 text-xs font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 aria-pressed:border-slate-900 aria-pressed:bg-slate-900 aria-pressed:text-white'
</script>

<template>
  <details class="group rounded-lg ring-1 ring-slate-200">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"
    >
      <MapPin class="size-4 text-slate-600" />
      <span class="font-semibold">Hospitals and labs</span>
      <span class="text-sm text-slate-600">{{ sites.length }}</span>
      <ChevronDown
        class="ml-auto size-4 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
      />
    </summary>
    <div class="space-y-3 px-3 pb-3">
      <div v-for="group in groups" :key="group.kind">
        <h3 class="text-xs font-semibold tracking-wide text-slate-600 uppercase">
          {{ group.label }}
        </h3>
        <ul class="divide-y divide-slate-200">
          <li
            v-for="site in sites.filter((s) => s.kind === group.kind)"
            :key="site.id"
            class="flex items-center gap-3 py-1.5"
          >
            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">{{ site.name }}</p>
              <p class="text-xs text-slate-600">
                {{ site.address }}
                <a
                  :href="site.source.url"
                  :aria-label="`Source for ${site.name}: ${site.source.label}`"
                  :title="`Source: ${site.source.label}`"
                  class="inline-flex align-text-bottom text-slate-600 hover:text-slate-900"
                >
                  <ExternalLink class="size-3.5" />
                </a>
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
    </div>
  </details>
</template>
