import { ref } from 'vue';

import { errorMessage } from '@/core/errors.js';

/**
 * Controla loading + erro de uma chamada assíncrona.
 *   const { loading, error, run } = useRequestState();
 *   const data = await run(() => api.something());   // resultado, ou `undefined` se falhar
 */
export function useRequestState() {
  const loading = ref(false);
  const error = ref('');

  async function run(task) {
    loading.value = true;
    error.value = '';

    try {
      return await task();
    } catch (caught) {
      error.value = errorMessage(caught);
      return undefined;
    } finally {
      loading.value = false;
    }
  }

  return { loading, error, run };
}
