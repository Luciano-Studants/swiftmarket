<script setup>
import { COMMERCE, effectiveCents, formatMoney } from '@swiftmarket/shared';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

import AppHeader from '@/components/AppHeader.vue';
import OrderTotals from '@/components/OrderTotals.vue';
import { productBackground } from '@/core/product.js';
import { useCartStore } from '@/stores/cart.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const cart = useCartStore();
const ui = useUiStore();

const showFreeShippingHint = computed(
  () => cart.totals.subtotalCents > 0 && cart.totals.shippingCents > 0,
);

function changeQuantity(line, delta) {
  const result = cart.setQuantity(line.product.id, line.quantity + delta);
  if (!result.ok && result.available !== undefined) {
    ui.showToast(t('common.onlyInStock', { count: result.available }));
  }
}

// Ao abrir, confere preço/estoque na API; se algo mudou, avisa o usuário.
onMounted(async () => {
  try {
    if (await cart.refresh()) ui.showToast(t('cart.updated'));
  } catch {
    // Sem rede: mostra o carrinho salvo no aparelho.
  }
});
</script>

<template>
  <div>
    <AppHeader :title="t('cart.title')" :show-cart="false" />

    <section class="page-section">
      <p v-if="!cart.items.length" class="empty-state">{{ t('cart.empty') }}</p>

      <template v-else>
        <div class="row" v-for="line in cart.lines" :key="line.product.id">
          <div class="thumb" :style="productBackground(line.product)">
            <span v-if="!line.product.imageUrl">{{ line.product.emoji }}</span>
          </div>

          <div class="row__body">
            <div class="cart__name">{{ line.product.name }}</div>
            <div class="mono cart__price">{{ formatMoney(effectiveCents(line.product)) }}</div>

            <div class="qty">
              <button type="button" aria-label="-" @click="changeQuantity(line, -1)">−</button>
              <span>{{ line.quantity }}</span>
              <button type="button" aria-label="+" @click="changeQuantity(line, 1)">+</button>
            </div>
          </div>

          <button
            type="button"
            class="icon-btn cart__remove"
            :aria-label="t('cart.remove')"
            @click="cart.remove(line.product.id)"
          >
            🗑
          </button>
        </div>

        <div class="cart__summary">
          <OrderTotals :totals="cart.totals" />
          <p v-if="showFreeShippingHint" class="cart__hint">
            {{
              t('cart.freeShippingHint', { amount: formatMoney(COMMERCE.FREE_SHIPPING_FROM_CENTS) })
            }}
          </p>
        </div>
      </template>

      <RouterLink
        :to="{ name: 'checkout' }"
        class="btn cart__checkout"
        :class="{ 'is-disabled': !cart.items.length }"
        :aria-disabled="!cart.items.length"
        :tabindex="cart.items.length ? 0 : -1"
      >
        {{ t('cart.checkout') }}
      </RouterLink>
      <RouterLink :to="{ name: 'home' }" class="btn btn--ghost">{{
        t('cart.keepShopping')
      }}</RouterLink>
    </section>
  </div>
</template>

<style scoped>
.cart__name {
  font-size: 13px;
  font-weight: 600;
}

.cart__price {
  margin: 2px 0 6px;
  font-weight: 700;
}

.cart__remove {
  color: var(--danger);
}

.cart__summary {
  margin: 16px 0;
}

.cart__hint {
  margin-top: 8px;
  font-size: 11px;
  text-align: center;
  color: var(--muted);
}

.cart__checkout {
  text-align: center;
}

/* O RouterLink não tem `disabled`: simulamos o estado. */
.cart__checkout.is-disabled {
  opacity: 0.4;
  pointer-events: none;
}

.btn--ghost {
  text-align: center;
}
</style>
