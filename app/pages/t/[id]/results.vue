<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string
useHead({ title: 'Siegerehrung — ACW Spikeball' })

const { data: tournament } = await useFetch(`/api/tournaments/${id}`)

const teams = computed(() => (tournament.value as any)?.teams ?? [])
const matches = computed(() => (tournament.value as any)?.matches ?? [])

function teamName(teamId: string | null) {
  return teams.value.find((t: any) => t.id === teamId)?.name ?? '?'
}

const finalMatch = computed(() => matches.value.find((m: any) => m.phase === 'ko' && m.round === 1))
const thirdMatch = computed(() => matches.value.find((m: any) => m.phase === 'third_place'))

const gold = computed(() => finalMatch.value?.winnerId ?? null)
const silver = computed(() => {
  const f = finalMatch.value
  if (!f?.winnerId) return null
  return f.teamAId === f.winnerId ? f.teamBId : f.teamAId
})
const bronze = computed(() => thirdMatch.value?.winnerId ?? null)
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <NuxtLink :to="`/t/${id}`" class="inline-flex items-center gap-2 text-sm mb-4 hover:opacity-70 transition-opacity" style="color: var(--color-spike-muted);">
      ← Zum Turnier
    </NuxtLink>

    <TournamentNav
      v-if="tournament"
      :tournament-id="id"
      :status="(tournament.value as any)?.status ?? 'finished'"
      :format="(tournament.value as any)?.format ?? 'groups_then_ko'"
    />

    <div class="text-center mb-12">
      <div class="flex justify-center mb-4">
        <NetIcon class="w-16 h-16" />
      </div>
      <h1 class="text-display text-4xl sm:text-6xl mb-2" style="color: var(--color-spike-yellow);">Siegerehrung</h1>
      <p class="text-lg" style="color: var(--color-spike-muted);">{{ (tournament.value as any)?.name }}</p>
    </div>

    <!-- Podium -->
    <div class="grid grid-cols-3 gap-4 items-end mb-12">
      <!-- 2nd place -->
      <div class="card p-4 text-center" style="padding-top: 2rem;">
        <div class="text-5xl mb-2">🥈</div>
        <div class="text-display text-2xl mb-1" style="color: var(--color-spike-white);">2</div>
        <div class="font-semibold text-sm leading-tight">{{ silver ? teamName(silver) : '—' }}</div>
      </div>

      <!-- 1st place (taller) -->
      <div class="card p-4 text-center relative overflow-hidden" style="border-color: var(--color-spike-yellow); padding-top: 3rem;">
        <div class="absolute inset-0 net-bg opacity-30" />
        <div class="relative z-10">
          <div class="text-6xl mb-2">🥇</div>
          <div class="text-display text-4xl mb-1" style="color: var(--color-spike-yellow);">1</div>
          <div class="font-bold text-base leading-tight" style="color: var(--color-spike-yellow);">{{ gold ? teamName(gold) : '—' }}</div>
        </div>
      </div>

      <!-- 3rd place -->
      <div class="card p-4 text-center" style="padding-top: 1.5rem;">
        <div class="text-4xl mb-2">🥉</div>
        <div class="text-display text-xl mb-1" style="color: var(--color-spike-white);">3</div>
        <div class="font-semibold text-sm leading-tight">{{ bronze ? teamName(bronze) : '—' }}</div>
      </div>
    </div>

    <!-- All matches summary -->
    <div class="card p-6">
      <h2 class="text-display text-xl mb-5" style="color: var(--color-spike-muted);">Alle Ergebnisse</h2>

      <div class="space-y-2">
        <div
          v-for="m in matches.filter((m: any) => m.status === 'finished')"
          :key="m.id"
          class="flex items-center justify-between gap-4 py-2 border-b text-sm"
          style="border-color: var(--color-spike-border);"
        >
          <span class="flex-1 truncate" :style="m.winnerId === m.teamAId ? 'font-bold' : 'color: var(--color-spike-muted)'">
            {{ teamName(m.teamAId) }}
          </span>
          <span class="text-display text-base shrink-0" style="color: var(--color-spike-yellow);">
            {{ m.scoreA }} : {{ m.scoreB }}
          </span>
          <span class="flex-1 truncate text-right" :style="m.winnerId === m.teamBId ? 'font-bold' : 'color: var(--color-spike-muted)'">
            {{ teamName(m.teamBId) }}
          </span>
        </div>
      </div>
    </div>

    <!-- Share live view -->
    <div class="mt-8 text-center">
      <p class="text-sm mb-3" style="color: var(--color-spike-muted);">Live-Ansicht teilen:</p>
      <NuxtLink
        :to="`/t/${id}/live`"
        class="btn-secondary"
        target="_blank"
      >
        📱 Live-Seite öffnen
      </NuxtLink>
    </div>
  </div>
</template>
