<script setup lang="ts">
defineProps<{
  standings: Array<{
    rank: number
    teamId: string
    team: { name: string }
    wins: number
    losses: number
    played: number
    pointsFor: number
    pointsAgainst: number
    pointDiff: number
  }>
  qualifiers?: number
}>()
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-sm">
      <thead>
        <tr style="color: var(--color-spike-muted); border-bottom: 1px solid var(--color-spike-border);">
          <th class="text-left py-2 pr-4 font-medium text-xs text-display">#</th>
          <th class="text-left py-2 pr-4 font-medium text-xs text-display">Team</th>
          <th class="text-center py-2 px-2 font-medium text-xs text-display">SP</th>
          <th class="text-center py-2 px-2 font-medium text-xs text-display">S</th>
          <th class="text-center py-2 px-2 font-medium text-xs text-display">N</th>
          <th class="text-center py-2 px-2 font-medium text-xs text-display">±</th>
          <th class="text-center py-2 px-2 font-medium text-xs text-display">Pkt+</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="s in standings"
          :key="s.teamId"
          class="transition-colors"
          :style="s.rank <= (qualifiers ?? 2) ? 'border-left: 2px solid var(--color-spike-yellow);' : ''"
        >
          <td class="py-2.5 pr-4">
            <span
              class="w-6 h-6 rounded-full inline-flex items-center justify-center text-xs text-display font-bold"
              :style="s.rank <= (qualifiers ?? 2)
                ? 'background: var(--color-spike-yellow); color: var(--color-spike-black);'
                : 'background: var(--color-spike-surface-2); color: var(--color-spike-muted);'"
            >{{ s.rank }}</span>
          </td>
          <td class="py-2.5 pr-4 font-medium">{{ s.team?.name ?? '—' }}</td>
          <td class="text-center py-2.5 px-2" style="color: var(--color-spike-muted);">{{ s.played }}</td>
          <td class="text-center py-2.5 px-2 font-bold" style="color: #4ade80;">{{ s.wins }}</td>
          <td class="text-center py-2.5 px-2" style="color: var(--color-spike-accent);">{{ s.losses }}</td>
          <td class="text-center py-2.5 px-2 font-medium" :style="s.pointDiff > 0 ? 'color: #4ade80' : s.pointDiff < 0 ? 'color: var(--color-spike-accent)' : 'color: var(--color-spike-muted)'">
            {{ s.pointDiff > 0 ? '+' : '' }}{{ s.pointDiff }}
          </td>
          <td class="text-center py-2.5 px-2" style="color: var(--color-spike-muted);">{{ s.pointsFor }}</td>
        </tr>
        <tr v-if="standings.length === 0">
          <td colspan="7" class="text-center py-4 text-xs" style="color: var(--color-spike-muted);">Noch keine Ergebnisse</td>
        </tr>
      </tbody>
    </table>
    <p class="text-xs mt-2" style="color: var(--color-spike-muted);">SP = Spiele, S = Siege, N = Niederlagen, ± = Punktedifferenz</p>
  </div>
</template>
