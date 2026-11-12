<script setup>
import { formatMoney } from '@swiftmarket/shared';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import AppHeader from '@/components/AppHeader.vue';
import OrderTotals from '@/components/OrderTotals.vue';
import { errorMessage } from '@/core/errors.js';
import { formatDateTime } from '@/core/format.js';
import { ordersApi } from '@/features/checkout/orders.api.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const route = useRoute();
const ui = useUiStore();

const order = ref(null);
const error = ref('');
const loading = ref(true);
const confirmingCancel = ref(false);
const cancelling = ref(false);
const cancelError = ref('');

/** Só dá para cancelar antes do envio (regra espelhada do servidor, que é quem decide). */
const canCancel = computed(() => order.value?.status === 'confirmed');

async function cancelOrder() {
  cancelling.value = true;
  cancelError.value = '';

  try {
    order.value = await ordersApi.cancel(order.value.id);
    confirmingCancel.value = false;
    ui.showToast(t('order.cancelled'));
  } catch (caught) {
    cancelError.value = errorMessage(caught);
  } finally {
    cancelling.value = false;
  }
}

/** Logo após a compra mostra a confirmação; ao abrir pelo histórico, mostra só o detalhe. */
const justPurchased = computed(() => route.query.new === '1');

onMounted(async () => {
  try {
    order.value = await ordersApi.get(route.params.id);
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <div>
    <AppHeader
      :title="justPurchased ? t('order.done') : t('order.detailTitle')"
      :back="!justPurchased"
      :show-cart="false"
    />

    <div v-if="loading" class="spinner" role="progressbar"></div>
    <p v-else-if="error" class="error-text" role="alert">{{ error }}</p>

    <section v-else-if="order" class="page-section order">
      <div v-if="justPurchased" class="order__check">✅</div>
      <h2 v-if="justPurchased">{{ t('order.done') }}</h2>

      <p class="mono order__id">
        {{ t('order.number', { id: order.id }) }} · {{ t(`payment.${order.paymentMethod}`) }}
      </p>
      <span class="badge" :class="{ 'badge--danger': order.status === 'cancelled' }">
        {{ t(`order.status.${order.status}`).toUpperCase() }}
      </span>

      <ol class="order__timeline" :aria-label="t('order.timeline')">
        <li v-for="event in order.history" :key="`${event.status}-${event.at}`">
          <b>{{ t(`order.status.${event.status}`) }}</b>
          <span class="mono">{{ formatDateTime(event.at) }}</span>
        </li>
      </ol>

      <div class="card order__items">
        <div
          v-for="item in order.items"
          :key="`${item.productId}-${item.name}`"
          class="summary-row"
        >
          <span>{{ item.quantity }}× {{ item.name }}</span>
          <span>
            <RouterLink
              v-if="order.status === 'delivered' && item.productId"
              :to="{ name: 'product', params: { id: item.productId } }"
              class="order__review"
            >
              {{ t('reviews.rate') }}
            </RouterLink>
            {{ formatMoney(item.unitCents * item.quantity) }}
          </span>
        </div>
      </div>

      <OrderTotals :totals="order" />

      <div v-if="canCancel" class="order__cancel">
        <button
          v-if="!confirmingCancel"
          type="button"
          class="btn btn--outline order__danger"
          @click="confirmingCancel = true"
        >
          {{ t('order.cancel') }}
        </button>

        <div v-else class="card order__confirm" role="alertdialog">
          <p>{{ t('order.cancelAsk') }}</p>
          <p v-if="cancelError" class="error-text" role="alert">{{ cancelError }}</p>
          <button
            type="button"
            class="btn order__danger-solid"
            :disabled="cancelling"
            @click="cancelOrder"
          >
            {{ t('order.cancelConfirm') }}
          </button>
          <button
            type="button"
            class="btn btn--outline"
            :disabled="cancelling"
            @click="confirmingCancel = false"
          >
            {{ t('order.cancelKeep') }}
          </button>
        </div>
      </div>

      <div class="order__actions">
        <RouterLink :to="{ name: 'home' }" class="btn">{{ t('order.backHome') }}</RouterLink>
        <RouterLink :to="{ name: 'orders' }" class="btn btn--outline">
          {{ t('order.viewOrders') }}
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.order {
  text-align: center;
}

.order__check {
  font-size: 56px;
}

.order__id {
  margin: 8px 0;
  font-size: 12px;
  color: var(--muted);
}

.order__timeline {
  display: grid;
  gap: 4px;
  padding: 0;
  margin: 14px 0 0;
  list-style: none;
  font-size: 12px;
}

.order__timeline li {
  display: flex;
  justify-content: space-between;
  padding: 6px 10px;
  border-radius: var(--radius-md);
  background: var(--surface);
}

.order__timeline span {
  color: var(--muted);
}

.order__cancel {
  margin-top: 20px;
}

.order__confirm {
  display: grid;
  gap: 10px;
  padding: 14px;
  text-align: left;
}

.order__danger {
  width: 100%;
  border-color: var(--danger);
  color: var(--danger);
}

.order__danger-solid {
  background: var(--danger);
}

.order__review {
  margin-right: 8px;
  font-size: 11px;
  font-weight: 700;
  text-decoration: underline;
}

.order__items {
  margin: 20px 0 12px;
  text-align: left;
}

.order__actions {
  display: grid;
  gap: 10px;
  margin-top: 24px;
}

.order__actions .btn {
  text-align: center;
}
</style>
