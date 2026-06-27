<script setup lang="ts">
const props = defineProps<{
  matchId: string
  teamAName: string
  teamBName: string
  initialScoreA?: number | null
  initialScoreB?: number | null
  finished?: boolean
}>()

const emit = defineEmits<{ saved: [matchId: string] }>()

const scoreA = ref<string>(props.initialScoreA != null ? String(props.initialScoreA) : '')
const scoreB = ref<string>(props.initialScoreB != null ? String(props.initialScoreB) : '')
const saving = ref(false)
const error = ref('')
const editing = ref(!props.finished)

async function save() {
  const a = parseInt(scoreA.value)
  const b = parseInt(scoreB.value)
  if (isNaN(a) || isNaN(b)) { error.value = 'Bitte beide Scores eingeben.'; return }
  if (a === b) { error.value = 'Unentschieden nicht erlaubt.'; return }
  error.value = ''
  saving.value = true
  try {
    await $fetch(`/api/matches/${props.matchId}`, {
      method: 'PATCH',
      body: { scoreA: a, scoreB: b },
    })
    editing.value = false
    emit('saved', props.matchId)
  } catch (e: any) {
    error.value = e?.data?.message || 'Fehler beim Speichern.'
  } finally {
    saving.value = false
  }
}

async function reset() {
  await $fetch(`/api/matches/${props.matchId}`, { method: 'DELETE' })
  scoreA.value = ''
  scoreB.value = ''
  editing.value = true
  emit('saved', props.matchId)
}

function increment(which: 'a' | 'b') {
  const ref = which === 'a' ? scoreA : scoreB
  ref.value = String((parseInt(ref.value) || 0) + 1)
}
function decrement(which: 'a' | 'b') {
  const ref = which === 'a' ? scoreA : scoreB
  const v = parseInt(ref.value) || 0
  if (v > 0) ref.value = String(v - 1)
}
</script>

<template>
  <div class="card p-4 sm:p-5">
    <!-- Match result (finished, not editing) -->
    <div v-if="finished && !editing" class="flex items-center gap-4">
      <div class="flex-1 text-sm font-medium truncate">{{ teamAName }}</div>
      <div class="flex items-center gap-3">
        <span class="text-display text-2xl" :style="Number(initialScoreA) > Number(initialScoreB) ? 'color: var(--color-spike-yellow)' : 'color: var(--color-spike-muted)'">
          {{ initialScoreA }}
        </span>
        <span style="color: var(--color-spike-muted);">:</span>
        <span class="text-display text-2xl" :style="Number(initialScoreB) > Number(initialScoreA) ? 'color: var(--color-spike-yellow)' : 'color: var(--color-spike-muted)'">
          {{ initialScoreB }}
        </span>
      </div>
      <div class="flex-1 text-sm font-medium truncate text-right">{{ teamBName }}</div>
      <button class="ml-2 text-xs opacity-40 hover:opacity-80" @click="editing = true" title="Korrigieren">✏️</button>
    </div>

    <!-- Score entry -->
    <template v-else>
      <div class="flex items-center gap-2 sm:gap-4">
        <!-- Team A -->
        <div class="flex-1 text-sm font-medium truncate">{{ teamAName }}</div>

        <!-- Score A -->
        <div class="flex flex-col items-center gap-1">
          <button class="w-8 h-7 rounded text-lg leading-none hover:opacity-80" style="background: var(--color-spike-surface-2); color: var(--color-spike-muted);" @click="increment('a')">+</button>
          <input
            v-model="scoreA"
            type="number"
            min="0"
            inputmode="numeric"
            class="score-input"
            placeholder="0"
          />
          <button class="w-8 h-7 rounded text-lg leading-none hover:opacity-80" style="background: var(--color-spike-surface-2); color: var(--color-spike-muted);" @click="decrement('a')">−</button>
        </div>

        <span class="text-xl" style="color: var(--color-spike-muted);">:</span>

        <!-- Score B -->
        <div class="flex flex-col items-center gap-1">
          <button class="w-8 h-7 rounded text-lg leading-none hover:opacity-80" style="background: var(--color-spike-surface-2); color: var(--color-spike-muted);" @click="increment('b')">+</button>
          <input
            v-model="scoreB"
            type="number"
            min="0"
            inputmode="numeric"
            class="score-input"
            placeholder="0"
          />
          <button class="w-8 h-7 rounded text-lg leading-none hover:opacity-80" style="background: var(--color-spike-surface-2); color: var(--color-spike-muted);" @click="decrement('b')">−</button>
        </div>

        <!-- Team B -->
        <div class="flex-1 text-sm font-medium truncate text-right">{{ teamBName }}</div>
      </div>

      <p v-if="error" class="text-xs mt-2 px-2 py-1 rounded" style="color: var(--color-spike-accent); background: rgba(255,90,31,0.1);">{{ error }}</p>

      <div class="flex gap-2 mt-4">
        <button v-if="finished" class="btn-secondary text-sm px-3 py-2 flex-1" @click="editing = false">Abbrechen</button>
        <button class="btn-primary text-sm px-4 py-2 flex-1 justify-center" :disabled="saving" @click="save">
          <NetSpinner v-if="saving" :size="16" />
          {{ saving ? '...' : 'Speichern' }}
        </button>
        <button v-if="finished" class="btn-secondary text-sm px-3 py-2" @click="reset" title="Zurücksetzen">✕</button>
      </div>
    </template>
  </div>
</template>
