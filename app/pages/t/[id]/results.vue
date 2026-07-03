<script setup lang="ts">
import { ref, computed } from 'vue'
const route = useRoute()
const id = route.params.id as string
useHead({ title: 'Ergebnisse — ACW Spikeball' })

const { data: tournament } = await useFetch(`/api/tournaments/${id}`)
const { data: standings } = await useFetch(`/api/tournaments/${id}/standings`)

const isRoundRobin = computed(() => (tournament.value as any)?.format === 'round_robin_only')
const teams = computed(() => (tournament.value as any)?.teams ?? [])
const matches = computed(() => (tournament.value as any)?.matches ?? [])

function teamName(teamId: string | null) {
  return teams.value.find((t: any) => t.id === teamId)?.name ?? '?'
}

// KO podium (groups_then_ko / single_elim_only)
const finalMatch = computed(() => matches.value.find((m: any) => m.phase === 'ko' && m.round === 1))
const thirdMatch = computed(() => matches.value.find((m: any) => m.phase === 'third_place'))
const gold = computed(() => finalMatch.value?.winnerId ?? null)
const silver = computed(() => {
  const f = finalMatch.value
  if (!f?.winnerId) return null
  return f.teamAId === f.winnerId ? f.teamBId : f.teamAId
})
const bronze = computed(() => thirdMatch.value?.winnerId ?? null)

// Round robin: flat sorted standings from the single pool
const rrStandings = computed(() => {
  const pools = standings.value as any[]
  if (!pools?.length) return []
  return pools[0]?.standings ?? []
})
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-12">
    <NuxtLink :to="`/t/${id}`" class="inline-flex items-center gap-2 text-sm mb-4 hover:opacity-70 transition-opacity" style="color: var(--color-spike-muted);">
      ← Zum Turnier
    </NuxtLink>

    <TournamentNav
      v-if="tournament"
      :tournament-id="id"
      :status="(tournament as any)?.status ?? 'finished'"
      :format="(tournament as any)?.format ?? 'groups_then_ko'"
    />

    <div class="text-center mb-12">
      <div class="flex justify-center mb-4">
        <NetIcon class="w-16 h-16" />
      </div>
      <h1 class="text-display text-4xl sm:text-6xl mb-2" style="color: var(--color-spike-yellow);">
        {{ isRoundRobin ? 'Endstand' : 'Siegerehrung' }}
      </h1>
      <p class="text-lg" style="color: var(--color-spike-muted);">{{ (tournament as any)?.name }}</p>
    </div>

    <!-- Round Robin: ranked table -->
    <div v-if="isRoundRobin" class="card p-6 mb-8">
      <div class="space-y-3">
        <div
          v-for="(s, i) in rrStandings"
          :key="s.team?.id"
          class="flex items-center gap-4 p-3 rounded-xl"
          :style="i === 0 ? 'background: rgba(255,221,0,0.1); border: 1px solid rgba(255,221,0,0.3);'
                : i === 1 ? 'background: rgba(192,192,192,0.08);'
                : i === 2 ? 'background: rgba(205,127,50,0.08);'
                : 'background: var(--color-spike-surface-2);'"
        >
          <div class="text-2xl w-8 text-center shrink-0">
            {{ i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.` }}
          </div>
          <div class="flex-1 font-semibold" :style="i === 0 ? 'color: var(--color-spike-yellow);' : ''">
            {{ s.team?.name ?? '?' }}
          </div>
          <div class="text-sm tabular-nums shrink-0 text-right" style="color: var(--color-spike-muted);">
            <span class="font-bold" :style="i === 0 ? 'color: var(--color-spike-yellow);' : 'color: var(--color-spike-white);'">{{ s.wins }}W</span>
            <span class="mx-1">·</span>
            <span>{{ s.losses }}L</span>
            <span class="mx-1">·</span>
            <span :style="s.pointDiff > 0 ? 'color: #4ade80;' : s.pointDiff < 0 ? 'color: var(--color-spike-accent);' : ''">
              {{ s.pointDiff > 0 ? '+' : '' }}{{ s.pointDiff }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- KO Podium -->
    <div v-else class="grid grid-cols-3 gap-4 items-end mb-12">
      <div class="card p-4 text-center" style="padding-top: 2rem;">
        <div class="text-5xl mb-2">🥈</div>
        <div class="text-display text-2xl mb-1" style="color: var(--color-spike-white);">2</div>
        <div class="font-semibold text-sm leading-tight">{{ silver ? teamName(silver) : '—' }}</div>
      </div>
      <div class="card p-4 text-center relative overflow-hidden" style="border-color: var(--color-spike-yellow); padding-top: 3rem;">
        <div class="absolute inset-0 net-bg opacity-30" />
        <div class="relative z-10">
          <div class="text-6xl mb-2">🥇</div>
          <div class="text-display text-4xl mb-1" style="color: var(--color-spike-yellow);">1</div>
          <div class="font-bold text-base leading-tight" style="color: var(--color-spike-yellow);">{{ gold ? teamName(gold) : '—' }}</div>
        </div>
      </div>
      <div class="card p-4 text-center" style="padding-top: 1.5rem;">
        <div class="text-4xl mb-2">🥉</div>
        <div class="text-display text-xl mb-1" style="color: var(--color-spike-white);">3</div>
        <div class="font-semibold text-sm leading-tight">{{ bronze ? teamName(bronze) : '—' }}</div>
      </div>
    </div>

    <!-- All matches -->
    <div class="card p-6">
      <h2 class="text-display text-xl mb-5" style="color: var(--color-spike-muted);">Alle Spiele</h2>
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

    <div class="mt-8 text-center">
      <NuxtLink :to="`/t/${id}/live`" class="btn-secondary" target="_blank">
        📱 Live-Seite öffnen
      </NuxtLink>
    </div>
  </div>
</template>
