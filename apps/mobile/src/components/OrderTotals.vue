<script setup>
import { formatMoney } from '@swiftmarket/shared';
import { useI18n } from 'vue-i18n';

/** Resumo de valores (subtotal, frete, impostos, total) usado no carrinho e no checkout. */
defineProps({
  totals: { type: Object, required: true },
});

const { t } = useI18n();
</script>

<template>
  <div class="card">
    <div class="summary-row">
      <span>{{ t('cart.subtotal') }}</span>
      <span>{{ formatMoney(totals.subtotalCents) }}</span>
    </div>
    <div v-if="totals.discountCents" class="summary-row summary-row--discount">
      <span
        >{{ t('coupon.discount')
        }}<template v-if="totals.couponCode"> ({{ totals.couponCode }})</template></span
      >
      <span>−{{ formatMoney(totals.discountCents) }}</span>
    </div>
    <div class="summary-row">
      <span>{{ t('cart.shipping') }}</span>
      <span>{{ totals.shippingCents ? formatMoney(totals.shippingCents) : t('common.free') }}</span>
    </div>
    <div class="summary-row">
      <span>{{ t('cart.tax') }}</span>
      <span>{{ formatMoney(totals.taxCents) }}</span>
    </div>
    <div class="summary-row summary-row--total">
      <span>{{ t('cart.total') }}</span>
      <span>{{ formatMoney(totals.totalCents) }}</span>
    </div>
  </div>
</template>

<style scoped>
.summary-row--discount {
  color: var(--accent);
}
</style>
