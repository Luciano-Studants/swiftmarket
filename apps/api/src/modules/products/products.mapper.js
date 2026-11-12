import { toIso } from '../../core/dates.js';

/** Linha do banco -> DTO público (camelCase). */
export const toProductDto = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category,
  priceCents: row.price_cents,
  promoCents: row.promo_cents,
  stock: row.stock,
  emoji: row.emoji,
  hue: row.hue,
  imageUrl: row.image_url,
  status: row.status,
  featured: Boolean(row.featured),
  recommended: Boolean(row.recommended),
  rating: row.rating, // média das avaliações visíveis; 0 = ainda sem avaliações
  ratingCount: row.rating_count,
  createdAt: toIso(row.created_at),
});
