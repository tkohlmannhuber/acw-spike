<template>
  <div class="min-h-screen" style="background-color: var(--color-spike-black);">
    <NuxtRouteAnnouncer />
    <AppHeader />
    <main class="min-h-[calc(100vh-4rem)]">
      <NuxtPage />
    </main>
    <AppFooter />
  </div>
</template>
