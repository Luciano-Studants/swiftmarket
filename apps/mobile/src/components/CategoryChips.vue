<script setup>
import { CATEGORIES, CATEGORY_EMOJI } from '@swiftmarket/shared';
import { useI18n } from 'vue-i18n';

defineProps({
  /** Categoria selecionada ('' = todas; null = nenhuma destacada, ex.: na tela inicial) */
  selected: { type: String, default: null },
});
const emit = defineEmits(['select']);

const { t } = useI18n();
</script>

<template>
  <div class="chips">
    <button
      type="button"
      class="chip"
      :class="{ 'chip--active': selected === '' }"
      @click="emit('select', '')"
    >
      ✨ {{ t('categories.all') }}
    </button>

    <button
      v-for="category in CATEGORIES"
      :key="category"
      type="button"
      class="chip"
      :class="{ 'chip--active': selected === category }"
      @click="emit('select', category)"
    >
      {{ CATEGORY_EMOJI[category] }} {{ t(`categories.${category}`) }}
    </button>
  </div>
</template>
