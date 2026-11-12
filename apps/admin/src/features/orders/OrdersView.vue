<script setup>
import { ORDER_STATUS, ORDER_TRANSITIONS, formatMoney } from '@swiftmarket/shared';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import PageHeader from '@/components/PageHeader.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import { PAGE_SIZE } from '@/core/config.js';
import { errorMessage } from '@/core/errors.js';
import { formatDateTime } from '@/core/format.js';
import { ordersApi } from '@/features/orders/orders.api.js';
import { useUiStore } from '@/stores/ui.js';

const STATUSES = Object.values(ORDER_STATUS);

const { t } = useI18n();
const ui = useUiStore();

const status = ref('');
const page = ref(1);
const orders = ref([]);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(true);
const error = ref('');

/** Pedido com os detalhes abertos (um por vez). */
const expandedId = ref(null);
/** Pedidos cuja situação está sendo salva (desabilita o select). */
const savingIds = ref(new Set());

let requestId = 0;

async function load() {
  const current = ++requestId;
  loading.value = true;
  error.value = '';

  try {
    const result = await ordersApi.list({
      status: status.value || undefined,
      page: page.value,
      limit: PAGE_SIZE,
    });
    if (current !== requestId) return;

    orders.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (caught) {
    if (current === requestId) error.value = errorMessage(caught);
  } finally {
    if (current === requestId) loading.value = false;
  }
}

function filterBy(next) {
  status.value = next;
  page.value = 1;
  expandedId.value = null;
  load();
}

function goToPage(next) {
  page.value = next;
  expandedId.value = null;
  load();
}

const toggle = (id) => {
  expandedId.value = expandedId.value === id ? null : id;
};

async function changeStatus(order, event) {
  const next = event.target.value;
  const previous = order.status;
  if (next === previous) return;

  savingIds.value = new Set(savingIds.value).add(order.id);
  try {
    const updated = await ordersApi.updateStatus(order.id, next);
    // Mescla o pedido inteiro (status + histórico); `customer` não vem na resposta e é mantido.
    Object.assign(order, updated);
    ui.showToast(t('orders.statusUpdated'));
    // Com filtro ativo, o pedido pode deixar de pertencer à lista atual.
    if (status.value) await load();
  } catch (caught) {
    event.target.value = previous; // desfaz a seleção visual
    ui.showToast(errorMessage(caught));
  } finally {
    const rest = new Set(savingIds.value);
    rest.delete(order.id);
    savingIds.value = rest;
  }
}

/** Situação atual + só as próximas permitidas (a API valida de novo). */
const statusOptions = (order) => [order.status, ...(ORDER_TRANSITIONS[order.status] ?? [])];

const itemsCount = (order) => order.items.reduce((sum, item) => sum + item.quantity, 0);

onMounted(load);
</script>

<template>
  <div>
    <PageHeader :title="t('orders.title')" :subtitle="t('orders.subtitle')" />

    <div class="toolbar">
      <div class="chips" role="group" :aria-label="t('orders.colStatus')">
        <button
          type="button"
          class="chip"
          :class="{ 'chip--active': status === '' }"
          :aria-pressed="status === ''"
          @click="filterBy('')"
        >
          {{ t('common.all') }}
        </button>
        <button
          v-for="item in STATUSES"
          :key="item"
          type="button"
          class="chip"
          :class="{ 'chip--active': status === item }"
          :aria-pressed="status === item"
          @click="filterBy(item)"
        >
          {{ t(`orders.status.${item}`) }}
        </button>
      </div>
    </div>

    <p v-if="error" class="alert" role="alert">
      {{ error }}
      <button type="button" class="btn btn--outline btn--sm" @click="load">
        {{ t('common.retry') }}
      </button>
    </p>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>{{ t('orders.colOrder') }}</th>
            <th>{{ t('orders.colCustomer') }}</th>
            <th>{{ t('orders.colDate') }}</th>
            <th class="num">{{ t('orders.colItems') }}</th>
            <th class="num">{{ t('orders.colTotal') }}</th>
            <th>{{ t('orders.colStatus') }}</th>
            <th class="num">{{ t('orders.details') }}</th>
          </tr>
        </thead>

        <tbody v-for="order in orders" :key="order.id">
          <tr>
            <td class="mono">
              <b>{{ order.id }}</b>
            </td>
            <td>
              <div>{{ order.customer?.name }}</div>
              <div class="muted order-email mono">{{ order.customer?.email }}</div>
            </td>
            <td>{{ formatDateTime(order.createdAt) }}</td>
            <td class="num">{{ itemsCount(order) }}</td>
            <td class="num">{{ formatMoney(order.totalCents) }}</td>
            <td>
              <select
                class="select order-status"
                :value="order.status"
                :disabled="savingIds.has(order.id) || !ORDER_TRANSITIONS[order.status]?.length"
                :aria-label="`${t('orders.colStatus')} ${order.id}`"
                @change="changeStatus(order, $event)"
              >
                <option v-for="item in statusOptions(order)" :key="item" :value="item">
                  {{ t(`orders.status.${item}`) }}
                </option>
              </select>
            </td>
            <td>
              <div class="row-actions">
                <button
                  type="button"
                  class="btn btn--outline btn--sm"
                  :aria-expanded="expandedId === order.id"
                  @click="toggle(order.id)"
                >
                  {{ expandedId === order.id ? '−' : '+' }} {{ t('orders.details') }}
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="expandedId === order.id" class="order-detail">
            <td colspan="7">
              <div class="order-detail__grid">
                <div>
                  <span class="field-label">{{ t('orders.colItems') }}</span>
                  <ul class="order-detail__items">
                    <li v-for="item in order.items" :key="`${item.productId}-${item.name}`">
                      <span>{{ item.quantity }}× {{ item.name }}</span>
                      <span class="mono">{{ formatMoney(item.unitCents * item.quantity) }}</span>
                    </li>
                  </ul>
                </div>

                <div>
                  <span class="field-label">{{ t('orders.address') }}</span>
                  <p>{{ order.address }}</p>

                  <span class="field-label order-detail__label">{{ t('orders.colPayment') }}</span>
                  <p>{{ t(`orders.payment.${order.paymentMethod}`) }}</p>

                  <span class="field-label order-detail__label">{{ t('orders.history') }}</span>
                  <ul class="order-detail__history">
                    <li v-for="event in order.history" :key="`${event.status}-${event.at}`">
                      {{ t(`orders.status.${event.status}`) }} ·
                      <span class="muted mono">{{ formatDateTime(event.at) }}</span>
                    </li>
                  </ul>
                </div>

                <div class="order-detail__totals mono">
                  <div>
                    <span>{{ t('orders.subtotal') }}</span>
                    <span>{{ formatMoney(order.subtotalCents) }}</span>
                  </div>
                  <div v-if="order.discountCents">
                    <span>{{ t('orders.discount') }} ({{ order.couponCode }})</span>
                    <span>−{{ formatMoney(order.discountCents) }}</span>
                  </div>
                  <div>
                    <span>{{ t('orders.shipping') }}</span>
                    <span>
                      {{
                        order.shippingCents ? formatMoney(order.shippingCents) : t('orders.free')
                      }}
                    </span>
                  </div>
                  <div>
                    <span>{{ t('orders.tax') }}</span>
                    <span>{{ formatMoney(order.taxCents) }}</span>
                  </div>
                  <div class="order-detail__total">
                    <span>{{ t('orders.total') }}</span>
                    <span>{{ formatMoney(order.totalCents) }}</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
        </tbody>

        <tbody v-if="!loading && !orders.length">
          <tr>
            <td colspan="7" class="table-empty">{{ t('common.empty') }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="spinner" role="progressbar"></div>
    </div>

    <PaginationBar :page="page" :total-pages="totalPages" :total="total" @change="goToPage" />
  </div>
</template>

<style scoped>
.order-email {
  font-size: 11px;
}

.order-status {
  width: auto;
  padding: 6px 8px;
}

.order-detail td {
  background: color-mix(in srgb, var(--accent) 4%, transparent);
}

.order-detail__grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 24px;
  padding: 8px 0;
}

.order-detail__items {
  display: grid;
  gap: 4px;
  padding: 0;
  margin-top: 6px;
  list-style: none;
}

.order-detail__items li,
.order-detail__totals > div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.order-detail__history {
  display: grid;
  gap: 2px;
  padding: 0;
  margin: 4px 0 0;
  list-style: none;
  font-size: 13px;
}

.order-detail__label {
  display: block;
  margin-top: 12px;
}

.order-detail__totals {
  display: grid;
  align-content: start;
  gap: 4px;
  font-size: 13px;
}

.order-detail__total {
  padding-top: 6px;
  border-top: 1px solid var(--line);
  font-weight: 700;
}

@media (max-width: 900px) {
  .order-detail__grid {
    grid-template-columns: 1fr;
  }
}
</style>
