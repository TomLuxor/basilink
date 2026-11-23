<script setup lang="ts">
/**
 * The flight assumptions as a small form. The cross-section shows the volume that follows from
 * them (JARUS SORA 2.5 Annex A); the reasons for each default are in docs/decisions.md (D17).
 */
import { computed } from 'vue'
import { ChevronDown, RotateCcw, SlidersHorizontal, TriangleAlert } from '@lucide/vue'
import type { FlightVolumes } from '@/analysis/sora'
import CorridorProfile from '@/components/CorridorProfile.vue'
import {
  DEFAULT_FLIGHT_PARAMETERS,
  HEIGHT_LIMIT_M,
  PARAMETER_LIMITS,
  REFERENCE_AIRCRAFT,
  sanitizeParameters,
  type FlightParameters,
} from '@/config/flight'

const parameters = defineModel<FlightParameters>({ required: true })
defineProps<{ volumes: FlightVolumes }>()
const emit = defineEmits<{ reset: [] }>()

const SORA_ANNEX_A =
  'http://jarus-rpas.org/wp-content/uploads/2024/06/SORA-v2.5-Annex-A-Release.JAR_doc_26-pdf.pdf'

const fields: {
  key: keyof FlightParameters
  label: string
  unit: string
  step: number
  hint: string
}[] = [
  {
    key: 'cruiseSpeedKmh',
    label: 'Speed',
    unit: 'km/h',
    step: 1,
    hint: `Default ${REFERENCE_AIRCRAFT.cruiseSpeedKmh} (${REFERENCE_AIRCRAFT.name})`,
  },
  {
    key: 'flightAltitudeM',
    label: 'Flight height',
    unit: 'm',
    step: 5,
    hint: `Above ground. Default ${DEFAULT_FLIGHT_PARAMETERS.flightAltitudeM}, stays below ${HEIGHT_LIMIT_M} m`,
  },
  {
    key: 'characteristicDimensionM',
    label: 'Drone size',
    unit: 'm',
    step: 0.1,
    hint: `Rotor tip to tip. Default ${DEFAULT_FLIGHT_PARAMETERS.characteristicDimensionM} (JARUS)`,
  },
  {
    key: 'extraHorizontalM',
    label: 'Extra width',
    unit: 'm',
    step: 5,
    hint: 'Each side, on top of SORA',
  },
  {
    key: 'extraVerticalM',
    label: 'Extra height',
    unit: 'm',
    step: 5,
    hint: 'On top of SORA',
  },
]

function update(key: keyof FlightParameters, event: Event) {
  // An empty field gives NaN; the analysis then falls back to the default (sanitizeParameters).
  parameters.value = {
    ...parameters.value,
    [key]: (event.target as HTMLInputElement).valueAsNumber,
  }
}

/** The values the analysis actually uses: invalid fields are replaced by their default. */
const effective = computed(() => sanitizeParameters(parameters.value))
const isInvalid = (key: keyof FlightParameters) => effective.value[key] !== parameters.value[key]
</script>

<template>
  <details class="group rounded-lg ring-1 ring-slate-200">
    <summary
      class="flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600 [&::-webkit-details-marker]:hidden"
    >
      <SlidersHorizontal class="size-4 text-slate-600" />
      <span class="font-semibold">Assumptions</span>
      <span class="text-sm text-slate-600">
        {{ effective.cruiseSpeedKmh }} km/h · {{ effective.flightAltitudeM }} m
      </span>
      <ChevronDown
        class="ml-auto size-4 text-slate-500 transition-transform group-open:rotate-180 motion-reduce:transition-none"
      />
    </summary>

    <form class="space-y-4 px-3 pt-1 pb-3" @submit.prevent>
      <CorridorProfile :volumes="volumes" :altitude-m="effective.flightAltitudeM" />

      <p
        v-if="volumes.contingencyTopM >= HEIGHT_LIMIT_M"
        class="flex gap-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-950 ring-1 ring-amber-200"
      >
        <TriangleAlert class="mt-0.5 size-4 shrink-0 text-amber-700" />
        Reaches {{ Math.round(volumes.contingencyTopM) }} m: above the {{ HEIGHT_LIMIT_M }} m limit
        and inside the Basel control zone.
      </p>

      <div class="grid grid-cols-2 gap-x-3 gap-y-3">
        <div v-for="field in fields" :key="field.key" class="grid content-start gap-1">
          <label :for="`param-${field.key}`" class="text-sm font-medium">{{ field.label }}</label>
          <div class="flex items-center gap-1.5">
            <input
              :id="`param-${field.key}`"
              type="number"
              required
              :min="PARAMETER_LIMITS[field.key].min"
              :max="PARAMETER_LIMITS[field.key].max"
              :step="field.step"
              :value="parameters[field.key]"
              :aria-invalid="isInvalid(field.key)"
              :aria-describedby="`param-${field.key}-note`"
              class="w-full min-w-0 rounded-md border border-slate-500 px-2 py-1 focus-visible:outline-2 focus-visible:outline-sky-600 aria-invalid:border-2 aria-invalid:border-red-700"
              @input="update(field.key, $event)"
            />
            <span class="text-sm text-slate-600">{{ field.unit }}</span>
          </div>
          <p
            :id="`param-${field.key}-note`"
            :class="
              isInvalid(field.key) ? 'text-xs font-medium text-red-700' : 'text-xs text-slate-600'
            "
          >
            <template v-if="isInvalid(field.key)">
              Enter {{ PARAMETER_LIMITS[field.key].min }}–{{ PARAMETER_LIMITS[field.key].max }}.
              Using {{ DEFAULT_FLIGHT_PARAMETERS[field.key] }} for now.
            </template>
            <template v-else>{{ field.hint }}</template>
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
        <p>
          Method <a :href="SORA_ANNEX_A" class="underline">SORA 2.5</a>, as used by FOCA. Drone
          <a :href="REFERENCE_AIRCRAFT.url" class="underline">{{ REFERENCE_AIRCRAFT.name }}</a>
          ({{ REFERENCE_AIRCRAFT.maxTakeOffMassKg }} kg).
        </p>
        <button
          type="button"
          class="inline-flex items-center gap-1 rounded-md border border-slate-500 bg-white px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600"
          @click="emit('reset')"
        >
          <RotateCcw class="size-3.5" />
          Reset
        </button>
      </div>
    </form>
  </details>
</template>
