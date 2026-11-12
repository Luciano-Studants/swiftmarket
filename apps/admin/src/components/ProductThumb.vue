<script setup>
import { computed } from 'vue';

import { assetUrl } from '@/core/config.js';

const props = defineProps({
  product: { type: Object, required: true },
  size: { type: Number, default: 44 },
});

const style = computed(() => {
  const { imageUrl, hue } = props.product;
  const base = { width: `${props.size}px`, height: `${props.size}px` };

  if (imageUrl) return { ...base, backgroundImage: `url(${assetUrl(imageUrl)})` };
  return {
    ...base,
    background: `linear-gradient(135deg, hsl(${hue} 70% 86%), hsl(${hue} 60% 66%))`,
  };
});
</script>

<template>
  <div class="thumb" :style="style" role="img" :aria-label="product.name">
    <span v-if="!product.imageUrl" aria-hidden="true">{{ product.emoji }}</span>
  </div>
</template>

<style scoped>
.thumb {
  display: grid;
  flex: none;
  place-items: center;
  border-radius: var(--radius-sm);
  font-size: 20px;
  background-size: cover;
  background-position: center;
}
</style>
