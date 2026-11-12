import { parse } from '../../core/validate.js';
import { idParams, listQuery, productBody } from './products.schema.js';
import * as productsService from './products.service.js';

/** Vitrine pública (somente leitura). */
export async function publicProductRoutes(app) {
  app.get('/', async (request) =>
    productsService.listProducts(app.db, parse(listQuery, request.query)),
  );

  app.get('/:id', async (request) => {
    const { id } = parse(idParams, request.params);
    return productsService.getProduct(app.db, id);
  });
}

/** CRUD do painel admin (registrado sob /admin/products). */
export async function adminProductRoutes(app) {
  app.get('/', async (request) =>
    productsService.listProducts(app.db, parse(listQuery, request.query), { includeDrafts: true }),
  );

  app.get('/:id', async (request) => {
    const { id } = parse(idParams, request.params);
    return productsService.getProduct(app.db, id, { includeDrafts: true });
  });

  app.post('/', async (request, reply) => {
    const product = productsService.createProduct(app.db, parse(productBody, request.body));
    return reply.status(201).send(product);
  });

  app.put('/:id', async (request) => {
    const { id } = parse(idParams, request.params);
    return productsService.updateProduct(app.db, id, parse(productBody, request.body));
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = parse(idParams, request.params);
    productsService.deleteProduct(app.db, id);
    return reply.status(204).send();
  });
}
