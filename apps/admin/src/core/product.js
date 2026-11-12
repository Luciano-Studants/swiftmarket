import { COMMERCE, PRODUCT_STATUS } from '@swiftmarket/shared';

/** Tom do selo de situação do produto. */
export const statusTone = (status) =>
  ({
    [PRODUCT_STATUS.ACTIVE]: 'success',
    [PRODUCT_STATUS.DRAFT]: 'neutral',
    [PRODUCT_STATUS.OUT_OF_STOCK]: 'danger',
  })[status] ?? 'neutral';

/** Estoque baixo (mesma regra do painel e da API). */
export const isLowStock = (stock) => stock <= COMMERCE.LOW_STOCK_THRESHOLD;
