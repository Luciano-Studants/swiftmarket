import { parse } from '../../core/validate.js';
import {
  couponCreateBody,
  couponIdParams,
  couponUpdateBody,
  couponsQuery,
} from './coupons.schema.js';
import * as couponsService from './coupons.service.js';

/** Admin, sob /admin/coupons. */
export default async function adminCouponRoutes(app) {
  app.get('/', async (request) =>
    couponsService.listCoupons(app.db, parse(couponsQuery, request.query)),
  );

  app.post('/', async (request, reply) => {
    const coupon = couponsService.createCoupon(app.db, parse(couponCreateBody, request.body));
    return reply.status(201).send(coupon);
  });

  app.patch('/:id', async (request) => {
    const { id } = parse(couponIdParams, request.params);
    return couponsService.updateCoupon(app.db, id, parse(couponUpdateBody, request.body));
  });

  app.delete('/:id', async (request, reply) => {
    const { id } = parse(couponIdParams, request.params);
    couponsService.deleteCoupon(app.db, id);
    return reply.status(204).send();
  });
}
