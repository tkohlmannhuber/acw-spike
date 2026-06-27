<script setup lang="ts">
defineProps<{ size?: number }>()
</script>

<template>
  <div class="flex items-center justify-center">
    <svg
      :width="size || 64"
      :height="size || 64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      class="net-spin"
    >
      <circle cx="32" cy="32" r="28" stroke="#FFDD00" stroke-width="3" stroke-opacity="0.2" />
      <circle cx="32" cy="32" r="28" stroke="#FFDD00" stroke-width="3" stroke-linecap="round"
        stroke-dasharray="44 132" />
      <circle cx="32" cy="32" r="18" stroke="#FFDD00" stroke-width="2" stroke-dasharray="6 3" />
      <circle cx="32" cy="32" r="8" stroke="#FFDD00" stroke-width="2" />
      <line x1="32" y1="4" x2="32" y2="60" stroke="#FFDD00" stroke-width="1.5" stroke-opacity="0.3" />
      <line x1="4" y1="32" x2="60" y2="32" stroke="#FFDD00" stroke-width="1.5" stroke-opacity="0.3" />
    </svg>
  </div>
</template>

<style scoped>
.net-spin {
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
