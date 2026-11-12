import { assetUrl } from './config.js';

/** Estilo de fundo do produto: foto enviada ou gradiente derivado do `hue`. */
export function productBackground(product) {
  const image = assetUrl(product.imageUrl);
  if (image) return { backgroundImage: `url(${image})` };

  return {
    background: `linear-gradient(135deg, hsl(${product.hue} 70% 86%), hsl(${product.hue} 60% 66%))`,
  };
}

/** Produto pode ser comprado agora? */
export const isAvailable = (product) => product.status === 'active' && product.stock > 0;

export const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
