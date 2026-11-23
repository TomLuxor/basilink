<script setup lang="ts">
/**
 * The flight assumptions as an editable form, with the source of every default and the
 * volumes that follow from them (JARUS SORA 2.5 Annex A, see docs/decisions.md, D17).
 */
import { computed } from 'vue'
import { SORA_STANDARD_VALUES, type FlightVolumes } from '@/analysis/sora'
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

const fields: {
  key: keyof FlightParameters
  label: string
  unit: string
  step: number
  hint: string
}[] = [
  {
    key: 'cruiseSpeedKmh',
    label: 'Cruise speed',
    unit: 'km/h',
    step: 1,
    hint: `Default ${REFERENCE_AIRCRAFT.cruiseSpeedKmh} km/h, the cruise speed of the ${REFERENCE_AIRCRAFT.name}. Also used for the flight time.`,
  },
  {
    key: 'flightAltitudeM',
    label: 'Flight altitude above ground',
    unit: 'm',
    step: 5,
    hint: `Default 80 m: the highest value that keeps the whole checked volume below ${HEIGHT_LIMIT_M} m above ground (limit of the open category and floor of the Basel control zone).`,
  },
  {
    key: 'characteristicDimensionM',
    label: 'Drone size, rotor tip to rotor tip',
    unit: 'm',
    step: 0.1,
    hint: `Default 1.5 m, the JARUS example value; the size of the ${REFERENCE_AIRCRAFT.name} is not published.`,
  },
  {
    key: 'extraHorizontalM',
    label: 'Extra horizontal margin',
    unit: 'm',
    step: 5,
    hint: 'Added to the SORA contingency volume on each side.',
  },
  {
    key: 'extraVerticalM',
    label: 'Extra vertical margin',
    unit: 'm',
    step: 5,
    hint: 'Added to the top of the SORA contingency volume.',
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
const describedBy = (key: keyof FlightParameters) =>
  isInvalid(key) ? `param-${key}-error param-${key}-hint` : `param-${key}-hint`

const s = SORA_STANDARD_VALUES
</script>

<template>
  <details class="rounded-md border border-slate-300 p-3">
    <summary class="cursor-pointer font-semibold">
      Flight assumptions
      <span class="font-normal text-slate-700">
        ({{ effective.cruiseSpeedKmh }} km/h, {{ effective.flightAltitudeM }} m above ground)
      </span>
    </summary>

    <form class="mt-3 space-y-3" @submit.prevent>
      <p class="text-sm text-slate-700">
        These are assumptions, not values from an authorisation. Defaults follow Swiss drone rules
        and the SORA 2.5 method used by FOCA; the reference aircraft is the
        <a :href="REFERENCE_AIRCRAFT.url" class="underline">{{ REFERENCE_AIRCRAFT.name }}</a>
        ({{ REFERENCE_AIRCRAFT.maxTakeOffMassKg }} kg, so zone rules for drones above 250 g apply).
      </p>

      <div v-for="field in fields" :key="field.key" class="grid gap-1">
        <label :for="`param-${field.key}`" class="text-sm font-medium">
          {{ field.label }} ({{ field.unit }})
        </label>
        <input
          :id="`param-${field.key}`"
          type="number"
          required
          :min="PARAMETER_LIMITS[field.key].min"
          :max="PARAMETER_LIMITS[field.key].max"
          :step="field.step"
          :value="parameters[field.key]"
          :aria-invalid="isInvalid(field.key)"
          :aria-describedby="describedBy(field.key)"
          class="w-32 rounded-md border border-slate-500 px-2 py-1 focus-visible:outline-2 focus-visible:outline-sky-600 aria-invalid:border-2 aria-invalid:border-red-700"
          @input="update(field.key, $event)"
        />
        <p
          v-if="isInvalid(field.key)"
          :id="`param-${field.key}-error`"
          class="text-sm font-medium text-red-700"
        >
          Enter a number from {{ PARAMETER_LIMITS[field.key].min }} to
          {{ PARAMETER_LIMITS[field.key].max }}. Until then, the default of
          {{ DEFAULT_FLIGHT_PARAMETERS[field.key] }} {{ field.unit }} is used.
        </p>
        <p :id="`param-${field.key}-hint`" class="text-xs text-slate-600">{{ field.hint }}</p>
      </div>

      <dl class="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 rounded-md bg-slate-100 p-3 text-sm">
        <dt>Checked corridor, each side of the line</dt>
        <dd class="text-right font-medium">{{ volumes.corridorHalfWidthM.toFixed(1) }} m</dd>
        <dt>Checked height, from the ground up to</dt>
        <dd class="text-right font-medium">{{ volumes.contingencyTopM.toFixed(1) }} m</dd>
        <dt>Ground risk buffer beyond that</dt>
        <dd class="text-right font-medium">{{ volumes.groundRiskBufferM.toFixed(1) }} m</dd>
      </dl>
      <p
        v-if="volumes.contingencyTopM >= HEIGHT_LIMIT_M"
        class="rounded-md border border-amber-400 bg-amber-50 p-2 text-sm text-amber-950"
      >
        The checked volume reaches {{ volumes.contingencyTopM.toFixed(0) }} m above ground. Above
        {{ HEIGHT_LIMIT_M }} m the open-category limit is exceeded and the Basel control zone
        applies.
      </p>
      <p class="text-xs text-slate-600">
        Fixed SORA 2.5 Annex A standard values: GNSS error {{ s.gnssErrorM }} m, position holding
        {{ s.positionHoldingErrorM }} m, map error {{ s.mapErrorM }} m, reaction time
        {{ s.reactionTimeS }} s, stopping at {{ s.maxPitchDeg }}° pitch, barometric altitude error
        {{ s.altitudeMeasurementErrorM }} m, ground risk buffer by the 1:1 rule.
      </p>
      <button
        type="button"
        class="rounded-md border border-slate-500 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600"
        @click="emit('reset')"
      >
        Reset to defaults
      </button>
    </form>
  </details>
</template>
