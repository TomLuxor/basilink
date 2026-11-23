<script setup lang="ts">
/** Switches between the swisstopo light map and aerial imagery. A native radio group, so it works with keyboard and screen readers. */
import { BASEMAPS, type BasemapId } from '@/config/basemaps'

const basemap = defineModel<BasemapId>({ required: true })
const options = Object.entries(BASEMAPS) as [BasemapId, { label: string }][]
</script>

<template>
  <fieldset class="flex rounded-md bg-white p-1 shadow-md">
    <legend class="sr-only">Base map</legend>
    <label
      v-for="[id, { label }] in options"
      :key="id"
      class="cursor-pointer rounded px-3 py-1.5 text-sm font-medium text-slate-700 has-checked:bg-slate-800 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-sky-600"
    >
      <input v-model="basemap" type="radio" name="basemap" :value="id" class="sr-only" />
      {{ label }}
    </label>
  </fieldset>
</template>
