<script setup lang="ts">
useHead({ title: 'ACW Spikeball — Turniere' })

const { data: tournaments, pending, refresh } = await useFetch('/api/tournaments')

const statusLabel: Record<string, string> = {
  setup: 'Einrichtung',
  draw_done: 'Auslosung',
  group_stage: 'Gruppenphase',
  ko_stage: 'KO-Phase',
  finished: 'Abgeschlossen',
}

const statusColor: Record<string, string> = {
  setup: 'color: var(--color-spike-muted); background: rgba(107,114,128,0.15);',
  draw_done: 'color: #60a5fa; background: rgba(96,165,250,0.15);',
  group_stage: 'color: var(--color-spike-accent); background: rgba(255,90,31,0.15);',
  ko_stage: 'color: var(--color-spike-yellow); background: rgba(255,221,0,0.15);',
  finished: 'color: #4ade80; background: rgba(74,222,128,0.15);',
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-12">
    <!-- Hero -->
    <div class="relative net-bg rounded-3xl overflow-hidden mb-12 px-8 py-14 text-center border" style="border-color: var(--color-spike-border);">
      <div class="relative z-10">
        <div class="flex justify-center mb-5">
          <NetIcon class="w-16 h-16" />
        </div>
        <h1 class="text-display text-5xl sm:text-7xl mb-3" style="color: var(--color-spike-yellow);">
          ACW Spikeball
        </h1>
        <p class="text-base sm:text-lg mb-8" style="color: var(--color-spike-muted);">
          Dein Turnier-Manager für Roundnet
        </p>
        <NuxtLink to="/tournament/new" class="btn-primary text-lg px-8 py-4">
          + Neues Turnier
        </NuxtLink>
      </div>
    </div>

    <!-- Tournament list -->
    <div v-if="pending" class="flex justify-center py-16">
      <NetSpinner :size="52" />
    </div>

    <template v-else>
      <div v-if="(tournaments ?? []).length === 0" class="text-center py-20">
        <NetIcon class="w-16 h-16 mx-auto mb-4 opacity-20" />
        <p class="text-display text-2xl mb-2" style="color: var(--color-spike-muted);">Noch keine Turniere</p>
        <p class="text-sm mb-8" style="color: var(--color-spike-muted);">Starte mit deinem ersten Turnier!</p>
        <NuxtLink to="/tournament/new" class="btn-primary">+ Neues Turnier</NuxtLink>
      </div>

      <div v-else>
        <h2 class="text-display text-xl mb-6" style="color: var(--color-spike-muted);">Turniere</h2>
        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <NuxtLink
            v-for="t in tournaments"
            :key="t.id"
            :to="`/t/${t.id}`"
            class="card p-5 transition-all group block"
            @mouseenter="$event.currentTarget.style.borderColor = 'rgba(255,221,0,0.35)'"
            @mouseleave="$event.currentTarget.style.borderColor = 'var(--color-spike-border)'"
          >
            <div class="flex items-start justify-between gap-2 mb-3">
              <h3 class="font-display font-bold text-base leading-tight group-hover:text-yellow-400 transition-colors" style="font-family: var(--font-display);">
                {{ t.name }}
              </h3>
              <span class="status-pill text-xs shrink-0" :style="statusColor[t.status]">
                {{ statusLabel[t.status] }}
              </span>
            </div>
            <p class="text-sm" style="color: var(--color-spike-muted);">
              {{ new Date(t.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) }}
            </p>
          </NuxtLink>
        </div>
      </div>
    </template>
  </div>
</template>
