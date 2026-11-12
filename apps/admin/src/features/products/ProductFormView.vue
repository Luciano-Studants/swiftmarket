<script setup>
import { CATEGORIES, PRODUCT_STATUS } from '@swiftmarket/shared';
import { computed, onMounted, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import PageHeader from '@/components/PageHeader.vue';
import { useRequestState } from '@/composables/useRequestState.js';
import { assetUrl } from '@/core/config.js';
import { errorMessage } from '@/core/errors.js';
import { productsApi } from '@/features/products/products.api.js';
import {
  IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  buildPayload,
  emptyForm,
  formFromProduct,
} from '@/features/products/productForm.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const ui = useUiStore();
const { loading: saving, error: saveError, run } = useRequestState();

const productId = computed(() => (route.params.id ? Number(route.params.id) : null));
const isEdit = computed(() => productId.value !== null);

const form = reactive(emptyForm());
const fieldErrors = ref({});
const loadingProduct = ref(isEdit.value);
const loadError = ref('');

const uploading = ref(false);
const imageError = ref('');
const fileInput = ref(null);

onMounted(async () => {
  if (!isEdit.value) return;

  try {
    Object.assign(form, formFromProduct(await productsApi.get(productId.value)));
  } catch (caught) {
    loadError.value = errorMessage(caught);
  } finally {
    loadingProduct.value = false;
  }
});

/** Valida tipo e tamanho no navegador e envia a imagem (a API valida de novo). */
async function onImageSelected(event) {
  const file = event.target.files?.[0];
  event.target.value = ''; // permite escolher o mesmo arquivo de novo
  if (!file) return;

  imageError.value = '';
  if (!IMAGE_TYPES.includes(file.type)) {
    imageError.value = t('products.form.errors.imageType');
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    imageError.value = t('products.form.errors.imageSize');
    return;
  }

  uploading.value = true;
  try {
    form.imageUrl = (await productsApi.uploadImage(file)).url;
  } catch (caught) {
    imageError.value = errorMessage(caught);
  } finally {
    uploading.value = false;
  }
}

async function submit() {
  const { body, errors } = buildPayload(form);
  fieldErrors.value = errors;
  if (!body) return;

  const saved = await run(() =>
    isEdit.value ? productsApi.update(productId.value, body) : productsApi.create(body),
  );
  if (!saved) return;

  ui.showToast(isEdit.value ? t('products.saved') : t('products.created'));
  await router.replace({ name: 'products' });
}
</script>

<template>
  <div>
    <PageHeader :title="isEdit ? t('products.form.editTitle') : t('products.form.newTitle')">
      <RouterLink :to="{ name: 'products' }" class="btn btn--outline">
        ← {{ t('common.back') }}
      </RouterLink>
    </PageHeader>

    <div v-if="loadingProduct" class="spinner" role="progressbar"></div>
    <p v-else-if="loadError" class="alert" role="alert">{{ loadError }}</p>

    <form v-else class="card product-form" novalidate @submit.prevent="submit">
      <div class="form-grid">
        <div class="field field--full">
          <label for="name">{{ t('products.form.name') }}</label>
          <input
            id="name"
            v-model="form.name"
            class="input"
            maxlength="120"
            :aria-invalid="Boolean(fieldErrors.name)"
          />
          <span v-if="fieldErrors.name" class="field-error" role="alert">
            {{ t('products.form.errors.name') }}
          </span>
        </div>

        <div class="field field--full">
          <label for="description">{{ t('products.form.description') }}</label>
          <textarea
            id="description"
            v-model="form.description"
            class="textarea"
            maxlength="2000"
          ></textarea>
        </div>

        <div class="field">
          <label for="category">{{ t('products.form.category') }}</label>
          <select id="category" v-model="form.category" class="select">
            <option v-for="item in CATEGORIES" :key="item" :value="item">
              {{ t(`categories.${item}`) }}
            </option>
          </select>
        </div>

        <div class="field">
          <label for="status">{{ t('products.form.status') }}</label>
          <select id="status" v-model="form.status" class="select">
            <option v-for="item in Object.values(PRODUCT_STATUS)" :key="item" :value="item">
              {{ t(`products.status.${item}`) }}
            </option>
          </select>
        </div>

        <div class="field">
          <label for="price">{{ t('products.form.price') }}</label>
          <input
            id="price"
            v-model="form.price"
            class="input mono"
            inputmode="decimal"
            placeholder="0,00"
            :aria-invalid="Boolean(fieldErrors.price)"
          />
          <span v-if="fieldErrors.price" class="field-error" role="alert">
            {{ t('products.form.errors.price') }}
          </span>
        </div>

        <div class="field">
          <label for="promo">{{ t('products.form.promo') }}</label>
          <input
            id="promo"
            v-model="form.promo"
            class="input mono"
            inputmode="decimal"
            placeholder="0,00"
            :aria-invalid="Boolean(fieldErrors.promo)"
          />
          <span v-if="fieldErrors.promo" class="field-error" role="alert">
            {{ t('products.form.errors.promo') }}
          </span>
          <span v-else class="field-hint">{{ t('products.form.promoHint') }}</span>
        </div>

        <div class="field">
          <label for="stock">{{ t('products.form.stock') }}</label>
          <input
            id="stock"
            v-model="form.stock"
            class="input mono"
            inputmode="numeric"
            :aria-invalid="Boolean(fieldErrors.stock)"
          />
          <span v-if="fieldErrors.stock" class="field-error" role="alert">
            {{ t('products.form.errors.stock') }}
          </span>
        </div>

        <div class="field">
          <span class="field-label">&nbsp;</span>
          <label class="check">
            <input v-model="form.featured" type="checkbox" />
            {{ t('products.form.featured') }}
          </label>
          <label class="check">
            <input v-model="form.recommended" type="checkbox" />
            {{ t('products.form.recommended') }}
          </label>
        </div>

        <div class="field field--full">
          <span class="field-label">{{ t('products.form.image') }}</span>

          <div class="image-box">
            <img
              v-if="form.imageUrl"
              :src="assetUrl(form.imageUrl)"
              :alt="form.name"
              class="image-box__preview"
            />

            <div class="image-box__actions">
              <input
                ref="fileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="sr-only"
                :aria-label="t('products.form.chooseImage')"
                @change="onImageSelected"
              />
              <button
                type="button"
                class="btn btn--outline btn--sm"
                :disabled="uploading"
                @click="fileInput.click()"
              >
                {{ uploading ? t('products.form.uploading') : t('products.form.chooseImage') }}
              </button>
              <button
                v-if="form.imageUrl"
                type="button"
                class="btn btn--danger btn--sm"
                @click="form.imageUrl = null"
              >
                {{ t('products.form.removeImage') }}
              </button>
            </div>
          </div>

          <span v-if="imageError" class="field-error" role="alert">{{ imageError }}</span>
          <span v-else class="field-hint">{{ t('products.form.imageHint') }}</span>
        </div>
      </div>

      <p v-if="saveError" class="alert" role="alert">{{ saveError }}</p>

      <div class="product-form__actions">
        <RouterLink :to="{ name: 'products' }" class="btn btn--outline">
          {{ t('common.cancel') }}
        </RouterLink>
        <button type="submit" class="btn" :disabled="saving || uploading">
          {{ t('common.save') }}
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.product-form {
  max-width: 820px;
}

.product-form__actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}

.image-box {
  display: flex;
  align-items: center;
  gap: 16px;
}

.image-box__preview {
  width: 96px;
  height: 96px;
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  object-fit: cover;
}

.image-box__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>
