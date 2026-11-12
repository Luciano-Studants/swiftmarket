<script setup>
import { PASSWORD } from '@swiftmarket/shared';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import BrandMark from '@/components/BrandMark.vue';
import { useRequestState } from '@/composables/useRequestState.js';
import { SHOW_DEMO_HINT, SOCIAL_LOGIN_ENABLED } from '@/core/config.js';
import { errorMessage } from '@/core/errors.js';
import { authApi } from '@/features/auth/auth.api.js';
import { useAuthStore } from '@/stores/auth.js';
import { useFavoritesStore } from '@/stores/favorites.js';
import { useUiStore } from '@/stores/ui.js';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const favorites = useFavoritesStore();
const ui = useUiStore();
const { loading, error, run } = useRequestState();

const isRegister = ref(false);
const name = ref('');
const email = ref('');
const password = ref('');
const showPassword = ref(false);

function toggleMode() {
  isRegister.value = !isRegister.value;
  error.value = '';
}

/** Validação básica no aparelho; a API valida de novo (nunca confiamos só no cliente). */
function isFormValid() {
  const emailOk = email.value.includes('@');
  // O mínimo vale só para criar conta: contas antigas podem ter senha mais curta.
  const passwordOk = password.value.length >= (isRegister.value ? PASSWORD.MIN_LENGTH : 1);
  return emailOk && passwordOk && (!isRegister.value || name.value.trim().length >= 2);
}

async function finishLogin() {
  favorites.load().catch(() => {});
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : null;
  await router.replace(redirect ?? { name: 'home' });
}

async function submit() {
  if (!isFormValid()) {
    error.value = t('errors.VALIDATION_ERROR');
    return;
  }

  const email_ = email.value.trim();
  const done = await run(async () => {
    if (isRegister.value) await auth.register(name.value.trim(), email_, password.value);
    else await auth.login(email_, password.value);
    return true;
  });

  if (done) await finishLogin();
}

async function socialLogin(provider) {
  const done = await run(async () => {
    await auth.loginWithProvider(provider);
    return true;
  });
  if (done) await finishLogin();
}

/** A recuperação tem tela própria (e-mail -> código -> nova senha). */
const forgotPassword = () =>
  router.push({ name: 'forgot-password', query: { email: email.value.trim() || undefined } });
</script>

<template>
  <main class="login">
    <header class="login__hero">
      <div class="login__logo"><BrandMark :size="48" /></div>
      <div>
        <div class="login__brand mono">SwiftMarket</div>
        <div class="eyebrow">{{ t('auth.tagline') }}</div>
      </div>
    </header>

    <form class="card login__card" novalidate @submit.prevent="submit">
      <h2>{{ isRegister ? t('auth.registerTitle') : t('auth.loginTitle') }}</h2>
      <p class="mono login__subtitle">
        {{ isRegister ? t('auth.registerSubtitle') : t('auth.loginSubtitle') }}
      </p>

      <template v-if="isRegister">
        <label class="field-label" for="name">{{ t('auth.name') }}</label>
        <input
          id="name"
          v-model="name"
          class="input"
          autocomplete="name"
          :placeholder="t('auth.namePlaceholder')"
        />
      </template>

      <label class="field-label" for="email">{{ t('auth.email') }}</label>
      <input
        id="email"
        v-model="email"
        class="input"
        type="email"
        inputmode="email"
        autocomplete="email"
        autocapitalize="off"
        :placeholder="t('auth.emailPlaceholder')"
      />

      <label class="field-label" for="password">{{ t('auth.password') }}</label>
      <div class="login__password">
        <input
          id="password"
          v-model="password"
          class="input"
          :type="showPassword ? 'text' : 'password'"
          :autocomplete="isRegister ? 'new-password' : 'current-password'"
          placeholder="••••••••"
        />
        <button
          type="button"
          class="icon-btn login__eye"
          :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
          @click="showPassword = !showPassword"
        >
          {{ showPassword ? '🙈' : '👁' }}
        </button>
      </div>

      <p v-if="isRegister" class="field-hint">{{ t('auth.passwordHint') }}</p>

      <div class="login__forgot">
        <button v-if="!isRegister" type="button" class="link" @click="forgotPassword">
          {{ t('auth.forgot') }}
        </button>
      </div>

      <p class="error-text" role="alert">{{ error }}</p>

      <button type="submit" class="btn" :disabled="loading">
        {{ isRegister ? t('auth.createAccount') : t('auth.loginTitle') }}
      </button>

      <p class="mono login__switch">
        {{ isRegister ? t('auth.hasAccount') : t('auth.noAccount') }}
        <button type="button" class="link" @click="toggleMode">
          {{ isRegister ? t('auth.loginTitle') : t('auth.createAccount') }}
        </button>
      </p>
    </form>

    <section v-if="SOCIAL_LOGIN_ENABLED" class="login__social">
      <p class="eyebrow">{{ t('auth.or') }}</p>
      <div class="login__social-buttons">
        <button
          type="button"
          class="btn btn--outline"
          :disabled="loading"
          @click="socialLogin('google')"
        >
          {{ t('auth.google') }}
        </button>
        <button
          type="button"
          class="btn btn--outline"
          :disabled="loading"
          @click="socialLogin('apple')"
        >
          {{ t('auth.apple') }}
        </button>
      </div>
    </section>

    <p v-if="SHOW_DEMO_HINT" class="mono login__demo">
      {{ t('auth.demoHint') }}<br />
      admin@swiftmarket.com / admin123<br />
      john.doe@swiftmarket.io / user123
    </p>
  </main>
</template>

<style scoped>
.login__hero {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 16px;
  height: 230px;
  background: linear-gradient(var(--success-bg), var(--bg));
  text-align: center;
}

.login__logo {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--header-dark);
  color: var(--accent);
  font-size: 34px;
}

.login__brand {
  font-size: 30px;
  font-weight: 800;
}

.login__card {
  margin: 0 24px;
  padding: 24px;
}

.login__card h2 {
  font: 700 22px var(--font-sans);
  text-align: center;
}

.login__subtitle {
  font-size: 11px;
  text-align: center;
  color: var(--muted);
}

.login__password {
  position: relative;
}

.login__eye {
  position: absolute;
  top: 3px;
  right: 0;
  font-size: 15px;
}

.login__forgot {
  min-height: 18px;
  margin: 6px 0 10px;
  text-align: right;
}

.link {
  border: 0;
  background: none;
  color: var(--text);
  font-size: 11px;
  font-weight: 700;
}

.login__switch {
  margin-top: 20px;
  font-size: 11px;
  text-align: center;
  color: var(--muted);
}

.login__social {
  padding: 24px;
  text-align: center;
}

.login__social-buttons {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.login__demo {
  padding: 0 24px 24px;
  font-size: 10px;
  text-align: center;
  color: var(--muted);
}
</style>
