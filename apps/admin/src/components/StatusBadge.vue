<script setup>
/**
 * Selo de situação. Sempre texto + cor (nunca só cor), com tom semântico:
 * success | warning | danger | neutral.
 */
defineProps({
  tone: { type: String, default: 'neutral' },
  label: { type: String, required: true },
});
</script>

<template>
  <span class="status-badge" :class="`status-badge--${tone}`">{{ label }}</span>
</template>

<style scoped>
.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font: 700 11px var(--font-mono);
  white-space: nowrap;
  background: color-mix(in srgb, var(--muted) 18%, transparent);
  color: var(--text);
}

.status-badge--success {
  background: var(--success-bg);
  color: var(--success);
}

.status-badge--warning {
  background: color-mix(in srgb, #f59e0b 22%, transparent);
  color: #d97706;
}

.status-badge--danger {
  background: color-mix(in srgb, var(--danger) 18%, transparent);
  color: var(--danger);
}

.status-badge--info {
  background: color-mix(in srgb, var(--accent) 18%, transparent);
  color: var(--accent);
}
</style>
