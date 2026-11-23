<script setup lang="ts">
/** Switches the map between the top view and a tilted 3D view of the corridor. */
import { Box } from '@lucide/vue'

const view3d = defineModel<boolean>({ required: true })
</script>

<template>
  <button
    type="button"
    :aria-pressed="view3d"
    aria-label="3D view"
    class="group rounded-md bg-white p-1 shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
    @click="view3d = !view3d"
  >
    <span
      class="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium text-slate-700 group-hover:bg-slate-50 group-aria-pressed:bg-slate-800 group-aria-pressed:text-white"
    >
      <Box class="size-4" />
      3D
    </span>
  </button>
</template>
