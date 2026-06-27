<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
useHead({ title: 'Live — ACW Spikeball' })

// Poll every 15s for live updates
const { data: tournament, refresh } = await useFetch(`/api/tournaments/${id}`)
const { data: standingsData, refresh: refreshStandings } = await useFetch(`/api/tournaments/${id}/standings`)

let pollInterval: ReturnType<typeof setInterval> | null = null
onMounted(() => {
  pollInterval = setInterval(() => {
    refresh()
    refreshStandings()
  }, 15000)
})
onUnmounted(() => { if (pollInterval) clearInterval(pollInterval) })

const teams = computed(() => (tournament.value as any)?.teams ?? [])
const matches = computed(() => (tournament.value as any)?.matches ?? [])
const status = computed(() => (tournament.value as any)?.status ?? 'setup')
const tournamentFormat = computed(() => (tournament.value as any)?.format ?? 'groups_then_ko')

function teamName(id: string | null) {
  return teams.value.find((t: any) => t.id === id)?.name ?? '?'
}

const koMatches = computed(() => matches.value.filter((m: any) => m.phase === 'ko'))
const liveMatches = computed(() => matches.value.filter((m: any) => m.status === 'live'))
const recentFinished = computed(() =>
  matches.value
    .filter((m: any) => m.status === 'finished' && m.scoreA != null)
    .slice(-5)
    .reverse()
)

const finalist = computed(() => {
  const f = koMatches.value.find((m: any) => m.round === 1)
  if (f?.winnerId) return teamName(f.winnerId)
  return null
})

const qualifiersPerPool = computed(() => (tournament.value as any)?.qualifiersPerPool ?? 2)
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 sm:px-6 py-10">
    <!-- Header -->
    <div class="text-center mb-10">
      <NetIcon class="w-12 h-12 mx-auto mb-3" />
      <h1 class="text-display text-4xl sm:text-5xl" style="color: var(--color-spike-yellow);">
        {{ (tournament.value as any)?.name ?? 'Turnier' }}
      </h1>
      <div class="flex items-center justify-center gap-2 mt-3">
        <span class="badge-live">LIVE</span>
        <span class="text-sm" style="color: var(--color-spike-muted);">Aktualisiert alle 15s</span>
      </div>
    </div>

    <!-- Finished: show podium -->
    <div v-if="status === 'finished' && finalist" class="card p-8 text-center mb-8" style="border-color: var(--color-spike-yellow);">
      <div class="text-5xl mb-2">🏆</div>
      <h2 class="text-display text-3xl" style="color: var(--color-spike-yellow);">{{ finalist }}</h2>
      <p class="text-sm mt-1" style="color: var(--color-spike-muted);">Turniersieger</p>
    </div>

    <!-- Live matches -->
    <div v-if="liveMatches.length > 0" class="mb-8">
      <h2 class="text-display text-sm mb-4" style="color: var(--color-spike-accent);">● LIVE JETZT</h2>
      <div class="grid sm:grid-cols-2 gap-3">
        <div v-for="m in liveMatches" :key="m.id" class="card p-4" style="border-color: var(--color-spike-accent);">
          <div class="flex items-center justify-between text-sm">
            <span class="font-semibold">{{ teamName(m.teamAId) }}</span>
            <span class="text-display text-xl" style="color: var(--color-spike-accent);">vs</span>
            <span class="font-semibold">{{ teamName(m.teamBId) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Group standings (if in group stage) -->
    <div v-if="['group_stage'].includes(status) && standingsData" class="mb-10">
      <h2 class="text-display text-xl mb-6" style="color: var(--color-spike-white);">Gruppenphase</h2>
      <div class="grid md:grid-cols-2 gap-8">
        <div v-for="poolData in (standingsData as any[])" :key="poolData.pool.id">
          <div class="flex items-center gap-2 mb-3">
            <div class="w-7 h-7 rounded-full flex items-center justify-center text-xs text-display font-bold"
              style="background: var(--color-spike-yellow); color: var(--color-spike-black);">
              {{ poolData.pool.name.split(' ')[1] }}
            </div>
            <h3 class="text-display text-lg">{{ poolData.pool.name }}</h3>
          </div>
          <div class="card p-4">
            <PoolTable :standings="poolData.standings" :qualifiers="qualifiersPerPool" />
          </div>
        </div>
      </div>
    </div>

    <!-- KO bracket (if in ko stage) -->
    <div v-if="['ko_stage', 'finished'].includes(status) && koMatches.length > 0" class="mb-10">
      <h2 class="text-display text-xl mb-6" style="color: var(--color-spike-white);">KO-Baum</h2>
      <BracketTree
        :matches="koMatches"
        :teams="teams"
        :third-place-match="null"
        @score-saved="refresh"
      />
    </div>

    <!-- Recent results -->
    <div v-if="recentFinished.length > 0">
      <h2 class="text-display text-sm mb-4" style="color: var(--color-spike-muted);">LETZTE ERGEBNISSE</h2>
      <div class="space-y-2">
        <div
          v-for="m in recentFinished"
          :key="m.id"
          class="flex items-center justify-between gap-4 card px-4 py-3 text-sm"
        >
          <span class="flex-1 truncate font-medium" :style="m.winnerId === m.teamAId ? 'color: var(--color-spike-yellow)' : 'color: var(--color-spike-muted)'">
            {{ teamName(m.teamAId) }}
          </span>
          <span class="text-display text-lg shrink-0">{{ m.scoreA }}:{{ m.scoreB }}</span>
          <span class="flex-1 truncate font-medium text-right" :style="m.winnerId === m.teamBId ? 'color: var(--color-spike-yellow)' : 'color: var(--color-spike-muted)'">
            {{ teamName(m.teamBId) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>
