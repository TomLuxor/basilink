<script setup lang="ts">
/**
 * Traffic light for every pair of sites: row = start, column = destination. It rates the zones
 * only (D28). A click selects the pair. The matrix is one tab stop; the arrow keys move between
 * the cells ("roving tabindex"), so keyboard users do not have to tab through 272 buttons.
 */
import { computed, nextTick, ref } from 'vue'
import { ChevronDown, Grid3x3 } from '@lucide/vue'
import type { TrafficLight } from '@/analysis/trafficLight'
import type { Site } from '@/data/sites'

const props = defineProps<{
  sites: Site[]
  /** `lights[i][j]` for j < i, or null while the matrix is closed or the data loads. */
  lights: TrafficLight[][] | null
  fromId: string | null
  toId: string | null
}>()
const emit = defineEmits<{ toggle: [open: boolean]; selectPair: [fromId: string, toId: string] }>()

/** Colour and shape, so the lights also differ without colour vision. */
const LIGHTS: Record<TrafficLight, { label: string; shape: string }> = {
  red: { label: 'Exemption needed', shape: 'rounded-[1px] bg-red-700' },
  amber: { label: 'Leaves Switzerland', shape: 'scale-90 rotate-45 rounded-[1px] bg-amber-600' },
  green: { label: 'No zone conflict', shape: 'rounded-full bg-green-700' },
}
const ORDER: TrafficLight[] = ['red', 'amber', 'green']

/** The light of a pair in either direction; the corridor is the same. */
const lightAt = (i: number, j: number) => (i > j ? props.lights?.[i]?.[j] : props.lights?.[j]?.[i])

const counts = computed(() => {
  const result: Record<TrafficLight, number> = { red: 0, amber: 0, green: 0 }
  for (const row of props.lights ?? []) for (const light of row) result[light]++
  return result
})

// --- Keyboard: one cell is focusable at a time ---

const n = computed(() => props.sites.length)
const active = ref<[row: number, column: number]>([0, 1])
const cellId = (i: number, j: number) => `pair-cell-${i}-${j}`

function move(rowStep: number, columnStep: number) {
  let [i, j] = active.value
  i += rowStep
  j += columnStep
  // Jump over the diagonal (a site to itself).
  if (i === j) {
    i += rowStep
    j += columnStep
  }
  if (i < 0 || j < 0 || i >= n.value || j >= n.value) return
  active.value = [i, j]
  void nextTick(() => document.getElementById(cellId(i, j))?.focus())
}

function onKeydown(event: KeyboardEvent) {
  const steps: Record<string, [number, number]> = {
    ArrowUp: [-1, 0],
    ArrowDown: [1, 0],
    ArrowLeft: [0, -1],
    ArrowRight: [0, 1],
  }
  const step = steps[event.key]
  if (!step) return
  event.preventDefault()
  move(...step)
}

function select(i: number, j: number) {
  active.value = [i, j]
  emit('selectPair', props.sites[i]!.id, props.sites[j]!.id)
}

const isSelected = (i: number, j: number) =>
  props.sites[i]?.id === props.fromId && props.sites[j]?.id === props.toId

function onToggle(event: Event) {
  const open = (event.target as HTMLDetailsElement).open
  if (open) {
    // Start the keyboard at the selected pair, if there is one.
    const i = props.sites.findIndex((site) => site.id === props.fromId)
    const j = props.sites.findIndex((site) => site.id === props.toId)
    if (i >= 0 && j >= 0) active.value = [i, j]
  }
  emit('toggle', open)
}
</script>

<template>
  <details class="group rounded-lg ring-1 ring-slate-200" @toggle="onToggle">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"
    >
      <Grid3x3 class="size-4 text-slate-600" />
      <span class="font-semibold">Exemption overview</span>
      <span class="text-sm text-slate-600"
        >{{ (sites.length * (sites.length - 1)) / 2 }} site pairs</span
      >
      <ChevronDown
        class="ml-auto size-4 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
      />
    </summary>

    <div class="space-y-3 px-3 pb-3">
      <p v-if="!lights" class="text-sm text-slate-600">Checking all pairs …</p>
      <template v-else>
        <ul class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-700">
          <li v-for="light in ORDER" :key="light" class="flex items-center gap-1.5">
            <span aria-hidden="true" :class="['inline-block size-2.5', LIGHTS[light].shape]" />
            <strong class="tabular-nums">{{ counts[light] }}</strong> {{ LIGHTS[light].label }}
          </li>
        </ul>

        <!-- relative: keeps the absolutely positioned screen reader texts inside the scroll box. -->
        <div class="relative overflow-x-auto">
          <table
            role="grid"
            aria-label="Traffic light for every pair of sites, zones only. Row: start, column: destination."
            class="border-separate border-spacing-px text-xs"
            @keydown="onKeydown"
          >
            <thead>
              <tr>
                <td />
                <th
                  v-for="site in sites"
                  :key="site.id"
                  scope="col"
                  class="w-3.5 pb-1 align-bottom font-normal text-slate-700"
                >
                  <!-- Upright text, read from bottom to top, keeps the columns narrow. -->
                  <span
                    aria-hidden="true"
                    class="inline-block rotate-180 text-[10px] leading-none whitespace-nowrap [writing-mode:vertical-rl]"
                  >
                    {{ site.shortName }}
                  </span>
                  <span class="sr-only">{{ site.name }}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(rowSite, i) in sites" :key="rowSite.id">
                <th
                  scope="row"
                  class="pr-1.5 text-right font-normal whitespace-nowrap text-slate-700"
                >
                  <span aria-hidden="true">{{ rowSite.shortName }}</span>
                  <span class="sr-only">{{ rowSite.name }}</span>
                </th>
                <td v-for="(columnSite, j) in sites" :key="columnSite.id" class="p-0">
                  <span
                    v-if="i === j"
                    aria-hidden="true"
                    class="block size-3.5 rounded-[2px] bg-slate-100"
                  />
                  <button
                    v-else-if="lightAt(i, j)"
                    :id="cellId(i, j)"
                    type="button"
                    :tabindex="active[0] === i && active[1] === j ? 0 : -1"
                    :aria-label="`${rowSite.name} to ${columnSite.name}: ${LIGHTS[lightAt(i, j)!].label}`"
                    :aria-current="isSelected(i, j) || undefined"
                    :class="[
                      'flex size-3.5 items-center justify-center rounded-[2px] hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-sky-600',
                      isSelected(i, j) && 'ring-2 ring-slate-900',
                    ]"
                    @click="select(i, j)"
                  >
                    <span
                      aria-hidden="true"
                      :class="['block size-2', LIGHTS[lightAt(i, j)!].shape]"
                    />
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="text-xs text-slate-600">
          Zones only, with the current assumptions. Every flight beyond visual line of sight needs a
          FOCA authorisation anyway.
        </p>
      </template>
    </div>
  </details>
</template>
