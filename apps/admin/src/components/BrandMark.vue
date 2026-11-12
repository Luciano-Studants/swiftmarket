<script setup>
/** Marca do SwiftMarket (sacola com raio), a mesma do ícone do app. */
const props = defineProps({ size: { type: Number, default: 32 } });

// ids únicos: a marca pode aparecer mais de uma vez na mesma página.
const uid = Math.random().toString(36).slice(2, 8);
const gradientId = `sm-grad-${uid}`;
const maskId = `sm-mask-${uid}`;
</script>

<template>
  <svg viewBox="0 0 100 100" :width="size" :height="size" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient :id="gradientId" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#06b6d4" />
        <stop offset="1" stop-color="#6366f1" />
      </linearGradient>
      <mask :id="maskId">
        <rect width="100" height="100" fill="#fff" />
        <polygon points="55,45 39,66 49,66 44,81 62,57 52,57" fill="#000" />
      </mask>
    </defs>
    <g :mask="`url(#${maskId})`" :fill="`url(#${gradientId})`">
      <path
        d="M24 36 H76 a6 6 0 0 1 6 6.4 L78 80 a8 8 0 0 1 -8 7 H30 a8 8 0 0 1 -8 -7 L18 42.4 a6 6 0 0 1 6 -6.4 Z"
      />
    </g>
    <path
      d="M32 42 V36 a18 18 0 0 1 36 0 V42"
      fill="none"
      :stroke="`url(#${gradientId})`"
      stroke-width="6"
      stroke-linecap="round"
    />
  </svg>
</template>
