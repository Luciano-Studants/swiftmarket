import { createRouter, createWebHashHistory } from 'vue-router';

import { useAuthStore } from '@/stores/auth.js';

/**
 * Mapa de telas do app do cliente (o painel admin é outro app).
 * meta.auth  -> exige login
 * meta.guest -> só para quem NÃO está logado
 * meta.tab   -> aba destacada na barra inferior (rota sem `tab` esconde a barra)
 * Todas as telas são carregadas sob demanda (code splitting) para abrir mais rápido no celular.
 */
const routes = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/features/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/forgot-password',
    name: 'forgot-password',
    component: () => import('@/features/auth/ForgotPasswordView.vue'),
    meta: { guest: true },
  },
  {
    path: '/',
    name: 'home',
    component: () => import('@/features/home/HomeView.vue'),
    meta: { auth: true, tab: 'home' },
  },
  {
    path: '/catalog',
    name: 'catalog',
    component: () => import('@/features/catalog/CatalogView.vue'),
    meta: { auth: true, tab: 'catalog' },
  },
  {
    path: '/product/:id(\\d+)',
    name: 'product',
    component: () => import('@/features/catalog/ProductDetailView.vue'),
    meta: { auth: true },
  },
  {
    path: '/favorites',
    name: 'favorites',
    component: () => import('@/features/favorites/FavoritesView.vue'),
    meta: { auth: true, tab: 'favorites' },
  },
  {
    path: '/cart',
    name: 'cart',
    component: () => import('@/features/cart/CartView.vue'),
    meta: { auth: true, tab: 'cart' },
  },
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/features/checkout/CheckoutView.vue'),
    meta: { auth: true },
  },
  {
    path: '/order/:id',
    name: 'order-done',
    component: () => import('@/features/checkout/OrderDoneView.vue'),
    meta: { auth: true },
  },
  {
    path: '/profile',
    name: 'profile',
    component: () => import('@/features/profile/ProfileView.vue'),
    meta: { auth: true, tab: 'profile' },
  },
  {
    path: '/profile/edit',
    name: 'profile-edit',
    component: () => import('@/features/profile/EditProfileView.vue'),
    meta: { auth: true },
  },
  {
    path: '/profile/orders',
    name: 'orders',
    component: () => import('@/features/profile/OrdersView.vue'),
    meta: { auth: true },
  },
  {
    path: '/settings',
    name: 'settings',
    component: () => import('@/features/profile/SettingsView.vue'),
    meta: { auth: true },
  },
  {
    path: '/settings/password',
    name: 'change-password',
    component: () => import('@/features/profile/ChangePasswordView.vue'),
    meta: { auth: true },
  },
  {
    path: '/notifications',
    name: 'notifications',
    component: () => import('@/features/notifications/NotificationsView.vue'),
    meta: { auth: true },
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'home' } },
];

/** Abas da barra inferior (usadas pelo botão voltar do Android). */
export const TAB_ROUTES = ['catalog', 'favorites', 'cart', 'profile'];

// Hash history: funciona no WebView do Capacitor sem configurar servidor.
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.auth && !auth.isAuthenticated) {
    const redirect = to.fullPath === '/' ? undefined : to.fullPath;
    return { name: 'login', query: redirect ? { redirect } : {} };
  }

  if (to.meta.guest && auth.isAuthenticated) return { name: 'home' };
  return true;
});
