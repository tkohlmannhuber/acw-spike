<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
useHead({ title: 'Gruppenphase — ACW Spikeball' })

const { data: tournament, refresh: refreshTournament } = await useFetch(`/api/tournaments/${id}`)
const { data: standings, refresh: refreshStandings } = await useFetch(`/api/tournaments/${id}/standings`)

const initLoading = ref(false)
const error = ref('')

const needsInit = computed(() => {
  const t = tournament.value as any
  return t?.status === 'draw_done'
})

const allGroupMatchesFinished = computed(() => {
  const s = standings.value as any[]
  if (!s?.length) return false
  return s.every((p: any) => p.matches.every((m: any) => m.status === 'finished'))
})

const hasMatches = computed(() => {
  const s = standings.value as any[]
  return s?.some((p: any) => p.matches.length > 0) ?? false
})

async function initGroups() {
  initLoading.value = true
  error.value = ''
  try {
    await $fetch(`/api/tournaments/${id}/pools`, { method: 'POST' })
    await Promise.all([refreshTournament(), refreshStandings()])
  } catch (e: any) {
    error.value = e?.data?.message || 'Fehler beim Starten der Gruppenphase.'
  } finally {
    initLoading.value = false
  }
}

async function onScoreSaved() {
  await refreshStandings()
}

async function startKO() {
  try {
    await $fetch(`/api/tournaments/${id}/start-ko`, { method: 'POST' })
    await refreshTournament()
    await navigateTo(`/t/${id}/bracket`)
  } catch (e: any) {
    error.value = e?.data?.message || 'Fehler beim Starten der KO-Phase.'
  }
}

const qualifiersPerPool = computed(() => (tournament.value as any)?.qualifiersPerPool ?? 2)
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-10">
    <NuxtLink :to="`/t/${id}`" class="inline-flex items-center gap-2 text-sm mb-8 hover:opacity-70 transition-opacity" style="color: var(--color-spike-muted);">
      ← Zum Turnier
    </NuxtLink>

    <div class="flex items-start justify-between flex-wrap gap-4 mb-8">
      <h1 class="text-display text-3xl sm:text-4xl" style="color: var(--color-spike-yellow);">Gruppenphase</h1>

      <div class="flex gap-3 flex-wrap">
        <button
          v-if="allGroupMatchesFinished && hasMatches"
          class="btn-primary"
          @click="startKO"
        >
          KO-Phase starten →
        </button>
      </div>
    </div>

    <!-- Init prompt -->
    <div v-if="needsInit" class="card p-8 text-center">
      <NetIcon class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <h2 class="text-display text-2xl mb-2">Gruppenphase starten</h2>
      <p class="text-sm mb-6" style="color: var(--color-spike-muted);">
        Teams werden zufällig auf Pools verteilt und Round-Robin-Paarungen generiert.
      </p>
      <p v-if="error" class="text-sm mb-4 px-3 py-2 rounded-lg" style="background: rgba(255,90,31,0.1); color: var(--color-spike-accent);">{{ error }}</p>
      <button class="btn-primary text-lg px-8 py-4" :disabled="initLoading" @click="initGroups">
        <NetSpinner v-if="initLoading" :size="20" />
        🎯 Pools generieren
      </button>
    </div>

    <!-- Pools & Standings -->
    <div v-else-if="standings && standings.length" class="space-y-10">
      <div v-for="poolData in (standings as any[])" :key="poolData.pool.id">
        <!-- Pool header -->
        <div class="flex items-center gap-3 mb-5">
          <div class="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-display shrink-0"
            style="background: var(--color-spike-yellow); color: var(--color-spike-black);">
            {{ poolData.pool.name.split(' ')[1] }}
          </div>
          <h2 class="text-display text-2xl">{{ poolData.pool.name }}</h2>
          <span class="text-sm ml-2" style="color: var(--color-spike-muted);">
            {{ poolData.standings.filter((s: any) => s.played > 0).length }}/{{ poolData.standings.length }} Teams haben gespielt
          </span>
        </div>

        <div class="grid lg:grid-cols-2 gap-8">
          <!-- Tabelle -->
          <div class="card p-5">
            <h3 class="text-display text-sm mb-4" style="color: var(--color-spike-muted);">TABELLE</h3>
            <PoolTable :standings="poolData.standings" :qualifiers="qualifiersPerPool" />
          </div>

          <!-- Spiele -->
          <div class="space-y-3">
            <h3 class="text-display text-sm mb-4" style="color: var(--color-spike-muted);">SPIELE</h3>
            <ScoreInput
              v-for="match in poolData.matches"
              :key="match.id"
              :match-id="match.id"
              :team-a-name="match.teamA?.name ?? '?'"
              :team-b-name="match.teamB?.name ?? '?'"
              :initial-score-a="match.scoreA"
              :initial-score-b="match.scoreB"
              :finished="match.status === 'finished'"
              @saved="onScoreSaved"
            />
          </div>
        </div>

        <div class="h-px mt-8" style="background: var(--color-spike-border);" />
      </div>

      <!-- Start KO hint -->
      <div v-if="allGroupMatchesFinished" class="card p-6 text-center" style="border-color: rgba(255,221,0,0.3);">
        <p class="text-display text-xl mb-1" style="color: var(--color-spike-yellow);">Gruppenphase abgeschlossen!</p>
        <p class="text-sm mb-5" style="color: var(--color-spike-muted);">Alle Spiele sind eingetragen. Starte jetzt die KO-Phase.</p>
        <button class="btn-primary text-lg px-8 py-4" @click="startKO">KO-Phase starten →</button>
      </div>
      <p v-if="error" class="text-sm px-3 py-2 rounded-lg" style="background: rgba(255,90,31,0.1); color: var(--color-spike-accent);">{{ error }}</p>
    </div>

    <div v-else class="flex justify-center py-20">
      <NetSpinner :size="52" />
    </div>
  </div>
</template>
