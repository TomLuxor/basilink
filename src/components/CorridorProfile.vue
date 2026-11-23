<script setup lang="ts">
/**
 * Cross-section through the corridor: the volume the analysis checks, drawn instead of described.
 * Schematic: width and height have separate scales, the labels give the real values.
 */
import { computed } from 'vue'
import type { FlightVolumes } from '@/analysis/sora'
import { HEIGHT_LIMIT_M } from '@/config/flight'
import { CORRIDOR_COLOURS } from '@/map/overlays'

const props = defineProps<{ volumes: FlightVolumes; altitudeM: number }>()

// Drawing area in SVG units.
const WIDTH = 320
const GROUND_Y = 124
const TOP_Y = 14
const CENTRE_X = WIDTH / 2

const shape = computed(() => {
  const v = props.volumes
  const yScale = (GROUND_Y - TOP_Y) / Math.max(v.contingencyTopM, HEIGHT_LIMIT_M)
  const xScale = (CENTRE_X - 4) / (v.corridorHalfWidthM + v.groundRiskBufferM)
  const half = v.corridorHalfWidthM * xScale
  return {
    volumeX: CENTRE_X - half,
    volumeWidth: 2 * half,
    volumeY: GROUND_Y - v.contingencyTopM * yScale,
    bufferWidth: v.groundRiskBufferM * xScale,
    flightY: GROUND_Y - props.altitudeM * yScale,
    limitY: GROUND_Y - HEIGHT_LIMIT_M * yScale,
  }
})

const metres = (value: number) => `${Math.round(value)} m`

const description = computed(() => {
  const v = props.volumes
  return `Cross-section of the checked volume: ${v.corridorHalfWidthM.toFixed(1)} m on each side of the line, from the ground up to ${v.contingencyTopM.toFixed(1)} m. Flight height ${props.altitudeM} m. Ground risk buffer: a further ${v.groundRiskBufferM.toFixed(1)} m on each side.`
})
</script>

<template>
  <figure class="space-y-1">
    <svg
      :viewBox="`0 0 ${WIDTH} 142`"
      class="w-full text-[10px]"
      role="img"
      :aria-label="description"
    >
      <!-- Ground risk buffer, on the ground on both sides -->
      <rect
        v-for="x in [shape.volumeX - shape.bufferWidth, shape.volumeX + shape.volumeWidth]"
        :key="x"
        :x="x"
        :y="GROUND_Y - 6"
        :width="shape.bufferWidth"
        height="6"
        :fill="CORRIDOR_COLOURS.groundRiskBuffer"
        fill-opacity="0.2"
        :stroke="CORRIDOR_COLOURS.groundRiskBuffer"
        stroke-dasharray="3 2"
      />
      <!-- Checked volume (flight geography + contingency volume) -->
      <rect
        :x="shape.volumeX"
        :y="shape.volumeY"
        :width="shape.volumeWidth"
        :height="GROUND_Y - shape.volumeY"
        :fill="CORRIDOR_COLOURS.operationalVolume"
        fill-opacity="0.3"
        :stroke="CORRIDOR_COLOURS.operationalVolume"
      />
      <!-- 120 m: limit of the open category and floor of the Basel control zone -->
      <line
        x1="0"
        :x2="WIDTH"
        :y1="shape.limitY"
        :y2="shape.limitY"
        stroke="#475569"
        stroke-dasharray="4 3"
      />
      <text x="2" :y="shape.limitY - 3" class="fill-slate-600">{{ HEIGHT_LIMIT_M }} m limit</text>
      <!-- Flight height -->
      <line
        :x1="shape.volumeX"
        :x2="shape.volumeX + shape.volumeWidth"
        :y1="shape.flightY"
        :y2="shape.flightY"
        :stroke="CORRIDOR_COLOURS.line"
        stroke-width="2"
      />
      <circle :cx="CENTRE_X" :cy="shape.flightY" r="4" :fill="CORRIDOR_COLOURS.line" />
      <text :x="CENTRE_X + 7" :y="shape.flightY - 5" class="fill-slate-900">
        {{ metres(altitudeM) }}
      </text>
      <!-- Ground -->
      <line x1="0" :x2="WIDTH" :y1="GROUND_Y" :y2="GROUND_Y" stroke="#0f172a" stroke-width="1.5" />
      <!-- Dimensions -->
      <text
        :x="shape.volumeX + shape.volumeWidth + 4"
        :y="shape.volumeY + 10"
        class="fill-slate-900"
      >
        {{ metres(volumes.contingencyTopM) }}
      </text>
      <text :x="CENTRE_X" :y="GROUND_Y + 13" text-anchor="middle" class="fill-slate-900">
        ±{{ metres(volumes.corridorHalfWidthM) }}
      </text>
      <text
        v-for="x in [
          shape.volumeX - shape.bufferWidth / 2,
          shape.volumeX + shape.volumeWidth + shape.bufferWidth / 2,
        ]"
        :key="x"
        :x="x"
        :y="GROUND_Y + 13"
        text-anchor="middle"
        class="fill-slate-600"
      >
        {{ metres(volumes.groundRiskBufferM) }}
      </text>
    </svg>
    <figcaption class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600" aria-hidden="true">
      <span class="inline-flex items-center gap-1">
        <span
          class="inline-block h-2.5 w-4 border"
          :style="{
            borderColor: CORRIDOR_COLOURS.operationalVolume,
            backgroundColor: `${CORRIDOR_COLOURS.operationalVolume}4d`,
          }"
        />
        Checked volume
      </span>
      <span class="inline-flex items-center gap-1">
        <span class="inline-block h-0.5 w-4" :style="{ backgroundColor: CORRIDOR_COLOURS.line }" />
        Flight height
      </span>
      <span class="inline-flex items-center gap-1">
        <span
          class="inline-block h-2.5 w-4 border border-dashed"
          :style="{
            borderColor: CORRIDOR_COLOURS.groundRiskBuffer,
            backgroundColor: `${CORRIDOR_COLOURS.groundRiskBuffer}33`,
          }"
        />
        Ground risk buffer
      </span>
    </figcaption>
  </figure>
</template>
