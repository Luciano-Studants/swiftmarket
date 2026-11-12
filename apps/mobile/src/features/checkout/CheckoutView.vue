<script setup>
import { PAYMENT_METHODS, effectiveCents, formatMoney } from '@swiftmarket/shared';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AddressSheet from '@/components/AddressSheet.vue';
import AppHeader from '@/components/AppHeader.vue';
import OrderTotals from '@/components/OrderTotals.vue';
import { useRequestState } from '@/composables/useRequestState.js';
import { errorMessage } from '@/core/errors.js';
import { productBackground } from '@/core/product.js';
import { ordersApi } from '@/features/checkout/orders.api.js';
import { useAuthStore } from '@/stores/auth.js';
import { useCartStore } from '@/stores/cart.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const cart = useCartStore();
const ui = useUiStore();
const { loading, error, run } = useRequestState();

const paymentMethod = ref('credit_card');

// --- Cupom: o servidor calcula o desconto; o app só exibe o resultado da pré-visualização. ---
const couponInput = ref('');
const couponError = ref('');
const couponLoading = ref(false);
/** Resposta de /orders/preview (totais + couponCode) enquanto há cupom aplicado. */
const applied = ref(null);

const totals = computed(() => applied.value ?? cart.totals);
const cartItems = () =>
  cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity }));

async function applyCoupon() {
  const code = couponInput.value.trim();
  if (!code) return;

  couponLoading.value = true;
  couponError.value = '';
  try {
    applied.value = await ordersApi.preview({ items: cartItems(), couponCode: code });
    couponInput.value = '';
  } catch (caught) {
    applied.value = null;
    couponError.value = errorMessage(caught);
  } finally {
    couponLoading.value = false;
  }
}

const removeCoupon = () => {
  applied.value = null;
  couponError.value = '';
};

/** Carrinho mudou (ex.: preço/estoque atualizado): refaz a conta do cupom no servidor. */
async function revalidateCoupon() {
  if (!applied.value) return;
  try {
    applied.value = await ordersApi.preview({
      items: cartItems(),
      couponCode: applied.value.couponCode,
    });
  } catch (caught) {
    applied.value = null;
    couponError.value = errorMessage(caught);
  }
}

watch(() => cart.totals.subtotalCents, revalidateCoupon);
const addressOpen = ref(false);

onMounted(async () => {
  if (!cart.items.length) return router.replace({ name: 'cart' });

  try {
    if (await cart.refresh()) ui.showToast(t('cart.updated'));
  } catch {
    // Sem rede: o servidor revalida tudo ao confirmar.
  }
  if (!cart.items.length) router.replace({ name: 'cart' });
});

async function confirmPurchase() {
  const address = auth.profile?.address;
  if (!address) {
    ui.showToast(t('errors.ADDRESS_REQUIRED'));
    addressOpen.value = true;
    return;
  }

  const order = await run(() =>
    ordersApi.create({
      items: cart.items.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      paymentMethod: paymentMethod.value,
      address,
      couponCode: applied.value?.couponCode ?? undefined,
    }),
  );

  if (order) {
    cart.clear();
    auth.loadProfile().catch(() => {}); // atualiza a contagem de pedidos do perfil
    await router.replace({ name: 'order-done', params: { id: order.id }, query: { new: '1' } });
    return;
  }

  // Falhou (ex.: estoque acabou entre o carrinho e a confirmação): sincroniza e avisa.
  ui.showToast(error.value);
  revalidateCoupon(); // pode ter sido o cupom (esgotou/expirou) o motivo da falha
  cart.refresh().catch(() => {});
}
</script>

<template>
  <div>
    <AppHeader :title="t('checkout.title')" back :show-cart="false" />

    <section class="page-section">
      <span class="eyebrow">{{ t('checkout.address') }}</span>
      <div class="card row checkout__address">
        <span>📍</span>
        <div class="row__body">
          <b>{{ auth.user?.name }}</b>
          <div class="mono checkout__address-text">
            {{ auth.profile?.address || t('checkout.addressEmpty') }}
          </div>
        </div>
        <button
          type="button"
          class="icon-btn"
          :aria-label="t('checkout.editAddress')"
          @click="addressOpen = true"
        >
          ✎
        </button>
      </div>

      <span class="eyebrow">{{ t('checkout.summary') }}</span>
      <div class="card checkout__items">
        <div v-for="item in cart.items" :key="item.product.id" class="row">
          <div class="thumb" :style="productBackground(item.product)">
            <span v-if="!item.product.imageUrl">{{ item.product.emoji }}</span>
          </div>
          <div class="row__body">
            <div class="checkout__item-name">{{ item.product.name }}</div>
            <div class="mono checkout__qty">
              {{ t('checkout.quantity', { count: item.quantity }) }}
            </div>
          </div>
          <b class="mono">{{ formatMoney(effectiveCents(item.product) * item.quantity) }}</b>
        </div>
      </div>

      <span class="eyebrow">{{ t('coupon.title') }}</span>
      <div class="card checkout__coupon">
        <div v-if="applied?.couponCode" class="checkout__coupon-applied">
          <span>🏷️ {{ t('coupon.applied', { code: applied.couponCode }) }}</span>
          <button type="button" class="btn btn--outline" @click="removeCoupon">
            {{ t('coupon.remove') }}
          </button>
        </div>

        <form v-else class="checkout__coupon-form" novalidate @submit.prevent="applyCoupon">
          <input
            v-model="couponInput"
            class="input mono"
            autocapitalize="characters"
            autocomplete="off"
            maxlength="30"
            :placeholder="t('coupon.placeholder')"
            :aria-label="t('coupon.title')"
          />
          <button
            type="submit"
            class="btn btn--outline"
            :disabled="couponLoading || !couponInput.trim()"
          >
            {{ t('coupon.apply') }}
          </button>
        </form>

        <p class="error-text" role="alert">{{ couponError }}</p>
      </div>

      <OrderTotals :totals="totals" />

      <span class="eyebrow checkout__payment-label">{{ t('checkout.payment') }}</span>
      <div class="chips checkout__payment">
        <button
          v-for="method in PAYMENT_METHODS"
          :key="method"
          type="button"
          class="chip"
          :class="{ 'chip--active': paymentMethod === method }"
          @click="paymentMethod = method"
        >
          {{ t(`payment.${method}`) }}
        </button>
      </div>
      <p class="mono checkout__note">{{ t('checkout.simulated') }}</p>

      <p class="error-text" role="alert">{{ error }}</p>

      <button
        type="button"
        class="btn"
        :disabled="loading || !cart.items.length"
        @click="confirmPurchase"
      >
        {{ t('checkout.confirm', { total: formatMoney(totals.totalCents) }) }}
      </button>
    </section>

    <AddressSheet v-model:open="addressOpen" />
  </div>
</template>

<style scoped>
.checkout__address {
  margin: 8px 0 20px;
  border-bottom: 1px solid var(--line);
}

.checkout__address-text {
  font-size: 11px;
  color: var(--muted);
}

.checkout__items {
  margin: 8px 0 20px;
  padding-block: 4px;
}

.checkout__item-name {
  font-size: 12px;
  font-weight: 600;
}

.checkout__qty {
  font-size: 10px;
  color: var(--muted);
}

.checkout__payment-label {
  display: block;
  margin-top: 20px;
}

.checkout__payment {
  padding: 8px 0;
}

.checkout__note {
  margin-bottom: 20px;
  font-size: 10px;
  color: var(--muted);
}

.checkout__coupon {
  display: grid;
  gap: 8px;
}

.checkout__coupon-form,
.checkout__coupon-applied {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: space-between;
}

.checkout__coupon-form .input {
  flex: 1;
  min-width: 0;
}

.checkout__coupon-form .btn,
.checkout__coupon-applied .btn {
  width: auto;
  padding-inline: 14px;
}
</style>
