<template>
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" v-bind="$attrs">
    <!-- Outer ring -->
    <circle cx="20" cy="20" r="18" stroke="#FFDD00" stroke-width="2.5" />
    <!-- Inner rings -->
    <circle cx="20" cy="20" r="12" stroke="#FFDD00" stroke-width="1.5" stroke-dasharray="4 2" />
    <circle cx="20" cy="20" r="6" stroke="#FFDD00" stroke-width="1.5" />
    <!-- Cross spokes -->
    <line x1="20" y1="2" x2="20" y2="38" stroke="#FFDD00" stroke-width="1.5" />
    <line x1="2" y1="20" x2="38" y2="20" stroke="#FFDD00" stroke-width="1.5" />
    <!-- Diagonal spokes -->
    <line x1="7.4" y1="7.4" x2="32.6" y2="32.6" stroke="#FFDD00" stroke-width="1" stroke-opacity="0.5" />
    <line x1="32.6" y1="7.4" x2="7.4" y2="32.6" stroke="#FFDD00" stroke-width="1" stroke-opacity="0.5" />
  </svg>
</template>
