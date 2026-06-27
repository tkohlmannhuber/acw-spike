<script setup lang="ts">
const props = defineProps<{
  matches: Array<{
    id: string
    round: number | null
    bracketPosition: number | null
    phase: string
    teamAId: string | null
    teamBId: string | null
    scoreA: number | null
    scoreB: number | null
    winnerId: string | null
    status: string
    nextMatchId: string | null
  }>
  teams: Array<{ id: string; name: string }>
  thirdPlaceMatch?: {
    id: string
    teamAId: string | null
    teamBId: string | null
    scoreA: number | null
    scoreB: number | null
    winnerId: string | null
    status: string
  } | null
}>()

const emit = defineEmits<{ 'score-saved': [] }>()

const teamMap = computed(() => new Map(props.teams.map(t => [t.id, t])))

const koMatches = computed(() =>
  props.matches
    .filter(m => m.phase === 'ko' && m.round != null)
    .sort((a, b) => (a.round! - b.round!) || (a.bracketPosition! - b.bracketPosition!))
)

// Group by round descending (final is round 1)
const rounds = computed(() => {
  const rMap = new Map<number, typeof koMatches.value>()
  for (const m of koMatches.value) {
    if (!rMap.has(m.round!)) rMap.set(m.round!, [])
    rMap.get(m.round!)!.push(m)
  }
  // Sort rounds: highest round first (early rounds), then final (round 1)
  return [...rMap.entries()].sort((a, b) => b[0] - a[0])
})

const roundLabel: Record<number, string> = { 1: 'Finale', 2: 'Halbfinale', 4: 'Viertelfinale', 8: 'Achtelfinale' }
function getRoundLabel(round: number) {
  return roundLabel[round] ?? `Runde ${round}`
}

const scoringMatch = ref<string | null>(null)
const scoreAInput = ref('')
const scoreBInput = ref('')
const saving = ref(false)
const saveError = ref('')

function openScore(matchId: string) {
  scoringMatch.value = matchId
  scoreAInput.value = ''
  scoreBInput.value = ''
  saveError.value = ''
}

async function saveScore(matchId: string) {
  const a = parseInt(scoreAInput.value)
  const b = parseInt(scoreBInput.value)
  if (isNaN(a) || isNaN(b)) { saveError.value = 'Bitte beide Scores eingeben.'; return }
  if (a === b) { saveError.value = 'Kein Unentschieden erlaubt.'; return }
  saveError.value = ''
  saving.value = true
  try {
    await $fetch(`/api/matches/${matchId}`, {
      method: 'PATCH',
      body: { scoreA: a, scoreB: b },
    })
    scoringMatch.value = null
    emit('score-saved')
  } catch (e: any) {
    saveError.value = e?.data?.message || 'Fehler.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <!-- KO Bracket (scrollable horizontally) -->
    <div class="overflow-x-auto pb-4">
      <div class="flex gap-6 items-start min-w-max">
        <div v-for="[round, roundMatches] in rounds" :key="round" class="flex flex-col gap-4">
          <!-- Round header -->
          <div class="text-display text-xs mb-2 text-center px-4" style="color: var(--color-spike-muted);">
            {{ getRoundLabel(round) }}
          </div>

          <!-- Matches in this round -->
          <div
            class="flex flex-col justify-around h-full gap-6"
            :style="`gap: ${Math.max(1, round - 1) * 1.5}rem;`"
          >
            <div
              v-for="match in roundMatches"
              :key="match.id"
              class="w-52 relative"
            >
              <!-- Match card -->
              <div
                class="card overflow-hidden cursor-pointer transition-all"
                :style="match.status === 'finished'
                  ? 'border-color: rgba(255,221,0,0.3);'
                  : scoringMatch === match.id
                  ? 'border-color: var(--color-spike-yellow);'
                  : ''"
                @click="match.status !== 'finished' && match.teamAId && match.teamBId ? openScore(match.id) : null"
              >
                <!-- Team A -->
                <div
                  class="flex items-center justify-between px-3 py-2 text-sm border-b transition-colors"
                  :style="match.winnerId === match.teamAId
                    ? 'background: rgba(255,221,0,0.12); border-color: var(--color-spike-border);'
                    : 'border-color: var(--color-spike-border);'"
                >
                  <span class="font-medium truncate" :style="match.winnerId && match.winnerId !== match.teamAId ? 'color: var(--color-spike-muted); opacity: 0.6' : ''">
                    {{ match.teamAId ? teamMap.get(match.teamAId)?.name ?? '?' : match.status === 'finished' ? 'Freilos' : '—' }}
                  </span>
                  <span v-if="match.status === 'finished'" class="text-display text-base ml-2 shrink-0"
                    :style="match.winnerId === match.teamAId ? 'color: var(--color-spike-yellow)' : 'color: var(--color-spike-muted)'">
                    {{ match.scoreA }}
                  </span>
                </div>

                <!-- Team B -->
                <div
                  class="flex items-center justify-between px-3 py-2 text-sm transition-colors"
                  :style="match.winnerId === match.teamBId ? 'background: rgba(255,221,0,0.12);' : ''"
                >
                  <span class="font-medium truncate" :style="match.winnerId && match.winnerId !== match.teamBId ? 'color: var(--color-spike-muted); opacity: 0.6' : ''">
                    {{ match.teamBId ? teamMap.get(match.teamBId)?.name ?? '?' : '—' }}
                  </span>
                  <span v-if="match.status === 'finished'" class="text-display text-base ml-2 shrink-0"
                    :style="match.winnerId === match.teamBId ? 'color: var(--color-spike-yellow)' : 'color: var(--color-spike-muted)'">
                    {{ match.scoreB }}
                  </span>
                </div>

                <!-- Pending hint -->
                <div v-if="match.status === 'pending' && match.teamAId && match.teamBId"
                  class="px-3 py-1.5 text-xs text-center"
                  style="color: var(--color-spike-muted); background: var(--color-spike-surface-2);">
                  Tippen zum Eintragen
                </div>
                <div v-else-if="match.status === 'pending' && (!match.teamAId || !match.teamBId)"
                  class="px-3 py-1.5 text-xs text-center"
                  style="color: var(--color-spike-muted); background: var(--color-spike-surface-2);">
                  Wartet auf Sieger
                </div>
              </div>

              <!-- Inline score entry -->
              <Transition name="fade">
                <div v-if="scoringMatch === match.id" class="mt-2 card p-3 z-10 relative">
                  <div class="flex items-center gap-2 mb-2">
                    <input
                      v-model="scoreAInput"
                      type="number"
                      min="0"
                      inputmode="numeric"
                      placeholder="0"
                      class="score-input"
                      style="width: 4rem; font-size: 1.5rem;"
                    />
                    <span style="color: var(--color-spike-muted);">:</span>
                    <input
                      v-model="scoreBInput"
                      type="number"
                      min="0"
                      inputmode="numeric"
                      placeholder="0"
                      class="score-input"
                      style="width: 4rem; font-size: 1.5rem;"
                    />
                  </div>
                  <p v-if="saveError" class="text-xs mb-2" style="color: var(--color-spike-accent);">{{ saveError }}</p>
                  <div class="flex gap-2">
                    <button class="btn-secondary text-xs px-2 py-1.5 flex-1" @click.stop="scoringMatch = null">Abbrechen</button>
                    <button class="btn-primary text-xs px-2 py-1.5 flex-1" :disabled="saving" @click.stop="saveScore(match.id)">
                      {{ saving ? '...' : '✓ Speichern' }}
                    </button>
                  </div>
                </div>
              </Transition>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 3rd place match -->
    <div v-if="thirdPlaceMatch" class="mt-10">
      <h3 class="text-display text-lg mb-4" style="color: var(--color-spike-muted);">Spiel um Platz 3</h3>
      <div class="max-w-xs">
        <ScoreInput
          :match-id="thirdPlaceMatch.id"
          :team-a-name="thirdPlaceMatch.teamAId ? (teamMap.get(thirdPlaceMatch.teamAId)?.name ?? '?') : 'Wartend'"
          :team-b-name="thirdPlaceMatch.teamBId ? (teamMap.get(thirdPlaceMatch.teamBId)?.name ?? '?') : 'Wartend'"
          :initial-score-a="thirdPlaceMatch.scoreA"
          :initial-score-b="thirdPlaceMatch.scoreB"
          :finished="thirdPlaceMatch.status === 'finished'"
          @saved="$emit('score-saved')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: all 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
