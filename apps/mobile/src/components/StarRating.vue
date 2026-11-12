<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

/** Estrelas somente leitura (nota arredondada ao inteiro mais próximo). */
const props = defineProps({
  value: { type: Number, default: 0 },
  size: { type: Number, default: 14 },
});

const { t } = useI18n();
const filled = computed(() => Math.round(props.value));
</script>

<template>
  <span
    class="stars"
    role="img"
    :aria-label="t('reviews.outOf', { value: props.value })"
    :style="{ fontSize: `${props.size}px` }"
  >
    <span v-for="n in 5" :key="n" :class="{ 'is-on': n <= filled }">★</span>
  </span>
</template>

<style scoped>
.stars {
  display: inline-flex;
  gap: 1px;
  line-height: 1;
  color: var(--line);
}

.is-on {
  color: #f59e0b;
}
</style>
