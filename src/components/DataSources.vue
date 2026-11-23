<script setup lang="ts">
/** Shows where the zone data comes from and how fresh it is (from public/data/zones-meta.json). */
import { onMounted, ref } from 'vue'
import type { ZoneDataMeta } from '@/types/zone'

const meta = ref<ZoneDataMeta | null>(null)
const failed = ref(false)

onMounted(async () => {
  try {
    const response = await fetch('/data/zones-meta.json')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    meta.value = (await response.json()) as ZoneDataMeta
  } catch (error) {
    console.error('Could not load zone metadata', error)
    failed.value = true
  }
})

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'long', timeZone: 'Europe/Zurich' }).format(
    new Date(iso),
  )
</script>

<template>
  <section aria-labelledby="data-sources-title" class="text-sm text-slate-700">
    <h2 id="data-sources-title" class="font-semibold text-slate-900">Data sources</h2>
    <p v-if="meta">
      Drone restriction zones:
      <a :href="meta.sourceUrl" class="underline hover:text-slate-900">FOCA</a>, data as of
      <time :datetime="meta.dataAsOf">{{ formatDate(meta.dataAsOf) }}</time
      >, <a :href="meta.licenseUrl" class="underline hover:text-slate-900">{{ meta.license }}</a
      >.
    </p>
    <p v-else-if="failed">The date of the zone data could not be loaded.</p>
    <p>Base map: © swisstopo.</p>
  </section>
</template>
