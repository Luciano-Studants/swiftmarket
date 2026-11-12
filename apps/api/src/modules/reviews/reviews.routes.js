import { parse } from '../../core/validate.js';
import {
  adminReviewsQuery,
  moderationBody,
  pageQuery,
  productIdParams,
  productParams,
  reviewBody,
  reviewIdParams,
} from './reviews.schema.js';
import * as reviewsService from './reviews.service.js';

/** Público, sob /products: lista de avaliações visíveis + resumo (média e distribuição). */
export async function publicReviewRoutes(app) {
  app.get('/:id/reviews', async (request) => {
    const { id } = parse(productIdParams, request.params);
    return reviewsService.listProductReviews(app.db, id, parse(pageQuery, request.query));
  });
}

/** Cliente, sob /me/reviews: a avaliação do próprio usuário. */
export async function myReviewRoutes(app) {
  app.get('/:productId', async (request) => {
    const { productId } = parse(productParams, request.params);
    return reviewsService.getMyReview(app.db, request.currentUser.id, productId);
  });

  app.put('/:productId', async (request) => {
    const { productId } = parse(productParams, request.params);
    const body = parse(reviewBody, request.body);
    return reviewsService.saveMyReview(app.db, request.currentUser.id, productId, body);
  });

  app.delete('/:productId', async (request, reply) => {
    const { productId } = parse(productParams, request.params);
    reviewsService.deleteMyReview(app.db, request.currentUser.id, productId);
    return reply.status(204).send();
  });
}

/** Admin, sob /admin/reviews: moderação (ocultar/mostrar). */
export async function adminReviewRoutes(app) {
  app.get('/', async (request) =>
    reviewsService.listAllReviews(app.db, parse(adminReviewsQuery, request.query)),
  );

  app.patch('/:id', async (request) => {
    const { id } = parse(reviewIdParams, request.params);
    const { status } = parse(moderationBody, request.body);
    return reviewsService.moderateReview(app.db, id, status);
  });
}
