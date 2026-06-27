<script setup lang="ts">
const route = useRoute()
</script>

<template>
  <header class="sticky top-0 z-50 border-b" style="background-color: var(--color-spike-black); border-color: var(--color-spike-border);">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <NuxtLink to="/" class="flex items-center gap-3 group">
        <NetIcon class="w-8 h-8 flex-shrink-0 transition-transform group-hover:rotate-12 duration-300" />
        <span class="text-display text-xl leading-none" style="color: var(--color-spike-yellow);">
          ACW<br class="hidden" />&nbsp;Spikeball
        </span>
      </NuxtLink>

      <nav class="flex items-center gap-2">
        <NuxtLink
          to="/"
          class="text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          :style="route.path === '/' ? 'color: var(--color-spike-yellow)' : 'color: var(--color-spike-muted)'"
        >
          Turniere
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
