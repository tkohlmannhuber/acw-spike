<script setup lang="ts">
useHead({ title: 'Neues Turnier — ACW Spikeball' })

const router = useRouter()

const form = reactive({
  name: '',
  date: new Date().toISOString().split('T')[0],
  format: 'groups_then_ko' as 'groups_then_ko' | 'round_robin_only' | 'single_elim_only',
  poolCount: 2,
  qualifiersPerPool: 2,
  scoreMode: 'single_game' as 'single_game' | 'best_of_3',
})

const loading = ref(false)
const error = ref('')

const showGroupOptions = computed(() => form.format === 'groups_then_ko')

async function submit() {
  if (!form.name.trim()) { error.value = 'Bitte einen Turniernamen eingeben.'; return }
  error.value = ''
  loading.value = true
  try {
    const tournament = await $fetch('/api/tournaments', {
      method: 'POST',
      body: {
        ...form,
        date: new Date(form.date).toISOString(),
      },
    })
    await router.push(`/t/${(tournament as any).id}`)
  } catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Fehler beim Erstellen.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="max-w-2xl mx-auto px-4 sm:px-6 py-12">
    <NuxtLink to="/" class="inline-flex items-center gap-2 text-sm mb-8 transition-colors hover:opacity-80" style="color: var(--color-spike-muted);">
      ← Zurück zur Übersicht
    </NuxtLink>

    <div class="flex items-center gap-4 mb-8">
      <NetIcon class="w-10 h-10 flex-shrink-0" />
      <div>
        <h1 class="text-display text-3xl sm:text-4xl" style="color: var(--color-spike-yellow);">Neues Turnier</h1>
        <p class="text-sm mt-1" style="color: var(--color-spike-muted);">Konfiguriere dein Spikeball-Turnier</p>
      </div>
    </div>

    <form class="card p-6 sm:p-8 space-y-6" @submit.prevent="submit">
      <!-- Name -->
      <div>
        <label class="block text-sm font-medium mb-2" style="color: var(--color-spike-muted);">Turniername *</label>
        <input
          v-model="form.name"
          type="text"
          placeholder="ACW Spikeball Open 2026"
          class="w-full px-4 py-3 rounded-xl text-base outline-none transition-colors"
          style="background: var(--color-spike-surface-2); border: 2px solid var(--color-spike-border); color: var(--color-spike-white);"
          @focus="$event.target.style.borderColor = 'var(--color-spike-yellow)'"
          @blur="$event.target.style.borderColor = 'var(--color-spike-border)'"
        />
      </div>

      <!-- Date -->
      <div>
        <label class="block text-sm font-medium mb-2" style="color: var(--color-spike-muted);">Datum</label>
        <input
          v-model="form.date"
          type="date"
          class="w-full px-4 py-3 rounded-xl text-base outline-none transition-colors"
          style="background: var(--color-spike-surface-2); border: 2px solid var(--color-spike-border); color: var(--color-spike-white); color-scheme: dark;"
          @focus="$event.target.style.borderColor = 'var(--color-spike-yellow)'"
          @blur="$event.target.style.borderColor = 'var(--color-spike-border)'"
        />
      </div>

      <!-- Format -->
      <div>
        <label class="block text-sm font-medium mb-3" style="color: var(--color-spike-muted);">Turnierformat</label>
        <div class="grid gap-3">
          <label
            v-for="opt in [
              { value: 'groups_then_ko', label: 'Gruppenphase + KO', desc: 'Jeder spielt in Pools, dann KO-Baum — empfohlen' },
              { value: 'round_robin_only', label: 'Nur Round Robin', desc: 'Jeder gegen jeden, Endstand nach Punkten (≤5 Teams)' },
              { value: 'single_elim_only', label: 'Nur KO', desc: 'Direkte KO-Runde ohne Gruppenphase' },
            ]"
            :key="opt.value"
            class="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors border"
            :style="form.format === opt.value
              ? 'background: rgba(255,221,0,0.08); border-color: var(--color-spike-yellow);'
              : 'background: var(--color-spike-surface-2); border-color: var(--color-spike-border);'"
          >
            <input type="radio" :value="opt.value" v-model="form.format" class="mt-0.5 accent-yellow-400" />
            <div>
              <div class="font-semibold text-sm">{{ opt.label }}</div>
              <div class="text-xs mt-0.5" style="color: var(--color-spike-muted);">{{ opt.desc }}</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Group phase options -->
      <Transition name="slide-down">
        <div v-if="showGroupOptions" class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--color-spike-muted);">Anzahl Pools</label>
            <select
              v-model.number="form.poolCount"
              class="w-full px-4 py-3 rounded-xl text-base outline-none"
              style="background: var(--color-spike-surface-2); border: 2px solid var(--color-spike-border); color: var(--color-spike-white);"
            >
              <option v-for="n in [2,3,4]" :key="n" :value="n">{{ n }} Pools</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2" style="color: var(--color-spike-muted);">Qualifikanten pro Pool</label>
            <select
              v-model.number="form.qualifiersPerPool"
              class="w-full px-4 py-3 rounded-xl text-base outline-none"
              style="background: var(--color-spike-surface-2); border: 2px solid var(--color-spike-border); color: var(--color-spike-white);"
            >
              <option v-for="n in [1,2,3,4]" :key="n" :value="n">Top {{ n }}</option>
            </select>
          </div>
        </div>
      </Transition>

      <!-- Score mode -->
      <div>
        <label class="block text-sm font-medium mb-3" style="color: var(--color-spike-muted);">Spielmodus</label>
        <div class="grid sm:grid-cols-2 gap-3">
          <label
            v-for="opt in [
              { value: 'single_game', label: 'Einzelspiel', desc: 'Auf 21 Punkte, 2 Punkte Vorsprung' },
              { value: 'best_of_3', label: 'Best of 3', desc: 'Sätze auf 11 oder 15 Punkte' },
            ]"
            :key="opt.value"
            class="flex items-start gap-3 p-4 rounded-xl cursor-pointer transition-colors border"
            :style="form.scoreMode === opt.value
              ? 'background: rgba(255,221,0,0.08); border-color: var(--color-spike-yellow);'
              : 'background: var(--color-spike-surface-2); border-color: var(--color-spike-border);'"
          >
            <input type="radio" :value="opt.value" v-model="form.scoreMode" class="mt-0.5 accent-yellow-400" />
            <div>
              <div class="font-semibold text-sm">{{ opt.label }}</div>
              <div class="text-xs mt-0.5" style="color: var(--color-spike-muted);">{{ opt.desc }}</div>
            </div>
          </label>
        </div>
      </div>

      <!-- Error -->
      <p v-if="error" class="text-sm px-3 py-2 rounded-lg" style="background: rgba(255,90,31,0.1); color: var(--color-spike-accent);">
        {{ error }}
      </p>

      <!-- Submit -->
      <button type="submit" class="btn-primary w-full justify-center py-4 text-lg" :disabled="loading">
        <NetSpinner v-if="loading" :size="20" />
        <span>{{ loading ? 'Erstelle...' : 'Turnier erstellen →' }}</span>
      </button>
    </form>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}
.slide-down-enter-from,
.slide-down-leave-to {
  max-height: 0;
  opacity: 0;
}
.slide-down-enter-to,
.slide-down-leave-from {
  max-height: 200px;
  opacity: 1;
}
</style>
