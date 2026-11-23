<script setup lang="ts">
/** Who to ask for an exemption, with direct contact links. */
import { Globe, Mail, Phone } from '@lucide/vue'
import type { Authority } from '@/analysis/analyse'

defineProps<{ authorities: Authority[] }>()

const linkClass =
  'inline-flex items-center gap-1 text-sky-800 underline decoration-sky-800/40 underline-offset-2 hover:decoration-sky-800'
</script>

<template>
  <section aria-labelledby="authorities-title" class="space-y-2">
    <h3 id="authorities-title" class="text-sm font-semibold">Where to apply for an exemption</h3>
    <ul class="space-y-3">
      <li v-for="authority in authorities" :key="authority.name" class="text-sm">
        <p class="font-medium">
          {{ authority.name }}
          <span v-if="authority.service" class="font-normal text-slate-600">
            · {{ authority.service }}
          </span>
        </p>
        <p class="text-xs text-slate-600">For {{ authority.zoneNames.join(', ') }}</p>
        <p class="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          <a v-if="authority.email" :href="`mailto:${authority.email}`" :class="linkClass">
            <Mail class="size-4 shrink-0" />
            <span class="break-all">{{ authority.email }}</span>
          </a>
          <a v-if="authority.phone" :href="`tel:${authority.phone}`" :class="linkClass">
            <Phone class="size-4 shrink-0" />{{ authority.phone }}
          </a>
          <a
            v-if="authority.url"
            :href="authority.url"
            :aria-label="`Website of ${authority.name}`"
            :class="linkClass"
          >
            <Globe class="size-4 shrink-0" />Website
          </a>
        </p>
      </li>
    </ul>
  </section>
</template>
