import { ORDER_STATUS, ROLES } from '@swiftmarket/shared';

import { AppError } from '../../core/errors.js';
import { parse } from '../../core/validate.js';
import {
  adminOrdersQuery,
  createOrderBody,
  orderIdParams,
  pageQuery,
  previewOrderBody,
  statusBody,
} from './orders.schema.js';
import * as ordersService from './orders.service.js';

/** Cliente autenticado: criar pedido, ver pedido próprio (registrado sob /orders). */
export async function customerOrderRoutes(app) {
  app.post('/', async (request, reply) => {
    const body = parse(createOrderBody, request.body);
    const order = ordersService.createOrder(app.db, request.currentUser, body);
    return reply.status(201).send(order);
  });

  /** Totais (com cupom) calculados pelo servidor, sem criar pedido. */
  app.post('/preview', async (request) =>
    ordersService.previewOrder(app.db, request.currentUser, parse(previewOrderBody, request.body)),
  );

  app.get('/:id', async (request) => {
    const { id } = parse(orderIdParams, request.params);
    const order = ordersService.getOrder(app.db, id);

    const isOwner = order.userId === request.currentUser.id;
    const isAdmin = request.currentUser.role === ROLES.ADMIN;
    // 404 (e não 403) para não revelar a existência de pedidos de outros usuários.
    if (!isOwner && !isAdmin) throw new AppError(404, 'ORDER_NOT_FOUND');

    return order;
  });

  /** Cliente cancela o próprio pedido (só antes do envio); o estoque volta. */
  app.post('/:id/cancel', async (request) => {
    const { id } = parse(orderIdParams, request.params);
    return ordersService.transitionOrder(app.db, id, ORDER_STATUS.CANCELLED, request.currentUser);
  });
}

/** Histórico do cliente (registrado sob /me/orders). */
export async function myOrderRoutes(app) {
  app.get('/', async (request) =>
    ordersService.listUserOrders(app.db, request.currentUser.id, parse(pageQuery, request.query)),
  );
}

/** Painel admin (registrado sob /admin/orders). */
export async function adminOrderRoutes(app) {
  app.get('/', async (request) =>
    ordersService.listAllOrders(app.db, parse(adminOrdersQuery, request.query)),
  );

  app.patch('/:id/status', async (request) => {
    const { id } = parse(orderIdParams, request.params);
    const { status } = parse(statusBody, request.body);
    return ordersService.transitionOrder(app.db, id, status, request.currentUser);
  });
}
