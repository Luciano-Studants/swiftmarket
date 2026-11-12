<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  icon: { type: String, default: '' },
});
</script>

<template>
  <div class="card stat">
    <div class="stat__head">
      <span class="field-label">{{ label }}</span>
      <span v-if="icon" class="stat__icon" aria-hidden="true">{{ icon }}</span>
    </div>
    <b class="stat__value mono">{{ value }}</b>
  </div>
</template>

<style scoped>
.stat__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat__icon {
  font-size: 18px;
}

.stat__value {
  display: block;
  margin-top: 8px;
  font-size: 26px;
  font-weight: 700;
}
</style>
