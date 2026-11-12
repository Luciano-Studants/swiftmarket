import { getDashboard } from './dashboard.service.js';

/** Registrado sob /admin/dashboard. */
export default async function dashboardRoutes(app) {
  app.get('/', async () => getDashboard(app.db));
}
