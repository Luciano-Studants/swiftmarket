<script setup>
import { COUPON_TYPES, MAX_COUPON_PERCENT, formatMoney } from '@swiftmarket/shared';
import { onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import ConfirmDialog from '@/components/ConfirmDialog.vue';
import PageHeader from '@/components/PageHeader.vue';
import PaginationBar from '@/components/PaginationBar.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import { PAGE_SIZE } from '@/core/config.js';
import { errorMessage } from '@/core/errors.js';
import { formatDate } from '@/core/format.js';
import { parseMoneyToCents } from '@/core/money.js';
import { couponsApi } from '@/features/coupons/coupons.api.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const ui = useUiStore();

const page = ref(1);
const coupons = ref([]);
const total = ref(0);
const totalPages = ref(1);
const loading = ref(true);
const error = ref('');

const toDelete = ref(null);
const busy = ref(false);

// --- Formulário de novo cupom ---
const emptyForm = () => ({
  code: '',
  type: COUPON_TYPES.PERCENT,
  value: '',
  minSubtotal: '',
  maxUses: '',
  expiresOn: '',
});
const form = reactive(emptyForm());
const formError = ref('');
const saving = ref(false);

async function load() {
  loading.value = true;
  error.value = '';
  try {
    const result = await couponsApi.list({ page: page.value, limit: PAGE_SIZE });
    coupons.value = result.items;
    total.value = result.total;
    totalPages.value = result.totalPages;
  } catch (caught) {
    error.value = errorMessage(caught);
  } finally {
    loading.value = false;
  }
}

const goToPage = (next) => {
  page.value = next;
  load();
};

/** Valida o formulário e monta o corpo da API (valores em centavos, data no fim do dia). */
function buildPayload() {
  const code = form.code.trim();
  if (!/^[A-Za-z0-9_-]{3,30}$/.test(code)) return { error: t('coupons.invalidCode') };

  let value;
  if (form.type === COUPON_TYPES.PERCENT) {
    value = Number(form.value);
    if (!Number.isInteger(value) || value < 1 || value > MAX_COUPON_PERCENT) {
      return { error: t('coupons.invalidPercent', { max: MAX_COUPON_PERCENT }) };
    }
  } else {
    value = parseMoneyToCents(form.value);
    if (!value || value < 1) return { error: t('coupons.invalidAmount') };
  }

  const minSubtotalCents = form.minSubtotal.trim() ? parseMoneyToCents(form.minSubtotal) : 0;
  if (minSubtotalCents === null) return { error: t('coupons.invalidAmount') };

  const maxUses = form.maxUses.trim() ? Number(form.maxUses) : null;
  if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
    return { error: t('coupons.invalidMaxUses') };
  }

  const expiresAt = form.expiresOn ? new Date(`${form.expiresOn}T23:59:59`).toISOString() : null;

  return {
    body: { code, type: form.type, value, minSubtotalCents, maxUses, expiresAt, active: true },
  };
}

async function create() {
  const { body, error: invalid } = buildPayload();
  formError.value = invalid ?? '';
  if (invalid) return;

  saving.value = true;
  try {
    await couponsApi.create(body);
    Object.assign(form, emptyForm());
    ui.showToast(t('coupons.created'));
    page.value = 1;
    await load();
  } catch (caught) {
    formError.value = errorMessage(caught);
  } finally {
    saving.value = false;
  }
}

/** Ativa/desativa mantendo os demais campos como estão. */
async function toggleActive(coupon) {
  try {
    await couponsApi.update(coupon.id, {
      type: coupon.type,
      value: coupon.value,
      minSubtotalCents: coupon.minSubtotalCents,
      maxUses: coupon.maxUses,
      expiresAt: coupon.expiresAt,
      active: !coupon.active,
    });
    await load();
  } catch (caught) {
    ui.showToast(errorMessage(caught));
  }
}

async function confirmDelete() {
  busy.value = true;
  try {
    await couponsApi.remove(toDelete.value.id);
    ui.showToast(t('coupons.deleted'));
    toDelete.value = null;
    await load();
  } catch (caught) {
    ui.showToast(errorMessage(caught));
    toDelete.value = null;
  } finally {
    busy.value = false;
  }
}

const discountLabel = (coupon) =>
  coupon.type === COUPON_TYPES.PERCENT ? `${coupon.value}%` : formatMoney(coupon.value);

function situation(coupon) {
  if (!coupon.active) return { tone: 'warning', key: 'inactive' };
  if (coupon.expired) return { tone: 'danger', key: 'expired' };
  if (coupon.maxUses !== null && coupon.uses >= coupon.maxUses) {
    return { tone: 'danger', key: 'exhausted' };
  }
  return { tone: 'success', key: 'active' };
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader :title="t('coupons.title')" :subtitle="t('coupons.subtitle')" />

    <form class="card coupon-form" novalidate @submit.prevent="create">
      <h3 class="card__title">{{ t('coupons.new') }}</h3>

      <div class="coupon-form__grid">
        <div class="field">
          <label for="c-code">{{ t('coupons.code') }}</label>
          <input
            id="c-code"
            v-model="form.code"
            class="input mono"
            maxlength="30"
            autocomplete="off"
          />
        </div>

        <div class="field">
          <label for="c-type">{{ t('coupons.type') }}</label>
          <select id="c-type" v-model="form.type" class="select">
            <option v-for="type in Object.values(COUPON_TYPES)" :key="type" :value="type">
              {{ t(`coupons.types.${type}`) }}
            </option>
          </select>
        </div>

        <div class="field">
          <label for="c-value">
            {{ form.type === 'percent' ? t('coupons.valuePercent') : t('coupons.valueMoney') }}
          </label>
          <input id="c-value" v-model="form.value" class="input" inputmode="decimal" />
        </div>

        <div class="field">
          <label for="c-min">{{ t('coupons.minSubtotal') }}</label>
          <input
            id="c-min"
            v-model="form.minSubtotal"
            class="input"
            inputmode="decimal"
            placeholder="0,00"
          />
        </div>

        <div class="field">
          <label for="c-max">{{ t('coupons.maxUses') }}</label>
          <input
            id="c-max"
            v-model="form.maxUses"
            class="input"
            inputmode="numeric"
            :placeholder="t('coupons.unlimited')"
          />
        </div>

        <div class="field">
          <label for="c-exp">{{ t('coupons.expiresOn') }}</label>
          <input id="c-exp" v-model="form.expiresOn" class="input" type="date" />
        </div>
      </div>

      <p v-if="formError" class="alert" role="alert">{{ formError }}</p>
      <button type="submit" class="btn" :disabled="saving">{{ t('coupons.create') }}</button>
    </form>

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
            <th>{{ t('coupons.code') }}</th>
            <th>{{ t('coupons.discount') }}</th>
            <th class="num">{{ t('coupons.minSubtotal') }}</th>
            <th class="num">{{ t('coupons.uses') }}</th>
            <th>{{ t('coupons.validUntil') }}</th>
            <th>{{ t('coupons.status') }}</th>
            <th class="num">{{ t('coupons.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="coupon in coupons" :key="coupon.id">
            <td class="mono">
              <b>{{ coupon.code }}</b>
            </td>
            <td>{{ discountLabel(coupon) }}</td>
            <td class="num">
              {{ coupon.minSubtotalCents ? formatMoney(coupon.minSubtotalCents) : '—' }}
            </td>
            <td class="num">
              {{ coupon.uses }}{{ coupon.maxUses !== null ? ` / ${coupon.maxUses}` : '' }}
            </td>
            <td>{{ coupon.expiresAt ? formatDate(coupon.expiresAt) : t('coupons.noExpiry') }}</td>
            <td>
              <StatusBadge
                :tone="situation(coupon).tone"
                :label="t(`coupons.state.${situation(coupon).key}`)"
              />
            </td>
            <td>
              <div class="row-actions">
                <button
                  type="button"
                  class="btn btn--outline btn--sm"
                  @click="toggleActive(coupon)"
                >
                  {{ coupon.active ? t('coupons.deactivate') : t('coupons.activate') }}
                </button>
                <button
                  type="button"
                  class="btn btn--outline btn--sm"
                  :disabled="coupon.uses > 0"
                  :title="coupon.uses > 0 ? t('coupons.cannotDelete') : ''"
                  @click="toDelete = coupon"
                >
                  {{ t('common.delete') }}
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!loading && !coupons.length">
            <td colspan="7" class="table-empty">{{ t('common.empty') }}</td>
          </tr>
        </tbody>
      </table>

      <div v-if="loading" class="spinner" role="progressbar"></div>
    </div>

    <PaginationBar :page="page" :total-pages="totalPages" :total="total" @change="goToPage" />

    <ConfirmDialog
      :open="Boolean(toDelete)"
      :title="t('coupons.confirmTitle')"
      :text="toDelete ? t('coupons.confirmText', { code: toDelete.code }) : ''"
      :busy="busy"
      @confirm="confirmDelete"
      @cancel="toDelete = null"
    />
  </div>
</template>

<style scoped>
.coupon-form {
  display: grid;
  gap: 12px;
  margin-bottom: 16px;
}

.coupon-form__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
</style>
