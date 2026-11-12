import { z } from 'zod';

export const updateProfileBody = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    address: z.string().trim().min(5).max(300).optional(),
  })
  .refine((body) => body.name !== undefined || body.address !== undefined, {
    message: 'EMPTY_UPDATE',
  });

export const preferencesBody = z.object({
  notifyOrders: z.boolean(),
  notifyPromos: z.boolean(),
  personalizedRecs: z.boolean(),
  shareAnalytics: z.boolean(),
});
