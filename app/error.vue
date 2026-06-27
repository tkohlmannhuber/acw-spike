<script setup lang="ts">
const error = useError()
const handleError = () => clearError({ redirect: '/' })
</script>

<template>
  <div class="min-h-screen flex items-center justify-center px-4" style="background: var(--color-spike-black);">
    <div class="text-center max-w-md">
      <NetIcon class="w-20 h-20 mx-auto mb-6 opacity-30" />
      <h1 class="text-display text-6xl mb-4" style="color: var(--color-spike-yellow);">
        {{ error?.statusCode ?? '500' }}
      </h1>
      <p class="text-lg font-semibold mb-2">{{ error?.statusCode === 404 ? 'Nicht gefunden' : 'Fehler' }}</p>
      <p class="text-sm mb-8" style="color: var(--color-spike-muted);">
        {{ error?.message || 'Irgendetwas ist schiefgelaufen.' }}
      </p>
      <button class="btn-primary" @click="handleError">← Zur Startseite</button>
    </div>
  </div>
</template>
