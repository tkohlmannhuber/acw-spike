<script setup lang="ts">
useHead({ title: 'ACW Spikeball — Turniere' })
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-12">
    <!-- Hero -->
    <div class="relative net-bg rounded-3xl overflow-hidden mb-12 px-8 py-16 text-center border" style="border-color: var(--color-spike-border);">
      <div class="relative z-10">
        <div class="flex justify-center mb-6">
          <NetIcon class="w-20 h-20" />
        </div>
        <h1 class="text-display text-5xl sm:text-7xl mb-4" style="color: var(--color-spike-yellow);">
          ACW Spikeball
        </h1>
        <p class="text-lg mb-8" style="color: var(--color-spike-muted);">
          Turnier-Manager für Roundnet
        </p>
        <NuxtLink to="/tournament/new" class="btn-primary text-lg px-8 py-4">
          + Neues Turnier
        </NuxtLink>
      </div>
    </div>

    <!-- Tournament list will be populated in M3 -->
    <div class="text-center py-16" style="color: var(--color-spike-muted);">
      <NetSpinner :size="48" />
      <p class="mt-4 text-display text-sm">Wird in Milestone 3 befüllt</p>
    </div>
  </div>
</template>
