<script setup lang="ts">
const props = defineProps<{
  tournamentId: string
  status: string
  format: string
}>()

const route = useRoute()

const links = computed(() => {
  const base = `/t/${props.tournamentId}`
  const all = [
    { to: base, label: 'Dashboard', exact: true },
    { to: `${base}/players`, label: 'Spieler' },
    ...(props.format !== 'single_elim_only' ? [{ to: `${base}/groups`, label: 'Gruppen' }] : []),
    ...(['ko_stage', 'finished'].includes(props.status) || props.format === 'single_elim_only'
      ? [{ to: `${base}/bracket`, label: 'KO-Baum' }]
      : []),
    ...(props.status === 'finished' ? [{ to: `${base}/results`, label: 'Siegerehrung' }] : []),
    { to: `${base}/live`, label: '📱 Live' },
  ]
  return all
})

function isActive(link: { to: string; exact?: boolean }) {
  return link.exact ? route.path === link.to : route.path.startsWith(link.to)
}
</script>

<template>
  <nav class="overflow-x-auto mb-8">
    <div class="flex gap-1 min-w-max border-b pb-px" style="border-color: var(--color-spike-border);">
      <NuxtLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        class="px-4 py-2 text-sm font-medium transition-colors rounded-t whitespace-nowrap"
        :style="isActive(link)
          ? 'color: var(--color-spike-yellow); border-bottom: 2px solid var(--color-spike-yellow); margin-bottom: -1px;'
          : 'color: var(--color-spike-muted);'"
      >
        {{ link.label }}
      </NuxtLink>
    </div>
  </nav>
</template>
