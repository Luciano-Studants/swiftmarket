/**
 * Constantes de domínio compartilhadas entre API, app do cliente e painel admin.
 * Os valores são chaves estáveis (slugs); os rótulos em pt-BR ficam no i18n de cada app.
 */

export const ROLES = Object.freeze({
  USER: 'user',
  ADMIN: 'admin',
});

export const CATEGORIES = Object.freeze(['electronics', 'fashion', 'home', 'beauty', 'toys']);

export const CATEGORY_EMOJI = Object.freeze({
  electronics: '🎧',
  fashion: '👕',
  home: '🏠',
  beauty: '💄',
  toys: '🧸',
});

export const PRODUCT_STATUS = Object.freeze({
  ACTIVE: 'active',
  DRAFT: 'draft',
  OUT_OF_STOCK: 'out_of_stock',
});

export const PAYMENT_METHODS = Object.freeze(['credit_card', 'debit_card', 'pix']);

export const ORDER_STATUS = Object.freeze({
  CONFIRMED: 'confirmed',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
});

/**
 * Máquina de estados do pedido: de -> próximos status permitidos.
 * "delivered" e "cancelled" são finais. Cancelar só antes do envio (devolução/estorno
 * pós-envio está fora do escopo e exigiria pagamento real).
 */
export const ORDER_TRANSITIONS = Object.freeze({
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
});

export const canTransition = (from, to) => ORDER_TRANSITIONS[from]?.includes(to) ?? false;

export const SOCIAL_PROVIDERS = Object.freeze(['google', 'apple']);

/** Regras comerciais (valores em centavos). */
export const REVIEW = Object.freeze({
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_COMMENT_LENGTH: 500,
  STATUS: Object.freeze({ VISIBLE: 'visible', HIDDEN: 'hidden' }),
});

export const COUPON_TYPES = Object.freeze({ PERCENT: 'percent', FIXED: 'fixed' });
export const MAX_COUPON_PERCENT = 90;

export const NOTIFICATION_TYPES = Object.freeze({ ORDER_STATUS: 'order_status' });

/** Regra de senha (bcrypt só considera os 72 primeiros bytes). */
export const PASSWORD = Object.freeze({ MIN_LENGTH: 8, MAX_LENGTH: 72 });

export const COMMERCE = Object.freeze({
  CURRENCY: 'BRL',
  LOCALE: 'pt-BR',
  TAX_RATE: 0.085,
  SHIPPING_CENTS: 1200,
  FREE_SHIPPING_FROM_CENTS: 50000,
  LOW_STOCK_THRESHOLD: 10,
  MAX_QTY_PER_ITEM: 99,
});

export const DEFAULT_PREFERENCES = Object.freeze({
  notifyOrders: true,
  notifyPromos: false,
  personalizedRecs: true,
  shareAnalytics: false,
});
