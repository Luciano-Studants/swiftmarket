<script setup>
import BrandMark from '@/components/BrandMark.vue';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import { useRequestState } from '@/composables/useRequestState.js';
import { useAuthStore } from '@/stores/auth.js';

const { t } = useI18n();
const router = useRouter();
const auth = useAuthStore();
const { loading, error, run } = useRequestState();

const email = ref('');
const password = ref('');
const showPassword = ref(false);

/** Dica com a conta demo: só aparece em desenvolvimento, nunca no build de produção. */
const showDemoHint = import.meta.env.DEV;

async function submit() {
  if (!email.value.includes('@') || !password.value) {
    error.value = t('errors.VALIDATION_ERROR');
    return;
  }

  const done = await run(async () => {
    await auth.login(email.value.trim(), password.value);
    return true;
  });

  if (done) await router.replace({ name: 'dashboard' });
}
</script>

<template>
  <main class="login">
    <form class="card login__card" novalidate @submit.prevent="submit">
      <div class="login__logo" aria-hidden="true"><BrandMark :size="38" /></div>
      <h1 class="login__brand mono">SwiftMarket</h1>
      <h2 class="login__title">{{ t('auth.title') }}</h2>
      <p class="login__subtitle">{{ t('auth.subtitle') }}</p>

      <div class="field">
        <label for="email">{{ t('auth.email') }}</label>
        <input
          id="email"
          v-model="email"
          class="input"
          type="email"
          autocomplete="username"
          autocapitalize="off"
          :placeholder="t('auth.emailPlaceholder')"
        />
      </div>

      <div class="field">
        <label for="password">{{ t('auth.password') }}</label>
        <div class="login__password">
          <input
            id="password"
            v-model="password"
            class="input"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
          />
          <button
            type="button"
            class="login__eye"
            :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
            @click="showPassword = !showPassword"
          >
            {{ showPassword ? '🙈' : '👁' }}
          </button>
        </div>
      </div>

      <p v-if="error" class="alert" role="alert">{{ error }}</p>

      <button type="submit" class="btn login__submit" :disabled="loading">
        {{ t('auth.submit') }}
      </button>

      <p v-if="showDemoHint" class="login__demo mono">
        {{ t('auth.demoHint') }}<br />admin@swiftmarket.com / admin123
      </p>
    </form>
  </main>
</template>

<style scoped>
.login {
  display: grid;
  place-items: center;
  min-height: 100vh;
  padding: 24px 16px;
  background: linear-gradient(var(--success-bg), var(--bg) 60%);
}

.login__card {
  width: 100%;
  max-width: 400px;
  padding: 32px 28px;
}

.login__logo {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin: 0 auto 12px;
  border: 1px solid var(--accent);
  border-radius: var(--radius-sm);
  background: var(--header-dark);
  color: var(--accent);
  font-size: 26px;
}

.login__brand {
  font-size: 22px;
  font-weight: 800;
  text-align: center;
}

.login__title {
  margin-top: 16px;
  font: 700 18px var(--font-sans);
  text-align: center;
}

.login__subtitle {
  margin-bottom: 20px;
  font-size: 13px;
  text-align: center;
  color: var(--muted);
}

.login__password {
  position: relative;
}

.login__eye {
  position: absolute;
  top: 50%;
  right: 8px;
  padding: 4px;
  border: 0;
  background: none;
  transform: translateY(-50%);
}

.login__submit {
  width: 100%;
  padding: 12px;
}

.login__demo {
  margin-top: 16px;
  font-size: 11px;
  text-align: center;
  color: var(--muted);
}
</style>
