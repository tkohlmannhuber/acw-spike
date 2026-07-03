<script setup lang="ts">
import { ref, computed } from 'vue'
const route = useRoute()
const id = route.params.id as string

const { data: tournament, pending, error, refresh } = await useFetch(`/api/tournaments/${id}`)

useHead(() => ({ title: tournament.value ? `${tournament.value.name} — ACW Spikeball` : 'Turnier' }))

const statusLabel: Record<string, string> = {
  setup: 'Einrichtung',
  draw_done: 'Auslosung fertig',
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

const formatLabel: Record<string, string> = {
  groups_then_ko: 'Gruppenphase + KO',
  round_robin_only: 'Round Robin',
  single_elim_only: 'KO-Runde',
}

const navLinks = computed(() => {
  if (!tournament.value) return []
  const t = tournament.value
  const base = `/t/${id}`
  const links = [
    { to: `${base}/players`, label: 'Spieler & Auslosung', icon: '👥', enabled: true },
  ]
  if (['group_stage', 'ko_stage', 'finished'].includes(t.status) && t.format !== 'single_elim_only') {
    links.push({ to: `${base}/groups`, label: 'Gruppenphase', icon: '📊', enabled: true })
  }
  if (['ko_stage', 'finished'].includes(t.status) || t.format === 'single_elim_only') {
    links.push({ to: `${base}/bracket`, label: 'KO-Baum', icon: '🏆', enabled: true })
  }
  if (t.status === 'finished') {
    links.push({ to: `${base}/results`, label: 'Ergebnisse', icon: '🥇', enabled: true })
  }
  links.push({ to: `${base}/live`, label: 'Live-Ansicht', icon: '📱', enabled: true })
  return links
})

const playerCount = computed(() => tournament.value?.players?.length ?? 0)
const teamCount = computed(() => tournament.value?.teams?.length ?? 0)
const matchCount = computed(() => tournament.value?.matches?.length ?? 0)
const finishedMatchCount = computed(() => tournament.value?.matches?.filter((m: any) => m.status === 'finished').length ?? 0)

const showClone = ref(false)
const cloneName = ref('')
const cloneDate = ref(new Date().toISOString().slice(0, 10))
const cloneLoading = ref(false)
const cloneError = ref('')

function openClone() {
  cloneName.value = `${tournament.value?.name ?? ''} (Neu)`
  cloneDate.value = new Date().toISOString().slice(0, 10)
  cloneError.value = ''
  showClone.value = true
}

async function submitClone() {
  if (!cloneName.value.trim()) return
  cloneLoading.value = true
  cloneError.value = ''
  try {
    const res = await $fetch<{ id: string }>(`/api/tournaments/${id}/clone`, {
      method: 'POST',
      body: { name: cloneName.value.trim(), date: cloneDate.value },
    })
    await navigateTo(`/t/${res.id}`)
  } catch (e: any) {
    cloneError.value = e?.data?.message || 'Fehler beim Duplizieren.'
  } finally {
    cloneLoading.value = false
  }
}
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 sm:px-6 py-10">
    <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm mb-6 transition-opacity hover:opacity-70" style="color: var(--color-spike-muted);">
      ← Alle Turniere
    </NuxtLink>

    <div v-if="pending" class="flex justify-center py-20">
      <NetSpinner :size="56" />
    </div>

    <div v-else-if="error" class="card p-8 text-center" style="color: var(--color-spike-accent);">
      Turnier nicht gefunden oder Fehler beim Laden.
    </div>

    <template v-else-if="tournament">
      <!-- Nav -->
      <TournamentNav
        :tournament-id="id"
        :status="tournament.status"
        :format="tournament.format"
      />

      <!-- Header -->
      <div class="mb-8">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-display text-4xl sm:text-5xl leading-tight mb-2" style="color: var(--color-spike-yellow);">
              {{ tournament.name }}
            </h1>
            <div class="flex flex-wrap items-center gap-3 text-sm" style="color: var(--color-spike-muted);">
              <span>{{ new Date(tournament.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' }) }}</span>
              <span>·</span>
              <span>{{ formatLabel[tournament.format] }}</span>
            </div>
          </div>
          <span
            class="status-pill text-sm"
            :style="statusColor[tournament.status]"
          >
            {{ statusLabel[tournament.status] }}
          </span>
        </div>
      </div>

      <!-- Clone modal -->
      <div v-if="showClone" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7);" @click.self="showClone = false">
        <div class="card p-6 w-full max-w-md">
          <h2 class="text-display text-xl mb-1" style="color: var(--color-spike-yellow);">Teams übernehmen</h2>
          <p class="text-sm mb-5" style="color: var(--color-spike-muted);">
            Erstellt ein neues Turnier mit denselben {{ (tournament as any).teams?.length }} Teams — Auslosung wird übersprungen.
          </p>
          <div class="space-y-3">
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-spike-muted);">Turniername</label>
              <input v-model="cloneName" type="text" class="w-full score-input text-base px-3 py-2" placeholder="Turniername" />
            </div>
            <div>
              <label class="block text-xs mb-1" style="color: var(--color-spike-muted);">Datum</label>
              <input v-model="cloneDate" type="date" class="w-full score-input text-base px-3 py-2" />
            </div>
          </div>
          <p v-if="cloneError" class="text-xs mt-3 px-2 py-1 rounded" style="color: var(--color-spike-accent); background: rgba(255,90,31,0.1);">{{ cloneError }}</p>
          <div class="flex gap-3 mt-5">
            <button class="btn-secondary flex-1" @click="showClone = false">Abbrechen</button>
            <button class="btn-primary flex-1 justify-center" :disabled="cloneLoading || !cloneName.trim()" @click="submitClone">
              <NetSpinner v-if="cloneLoading" :size="16" />
              {{ cloneLoading ? '...' : 'Turnier erstellen' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Stats row -->
      <div class="grid grid-cols-3 gap-3 mb-8">
        <div class="card p-4 text-center">
          <div class="text-display text-3xl" style="color: var(--color-spike-yellow);">{{ playerCount }}</div>
          <div class="text-xs mt-1" style="color: var(--color-spike-muted);">Spieler</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-display text-3xl" style="color: var(--color-spike-white);">{{ teamCount }}</div>
          <div class="text-xs mt-1" style="color: var(--color-spike-muted);">Teams</div>
        </div>
        <div class="card p-4 text-center">
          <div class="text-display text-3xl" style="color: var(--color-spike-white);">{{ finishedMatchCount }}<span class="text-lg" style="color: var(--color-spike-muted);">/{{ matchCount }}</span></div>
          <div class="text-xs mt-1" style="color: var(--color-spike-muted);">Spiele</div>
        </div>
      </div>

      <!-- Navigation cards -->
      <div class="grid sm:grid-cols-2 gap-4">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="card p-5 flex items-center gap-4 transition-all hover:border-opacity-60 group"
          style="border-color: var(--color-spike-border);"
          @mouseenter="$event.currentTarget.style.borderColor = 'rgba(255,221,0,0.4)'"
          @mouseleave="$event.currentTarget.style.borderColor = 'var(--color-spike-border)'"
        >
          <span class="text-3xl">{{ link.icon }}</span>
          <div>
            <div class="font-semibold text-base group-hover:text-yellow-400 transition-colors">{{ link.label }}</div>
          </div>
          <span class="ml-auto text-lg" style="color: var(--color-spike-muted);">→</span>
        </NuxtLink>
      </div>

      <!-- Clone action -->
      <div v-if="(tournament as any).teams?.length > 0" class="mt-4">
        <button
          class="w-full card p-4 flex items-center gap-4 transition-all text-left group"
          style="border-style: dashed;"
          @mouseenter="$event.currentTarget.style.borderColor = 'rgba(255,221,0,0.4)'"
          @mouseleave="$event.currentTarget.style.borderColor = 'var(--color-spike-border)'"
          @click="openClone"
        >
          <span class="text-2xl">🔁</span>
          <div class="flex-1">
            <div class="font-semibold text-sm group-hover:text-yellow-400 transition-colors">Neues Turnier mit gleichen Teams</div>
            <div class="text-xs mt-0.5" style="color: var(--color-spike-muted);">{{ (tournament as any).teams?.length }} Teams übernehmen, Auslosung überspringen</div>
          </div>
          <span class="text-lg" style="color: var(--color-spike-muted);">→</span>
        </button>
      </div>

      <!-- Phase progress bar -->
      <div class="mt-8 card p-5">
        <div class="text-xs font-medium mb-3 text-display" style="color: var(--color-spike-muted);">FORTSCHRITT</div>
        <div class="flex gap-1">
          <div
            v-for="(phase, i) in ['setup', 'draw_done', 'group_stage', 'ko_stage', 'finished']"
            :key="phase"
            class="flex-1 h-2 rounded-full transition-all"
            :style="['setup', 'draw_done', 'group_stage', 'ko_stage', 'finished'].indexOf(tournament.status) >= i
              ? 'background: var(--color-spike-yellow);'
              : 'background: var(--color-spike-border);'"
          />
        </div>
        <div class="flex justify-between text-xs mt-2" style="color: var(--color-spike-muted);">
          <span>Start</span>
          <span>Auslosung</span>
          <span>Gruppen</span>
          <span>KO</span>
          <span>Finale</span>
        </div>
      </div>
    </template>
  </div>
</template>
