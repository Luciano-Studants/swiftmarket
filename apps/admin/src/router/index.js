import { createRouter, createWebHashHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth.js';

/**
 * Mapa de telas do painel admin.
 * meta.auth  -> exige login de administrador
 * meta.guest -> só para quem NÃO está logado
 * meta.shell -> mostra menu lateral e topo
 * meta.nav   -> item do menu destacado (dashboard | products | orders | users)
 */
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    name: 'dashboard',
    component: () => import('@/features/dashboard/DashboardView.vue'),
    meta: { auth: true, shell: true, nav: 'dashboard' },
  },
  {
    path: '/products',
    name: 'products',
    component: () => import('@/features/products/ProductsView.vue'),
    meta: { auth: true, shell: true, nav: 'products' },
  },
  {
    path: '/products/new',
    name: 'product-new',
    component: () => import('@/features/products/ProductFormView.vue'),
    meta: { auth: true, shell: true, nav: 'products' },
  },
  {
    path: '/products/:id(\\d+)/edit',
    name: 'product-edit',
    component: () => import('@/features/products/ProductFormView.vue'),
    meta: { auth: true, shell: true, nav: 'products' },
  },
  {
    path: '/orders',
    name: 'orders',
    component: () => import('@/features/orders/OrdersView.vue'),
    meta: { auth: true, shell: true, nav: 'orders' },
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/features/users/UsersView.vue'),
    meta: { auth: true, shell: true, nav: 'users' },
  },
  {
    path: '/reviews',
    name: 'reviews',
    component: () => import('@/features/reviews/ReviewsView.vue'),
    meta: { auth: true, shell: true, nav: 'reviews' },
  },
  {
    path: '/coupons',
    name: 'coupons',
    component: () => import('@/features/coupons/CouponsView.vue'),
    meta: { auth: true, shell: true, nav: 'coupons' },
  },
  {
    path: '/account/password',
    name: 'change-password',
    component: () => import('@/features/auth/ChangePasswordView.vue'),
    meta: { auth: true, shell: true },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.auth && !auth.isAuthenticated) return { name: 'login' };
  if (to.meta.guest && auth.isAuthenticated) return { name: 'dashboard' };
  return true;
});
