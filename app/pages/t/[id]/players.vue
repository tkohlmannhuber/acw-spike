<script setup lang="ts">
import { ref, computed, watch } from 'vue'
const route = useRoute()
const router = useRouter()
const id = route.params.id as string

useHead({ title: 'Spieler & Auslosung — ACW Spikeball' })

const { data: tournament, refresh } = await useFetch(`/api/tournaments/${id}`)

// ─── Known players (global registry) ──────────────────────────────────────

const { data: knownPlayers, refresh: refreshKnown } = await useFetch<Array<{ id: string; name: string }>>('/api/known-players')
const showKnown = ref(false)

function addKnownPlayer(name: string) {
  if (!editablePlayers.value.includes(name)) {
    editablePlayers.value.push(name)
  }
}

function addAllKnown() {
  for (const p of knownPlayers.value ?? []) {
    if (!editablePlayers.value.includes(p.name)) {
      editablePlayers.value.push(p.name)
    }
  }
}

async function saveToRegistry() {
  if (editablePlayers.value.length === 0) return
  await $fetch('/api/known-players', {
    method: 'POST',
    body: { names: editablePlayers.value },
  })
  await refreshKnown()
}

async function deleteKnown(id: string) {
  await $fetch(`/api/known-players/${id}`, { method: 'DELETE' })
  await refreshKnown()
}

// ─── Player list state ─────────────────────────────────────────────────────

const playerInput = ref('')
const bulkInput = ref('')
const showBulk = ref(false)
const loading = ref(false)
const error = ref('')

const editablePlayers = ref<string[]>([])

watch(tournament, (t) => {
  if (t && (t as any).players) {
    editablePlayers.value = (t as any).players.map((p: any) => p.name)
  }
}, { immediate: true })

function addPlayer() {
  const name = playerInput.value.trim()
  if (name && !editablePlayers.value.includes(name)) {
    editablePlayers.value.push(name)
  }
  playerInput.value = ''
}

function removePlayer(i: number) {
  editablePlayers.value.splice(i, 1)
}

function addBulk() {
  const names = bulkInput.value
    .split('\n')
    .map(n => n.trim())
    .filter(n => n.length > 0 && !editablePlayers.value.includes(n))
  editablePlayers.value.push(...names)
  bulkInput.value = ''
  showBulk.value = false
}

async function savePlayers() {
  if (editablePlayers.value.length < 2) { error.value = 'Mindestens 2 Spieler erforderlich.'; return }
  error.value = ''
  loading.value = true
  try {
    await $fetch(`/api/tournaments/${id}/players`, {
      method: 'POST',
      body: { names: editablePlayers.value },
    })
    await refresh()
  } catch (e: any) {
    error.value = e?.data?.message || 'Fehler beim Speichern.'
  } finally {
    loading.value = false
  }
}

// ─── Draw state ────────────────────────────────────────────────────────────

type DrawPhase = 'idle' | 'spinning' | 'revealed' | 'confirmed'
const drawPhase = ref<DrawPhase>('idle')
const drawnTeams = ref<any[]>([])
const drawPlayers = ref<any[]>([])
const oddPlayerMode = ref<'triple' | 'substitute' | null>(null)
const tripleIndex = ref(0)
const substituteId = ref<string | null>(null)
const showOddDialog = ref(false)

const isOddCount = computed(() => editablePlayers.value.length % 2 === 1)
const currentPlayers = computed(() => (tournament.value as any)?.players ?? [])
const currentTeams = computed(() => (tournament.value as any)?.teams ?? [])
const alreadyDrawn = computed(() => (tournament.value as any)?.status === 'draw_done')

async function startDraw() {
  if (editablePlayers.value.length !== currentPlayers.value.length
    || editablePlayers.value.some((n: string, i: number) => n !== currentPlayers.value[i]?.name)) {
    // Save player list first
    await savePlayers()
    await refresh()
  }

  if (isOddCount.value) {
    showOddDialog.value = true
    return
  }

  await performDraw()
}

async function performDraw(tIdx?: number, subId?: string) {
  showOddDialog.value = false
  drawPhase.value = 'spinning'
  error.value = ''

  try {
    const result = await $fetch(`/api/tournaments/${id}/draw`, {
      method: 'POST',
      body: {
        tripleIndex: tIdx ?? (oddPlayerMode.value === 'triple' ? tripleIndex.value : -1),
        substitutePlayerId: subId ?? (oddPlayerMode.value === 'substitute' ? substituteId.value : undefined),
      },
    })
    drawnTeams.value = (result as any).teams
    drawPlayers.value = (result as any).players
    await refresh()
    await new Promise(r => setTimeout(r, 1200)) // dramatic pause
    drawPhase.value = 'revealed'
  } catch (e: any) {
    error.value = e?.data?.message || 'Fehler bei der Auslosung.'
    drawPhase.value = 'idle'
  }
}

async function reroll() {
  drawnTeams.value = []
  await performDraw(
    oddPlayerMode.value === 'triple' ? tripleIndex.value : undefined,
    oddPlayerMode.value === 'substitute' ? substituteId.value ?? undefined : undefined,
  )
}

async function confirmDraw() {
  await refresh()
  drawPhase.value = 'confirmed'
  router.push(`/t/${id}/groups`)
}

// ─── Manual team builder ───────────────────────────────────────────────────

const manualMode = ref(false)
// pairs[i] = array of player names in that team
const manualPairs = ref<string[][]>([[]])
const manualLoading = ref(false)
const manualError = ref('')

function openManual() {
  manualPairs.value = [[]]
  manualError.value = ''
  manualMode.value = true
}

const manualAssigned = computed(() => new Set(manualPairs.value.flat()))

function assignPlayer(name: string) {
  // Find last incomplete slot (< 2 players), else add new slot
  const idx = manualPairs.value.findIndex(p => p.length < 2)
  if (idx >= 0) {
    manualPairs.value[idx].push(name)
  } else {
    manualPairs.value.push([name])
  }
}

function removeFromPair(pairIdx: number, playerIdx: number) {
  manualPairs.value[pairIdx].splice(playerIdx, 1)
  if (manualPairs.value[pairIdx].length === 0 && manualPairs.value.length > 1) {
    manualPairs.value.splice(pairIdx, 1)
  }
}

function addEmptyPair() {
  manualPairs.value.push([])
}

const manualComplete = computed(() =>
  manualPairs.value.length > 0 &&
  manualPairs.value.every(p => p.length >= 1) &&
  manualAssigned.value.size === editablePlayers.value.length
)

async function saveManualTeams() {
  manualLoading.value = true
  manualError.value = ''
  try {
    await $fetch(`/api/tournaments/${id}/teams-fixed`, {
      method: 'POST',
      body: {
        playerNames: editablePlayers.value,
        teamPairs: manualPairs.value.filter(p => p.length > 0),
      },
    })
    await refresh()
    manualMode.value = false
    router.push(`/t/${id}/groups`)
  } catch (e: any) {
    manualError.value = e?.data?.message || 'Fehler beim Speichern.'
  } finally {
    manualLoading.value = false
  }
}

// ─── Editable team names ───────────────────────────────────────────────────
const editingTeamId = ref<string | null>(null)
const editingTeamName = ref('')

function startEditTeam(team: any) {
  editingTeamId.value = team.id
  editingTeamName.value = team.name
}

async function saveTeamName(teamId: string) {
  try {
    await $fetch(`/api/tournaments/${id}/teams`, {
      method: 'PATCH',
      body: { teamId, name: editingTeamName.value },
    })
    await refresh()
  } catch {}
  editingTeamId.value = null
}
</script>

<template>
  <div class="max-w-3xl mx-auto px-4 sm:px-6 py-10">
    <NuxtLink :to="`/t/${id}`" class="inline-flex items-center gap-2 text-sm mb-4 hover:opacity-70 transition-opacity" style="color: var(--color-spike-muted);">
      ← Zum Turnier
    </NuxtLink>

    <TournamentNav
      v-if="tournament"
      :tournament-id="id"
      :status="(tournament as any).status"
      :format="(tournament as any).format"
    />

    <h1 class="text-display text-3xl sm:text-4xl mb-8" style="color: var(--color-spike-yellow);">
      Spieler &amp; Auslosung
    </h1>

    <!-- Already confirmed -->
    <div v-if="alreadyDrawn && currentTeams.length > 0 && drawPhase === 'idle'" class="mb-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-display text-xl" style="color: var(--color-spike-white);">Ausgeloste Teams</h2>
        <button class="btn-secondary text-sm px-4 py-2" @click="drawPhase = 'idle'; drawnTeams = currentTeams">
          Neu auslosen
        </button>
      </div>
      <div class="grid sm:grid-cols-2 gap-3">
        <div v-for="team in currentTeams" :key="team.id" class="card p-4 flex items-center gap-3">
          <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm text-display shrink-0"
            style="background: var(--color-spike-yellow); color: var(--color-spike-black);">
            #{{ currentTeams.indexOf(team) + 1 }}
          </div>
          <div class="flex-1 min-w-0">
            <div v-if="editingTeamId === team.id" class="flex gap-2">
              <input
                v-model="editingTeamName"
                class="flex-1 min-w-0 px-2 py-1 rounded text-sm outline-none"
                style="background: var(--color-spike-surface-2); border: 1px solid var(--color-spike-yellow); color: var(--color-spike-white);"
                @keyup.enter="saveTeamName(team.id)"
                @keyup.escape="editingTeamId = null"
              />
              <button class="text-xs btn-primary px-2 py-1" @click="saveTeamName(team.id)">✓</button>
            </div>
            <p v-else class="font-semibold text-sm truncate cursor-pointer hover:text-yellow-400 transition-colors" @click="startEditTeam(team)">
              {{ team.name }}
            </p>
          </div>
          <button class="text-xs opacity-40 hover:opacity-80" @click="startEditTeam(team)" title="Umbenennen">✏️</button>
        </div>
      </div>

      <div class="mt-6 flex justify-end">
        <NuxtLink :to="`/t/${id}/groups`" class="btn-primary">Zur Gruppenphase →</NuxtLink>
      </div>
    </div>

    <!-- Known players panel -->
    <div v-if="drawPhase === 'idle' && (knownPlayers?.length ?? 0) > 0" class="card p-4 mb-4">
      <button
        class="flex items-center justify-between w-full text-left"
        @click="showKnown = !showKnown"
      >
        <span class="text-display text-sm" style="color: var(--color-spike-muted);">
          GESPEICHERTE SPIELER ({{ knownPlayers?.length }})
        </span>
        <span class="text-xs" style="color: var(--color-spike-muted);">{{ showKnown ? '▲' : '▼' }}</span>
      </button>

      <Transition name="slide-down">
        <div v-if="showKnown" class="mt-3">
          <div class="flex flex-wrap gap-2 mb-3">
            <button
              v-for="p in knownPlayers"
              :key="p.id"
              class="group relative flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all"
              :style="editablePlayers.includes(p.name)
                ? 'background: rgba(255,221,0,0.15); color: var(--color-spike-yellow); cursor: default; opacity: 0.5;'
                : 'background: var(--color-spike-surface-2); color: var(--color-spike-white); cursor: pointer;'"
              :disabled="editablePlayers.includes(p.name)"
              @click="addKnownPlayer(p.name)"
            >
              {{ p.name }}
              <span
                class="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                style="color: var(--color-spike-accent);"
                @click.stop="deleteKnown(p.id)"
                title="Aus Liste entfernen"
              >✕</span>
            </button>
          </div>
          <div class="flex gap-2">
            <button class="btn-secondary text-xs px-3 py-1.5" @click="addAllKnown">Alle hinzufügen</button>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Player entry section -->
    <div v-if="drawPhase === 'idle'" class="card p-6 mb-6">
      <h2 class="text-display text-lg mb-4" style="color: var(--color-spike-white);">Spielerliste</h2>

      <!-- Input -->
      <div class="flex gap-2 mb-4">
        <input
          v-model="playerInput"
          type="text"
          placeholder="Spielername eingeben..."
          class="flex-1 px-4 py-3 rounded-xl text-base outline-none"
          style="background: var(--color-spike-surface-2); border: 2px solid var(--color-spike-border); color: var(--color-spike-white);"
          @keyup.enter="addPlayer"
          @focus="$event.target.style.borderColor = 'var(--color-spike-yellow)'"
          @blur="$event.target.style.borderColor = 'var(--color-spike-border)'"
        />
        <button class="btn-primary px-4" @click="addPlayer">+</button>
      </div>

      <!-- Bulk paste -->
      <button class="text-xs mb-4 hover:opacity-80" style="color: var(--color-spike-muted);" @click="showBulk = !showBulk">
        {{ showBulk ? '▲ Bulk-Eingabe schließen' : '▼ Mehrere Namen auf einmal einfügen' }}
      </button>
      <Transition name="slide-down">
        <div v-if="showBulk" class="mb-4">
          <textarea
            v-model="bulkInput"
            rows="5"
            placeholder="Ein Name pro Zeile&#10;Max Mustermann&#10;Anna Schmidt&#10;..."
            class="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
            style="background: var(--color-spike-surface-2); border: 2px solid var(--color-spike-border); color: var(--color-spike-white);"
          />
          <button class="btn-secondary mt-2 text-sm px-4 py-2" @click="addBulk">Hinzufügen</button>
        </div>
      </Transition>

      <!-- Player list -->
      <div v-if="editablePlayers.length > 0" class="space-y-1.5 mb-5">
        <div
          v-for="(name, i) in editablePlayers"
          :key="i"
          class="flex items-center gap-3 px-3 py-2 rounded-lg"
          style="background: var(--color-spike-surface-2);"
        >
          <span class="text-xs font-mono w-5 text-center shrink-0" style="color: var(--color-spike-muted);">{{ i + 1 }}</span>
          <span class="flex-1 text-sm">{{ name }}</span>
          <button class="text-xs hover:opacity-80 transition-opacity" style="color: var(--color-spike-accent);" @click="removePlayer(i)">✕</button>
        </div>
      </div>

      <div v-else class="text-center py-6" style="color: var(--color-spike-muted);">
        <p class="text-sm">Noch keine Spieler. Füge Spieler oben ein oder nutze die Bulk-Eingabe.</p>
      </div>

      <div class="flex items-center justify-between flex-wrap gap-3 mt-2">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="text-sm" :style="isOddCount && editablePlayers.length > 0 ? 'color: var(--color-spike-accent)' : 'color: var(--color-spike-muted)'">
            {{ editablePlayers.length }} Spieler
            <span v-if="isOddCount && editablePlayers.length > 0"> — ungerade Anzahl</span>
          </div>
          <button
            v-if="editablePlayers.length > 0"
            class="text-xs hover:opacity-80 transition-opacity"
            style="color: var(--color-spike-muted);"
            title="Spieler in globale Liste speichern"
            @click="saveToRegistry"
          >
            💾 Speichern
          </button>
        </div>
        <div class="flex gap-2 flex-wrap">
          <button
            class="btn-secondary"
            :disabled="editablePlayers.length < 2 || loading"
            @click="openManual"
          >
            ✋ Teams fix festlegen
          </button>
          <button
            class="btn-primary"
            :disabled="editablePlayers.length < 2 || loading"
            @click="startDraw"
          >
            <NetSpinner v-if="loading" :size="18" />
            🎱 Teams auslosen
          </button>
        </div>
      </div>

      <p v-if="error" class="mt-3 text-sm px-3 py-2 rounded-lg" style="background: rgba(255,90,31,0.1); color: var(--color-spike-accent);">
        {{ error }}
      </p>
    </div>

    <!-- Manual team builder modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="manualMode" class="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style="background: rgba(0,0,0,0.8);">
          <div class="card w-full max-w-lg my-8 p-6">
            <div class="flex items-center justify-between mb-5">
              <h2 class="text-display text-xl" style="color: var(--color-spike-yellow);">Teams fix festlegen</h2>
              <button class="text-lg opacity-40 hover:opacity-80" @click="manualMode = false">✕</button>
            </div>

            <!-- Available players -->
            <div class="mb-5">
              <p class="text-xs mb-2" style="color: var(--color-spike-muted);">Spieler antippen zum Zuweisen</p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="name in editablePlayers"
                  :key="name"
                  :disabled="manualAssigned.has(name)"
                  class="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
                  :style="manualAssigned.has(name)
                    ? 'background: var(--color-spike-surface-2); color: var(--color-spike-muted); opacity: 0.4; cursor: default;'
                    : 'background: var(--color-spike-yellow); color: var(--color-spike-black); cursor: pointer;'"
                  @click="!manualAssigned.has(name) && assignPlayer(name)"
                >
                  {{ name }}
                </button>
              </div>
            </div>

            <!-- Team slots -->
            <div class="space-y-2 mb-4">
              <div
                v-for="(pair, pi) in manualPairs"
                :key="pi"
                class="flex items-center gap-2 p-3 rounded-xl"
                style="background: var(--color-spike-surface-2);"
              >
                <span class="text-xs font-mono w-14 shrink-0 text-display" style="color: var(--color-spike-muted);">Team {{ pi + 1 }}</span>
                <div class="flex flex-wrap gap-1.5 flex-1 min-h-7">
                  <span
                    v-for="(name, ni) in pair"
                    :key="ni"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-sm"
                    style="background: rgba(255,221,0,0.15); color: var(--color-spike-yellow); border: 1px solid rgba(255,221,0,0.3);"
                  >
                    {{ name }}
                    <button class="opacity-50 hover:opacity-100 text-xs leading-none" @click="removeFromPair(pi, ni)">✕</button>
                  </span>
                  <span v-if="pair.length === 0" class="text-xs italic" style="color: var(--color-spike-muted);">leer — Spieler oben antippen</span>
                </div>
              </div>
            </div>

            <button class="text-xs mb-4 hover:opacity-80" style="color: var(--color-spike-muted);" @click="addEmptyPair">
              + Team-Slot hinzufügen
            </button>

            <p v-if="manualError" class="text-xs mb-3 px-3 py-2 rounded-lg" style="background: rgba(255,90,31,0.1); color: var(--color-spike-accent);">{{ manualError }}</p>

            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="manualMode = false">Abbrechen</button>
              <button
                class="btn-primary flex-1 justify-center"
                :disabled="!manualComplete || manualLoading"
                @click="saveManualTeams"
              >
                <NetSpinner v-if="manualLoading" :size="16" />
                {{ manualLoading ? '...' : '✓ Teams speichern' }}
              </button>
            </div>
            <p v-if="!manualComplete && manualPairs.flat().length > 0" class="text-xs mt-2 text-center" style="color: var(--color-spike-muted);">
              Noch {{ editablePlayers.length - manualAssigned.size }} Spieler nicht zugewiesen
            </p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Odd player count dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showOddDialog" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(0,0,0,0.7);">
          <div class="card p-8 max-w-md w-full">
            <h3 class="text-display text-2xl mb-2" style="color: var(--color-spike-yellow);">Ungerade Spielerzahl</h3>
            <p class="text-sm mb-6" style="color: var(--color-spike-muted);">
              {{ editablePlayers.length }} Spieler — wie soll das Team mit 3 Spielern gebildet werden?
            </p>

            <div class="space-y-3 mb-6">
              <label
                class="flex items-start gap-3 p-4 rounded-xl cursor-pointer border"
                :style="oddPlayerMode === 'triple' ? 'border-color: var(--color-spike-yellow); background: rgba(255,221,0,0.08);' : 'border-color: var(--color-spike-border);'"
              >
                <input type="radio" value="triple" v-model="oddPlayerMode" class="mt-0.5" />
                <div>
                  <div class="font-semibold text-sm">3er-Team bilden</div>
                  <div class="text-xs mt-1" style="color: var(--color-spike-muted);">Drei Spieler teilen sich einen Team-Slot</div>
                </div>
              </label>
              <label
                class="flex items-start gap-3 p-4 rounded-xl cursor-pointer border"
                :style="oddPlayerMode === 'substitute' ? 'border-color: var(--color-spike-yellow); background: rgba(255,221,0,0.08);' : 'border-color: var(--color-spike-border);'"
              >
                <input type="radio" value="substitute" v-model="oddPlayerMode" class="mt-0.5" />
                <div>
                  <div class="font-semibold text-sm">Springer/Ersatz</div>
                  <div class="text-xs mt-1" style="color: var(--color-spike-muted);">Ein Spieler springt als Ersatz ein, wenn nötig</div>
                </div>
              </label>
            </div>

            <div class="flex gap-3">
              <button class="btn-secondary flex-1" @click="showOddDialog = false">Abbrechen</button>
              <button
                class="btn-primary flex-1"
                :disabled="!oddPlayerMode"
                @click="performDraw(
                  oddPlayerMode === 'triple' ? 0 : undefined,
                  undefined
                )"
              >
                Los!
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Spinning animation -->
    <Transition name="fade">
      <div v-if="drawPhase === 'spinning'" class="card p-12 text-center">
        <div class="flex justify-center mb-6">
          <NetSpinner :size="80" />
        </div>
        <h2 class="text-display text-3xl animate-pulse" style="color: var(--color-spike-yellow);">Auslosen...</h2>
        <p class="text-sm mt-2" style="color: var(--color-spike-muted);">Die Teams werden zufällig gebildet</p>
      </div>
    </Transition>

    <!-- Revealed teams -->
    <Transition name="fade">
      <div v-if="drawPhase === 'revealed'" class="space-y-4">
        <div class="flex items-center justify-between flex-wrap gap-3 mb-6">
          <h2 class="text-display text-2xl sm:text-3xl" style="color: var(--color-spike-yellow);">Teams ausgelost!</h2>
          <button class="btn-secondary text-sm" @click="reroll">🔄 Neu würfeln</button>
        </div>

        <div class="grid sm:grid-cols-2 gap-3">
          <TransitionGroup name="team-reveal" appear>
            <div
              v-for="(team, i) in (drawnTeams.length ? drawnTeams : currentTeams)"
              :key="team.id"
              class="card p-4 flex items-center gap-3"
              :style="`animation-delay: ${i * 80}ms`"
            >
              <div
                class="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0 text-display"
                style="background: var(--color-spike-yellow); color: var(--color-spike-black);"
              >
                {{ i + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <div v-if="editingTeamId === team.id" class="flex gap-2">
                  <input
                    v-model="editingTeamName"
                    class="flex-1 min-w-0 px-2 py-1 rounded text-sm outline-none"
                    style="background: var(--color-spike-surface-2); border: 1px solid var(--color-spike-yellow); color: var(--color-spike-white);"
                    @keyup.enter="saveTeamName(team.id)"
                  />
                  <button class="btn-primary text-xs px-2 py-1" @click="saveTeamName(team.id)">✓</button>
                </div>
                <p v-else class="font-semibold text-sm cursor-pointer hover:text-yellow-400 transition-colors" @click="startEditTeam(team)">
                  {{ team.name }}
                </p>
              </div>
              <button class="text-xs opacity-40 hover:opacity-80" @click="startEditTeam(team)">✏️</button>
            </div>
          </TransitionGroup>
        </div>

        <div class="flex justify-end pt-4">
          <button class="btn-primary text-lg px-8 py-4" @click="confirmDraw">
            ✓ Auslosung bestätigen →
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-down-enter-active, .slide-down-leave-active { transition: all 0.25s ease; overflow: hidden; }
.slide-down-enter-from, .slide-down-leave-to { max-height: 0; opacity: 0; }
.slide-down-enter-to, .slide-down-leave-from { max-height: 300px; opacity: 1; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.team-reveal-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.team-reveal-enter-from {
  opacity: 0;
  transform: translateY(16px) scale(0.96);
}
</style>
