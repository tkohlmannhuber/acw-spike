<script setup lang="ts">
import { ref, computed } from 'vue'
const route = useRoute()
const id = route.params.id as string
useHead({ title: 'KO-Baum — ACW Spikeball' })

const { data: tournament, refresh: refreshTournament } = await useFetch(`/api/tournaments/${id}`)

const koMatches = computed(() => {
  const t = tournament.value as any
  return (t?.matches ?? []).filter((m: any) => m.phase === 'ko')
})

const thirdPlaceMatch = computed(() => {
  const t = tournament.value as any
  const tp = (t?.matches ?? []).find((m: any) => m.phase === 'third_place')

  if (!tp) return null

  // Populate 3rd place match teams from semi-final losers
  const semis = koMatches.value.filter((m: any) => m.round === 2 && m.status === 'finished')
  const losers = semis
    .map((m: any) => m.winnerId === m.teamAId ? m.teamBId : m.teamAId)
    .filter(Boolean)

  return {
    ...tp,
    teamAId: tp.teamAId ?? losers[0] ?? null,
    teamBId: tp.teamBId ?? losers[1] ?? null,
  }
})

const allTeams = computed(() => (tournament.value as any)?.teams ?? [])

const finalistIds = computed(() => {
  const final = koMatches.value.find((m: any) => m.round === 1)
  return {
    winner: final?.winnerId ?? null,
    runnerUp: final?.winnerId
      ? (final.teamAId === final.winnerId ? final.teamBId : final.teamAId)
      : null,
  }
})

const isFinished = computed(() => (tournament.value as any)?.status === 'finished')
const finalDone = computed(() => koMatches.value.find((m: any) => m.round === 1)?.status === 'finished')
const thirdDone = computed(() => thirdPlaceMatch.value?.status === 'finished')

async function onScoreSaved() {
  await refreshTournament()
  // Auto-update 3rd place match teams if semis are done
  const semis = koMatches.value.filter((m: any) => m.round === 2 && m.status === 'finished')
  if (semis.length >= 2 && thirdPlaceMatch.value && (!thirdPlaceMatch.value.teamAId || !thirdPlaceMatch.value.teamBId)) {
    const losers = semis.map((m: any) => m.winnerId === m.teamAId ? m.teamBId : m.teamAId).filter(Boolean)
    if (losers.length >= 2) {
      const tp = (tournament.value as any)?.matches?.find((m: any) => m.phase === 'third_place')
      if (tp) {
        await $fetch(`/api/matches/${tp.id}`, {
          method: 'PATCH',
          body: { scoreA: 0, scoreB: 1 } // dummy — will be reset
        }).catch(() => {})
        // Actually patch with just team assignment
        await $fetch(`/api/tournaments/${id}/third-place`, {
          method: 'POST',
          body: { teamAId: losers[0], teamBId: losers[1] },
        }).catch(() => {})
        await refreshTournament()
      }
    }
  }
}

async function finishTournament() {
  await $fetch(`/api/tournaments/${id}`, {
    method: 'PATCH',
    body: { status: 'finished' },
  })
  await refreshTournament()
  await navigateTo(`/t/${id}/results`)
}
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 py-10">
    <NuxtLink :to="`/t/${id}`" class="inline-flex items-center gap-2 text-sm mb-4 hover:opacity-70 transition-opacity" style="color: var(--color-spike-muted);">
      ← Zum Turnier
    </NuxtLink>

    <TournamentNav
      v-if="tournament"
      :tournament-id="id"
      :status="(tournament as any).status"
      :format="(tournament as any).format"
    />

    <div class="flex items-start justify-between flex-wrap gap-4 mb-8">
      <h1 class="text-display text-3xl sm:text-4xl" style="color: var(--color-spike-yellow);">KO-Baum</h1>

      <button
        v-if="finalDone && thirdDone && !isFinished"
        class="btn-primary"
        @click="finishTournament"
      >
        🏆 Turnier abschließen
      </button>
      <NuxtLink v-if="isFinished" :to="`/t/${id}/results`" class="btn-primary">
        🥇 Zur Siegerehrung →
      </NuxtLink>
    </div>

    <div v-if="koMatches.length === 0" class="card p-8 text-center">
      <NetSpinner :size="48" />
      <p class="mt-4" style="color: var(--color-spike-muted);">Lade KO-Baum...</p>
    </div>

    <BracketTree
      v-else
      :matches="koMatches"
      :teams="allTeams"
      :third-place-match="thirdPlaceMatch"
      @score-saved="onScoreSaved"
    />
  </div>
</template>
