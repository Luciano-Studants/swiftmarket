<script setup>
import { useI18n } from 'vue-i18n';

/** Seletor de nota de 1 a 5 (v-model). Cada estrela é um botão grande o bastante para o toque. */
const model = defineModel({ type: Number, default: 0 });
const { t } = useI18n();
</script>

<template>
  <div class="star-input" role="radiogroup" :aria-label="t('reviews.yourRating')">
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      class="star-input__star"
      :class="{ 'is-on': n <= model }"
      :aria-checked="model === n"
      :aria-label="t('reviews.outOf', { value: n })"
      @click="model = n"
    >
      ★
    </button>
  </div>
</template>

<style scoped>
.star-input {
  display: flex;
  gap: 4px;
}

.star-input__star {
  width: 44px;
  height: 44px;
  border: 0;
  background: none;
  font-size: 30px;
  line-height: 1;
  color: var(--line);
}

.star-input__star.is-on {
  color: #f59e0b;
}
</style>
