import authRoutes from './modules/auth/auth.routes.js';
import adminCouponRoutes from './modules/coupons/coupons.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import favoritesRoutes from './modules/favorites/favorites.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import {
  adminOrderRoutes,
  customerOrderRoutes,
  myOrderRoutes,
} from './modules/orders/orders.routes.js';
import { adminProductRoutes, publicProductRoutes } from './modules/products/products.routes.js';
import {
  adminReviewRoutes,
  myReviewRoutes,
  publicReviewRoutes,
} from './modules/reviews/reviews.routes.js';
import uploadRoutes from './modules/uploads/uploads.routes.js';
import { adminUserRoutes, meRoutes } from './modules/users/users.routes.js';

/**
 * Mapa único de rotas, agrupado por nível de acesso:
 *   público   -> /auth, /products
 *   cliente   -> /me/*, /orders        (JWT válido)
 *   admin     -> /admin/*              (JWT válido + papel admin)
 *
 * O controle de acesso é um hook `onRequest` por grupo: nenhuma rota protegida
 * depende de o desenvolvedor lembrar de chamar a checagem.
 */
export async function registerRoutes(api) {
  // --- Público ---
  api.register(authRoutes, { prefix: '/auth' });
  api.register(publicProductRoutes, { prefix: '/products' });
  api.register(publicReviewRoutes, { prefix: '/products' });

  // --- Cliente autenticado ---
  api.register(async (customer) => {
    customer.addHook('onRequest', customer.authenticate);

    customer.register(meRoutes, { prefix: '/me' });
    customer.register(favoritesRoutes, { prefix: '/me/favorites' });
    customer.register(myOrderRoutes, { prefix: '/me/orders' });
    customer.register(myReviewRoutes, { prefix: '/me/reviews' });
    customer.register(notificationRoutes, { prefix: '/me/notifications' });
    customer.register(customerOrderRoutes, { prefix: '/orders' });
  });

  // --- Administração ---
  api.register(async (admin) => {
    admin.addHook('onRequest', admin.requireAdmin);

    admin.register(dashboardRoutes, { prefix: '/admin/dashboard' });
    admin.register(adminProductRoutes, { prefix: '/admin/products' });
    admin.register(adminOrderRoutes, { prefix: '/admin/orders' });
    admin.register(adminUserRoutes, { prefix: '/admin/users' });
    admin.register(adminReviewRoutes, { prefix: '/admin/reviews' });
    admin.register(adminCouponRoutes, { prefix: '/admin/coupons' });
    admin.register(uploadRoutes, { prefix: '/admin/uploads' });
  });
}
