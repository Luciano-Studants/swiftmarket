import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';

import { AppError } from '../../core/errors.js';

const EXTENSION_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

/**
 * Upload de imagem de produto (registrado sob /admin/uploads).
 * Substitui o base64 no localStorage do protótipo: o arquivo vai para o disco
 * e o produto guarda só a URL (`/uploads/<arquivo>`).
 */
export default async function uploadRoutes(app) {
  app.post('/', async (request, reply) => {
    const file = await request.file();
    if (!file) throw new AppError(400, 'FILE_REQUIRED');

    const extension = EXTENSION_BY_MIME[file.mimetype];
    if (!extension) throw new AppError(415, 'UNSUPPORTED_IMAGE_TYPE');

    const filename = `${crypto.randomUUID()}${extension}`;
    const target = path.join(app.config.uploadDir, filename);

    await pipeline(file.file, fs.createWriteStream(target));

    if (file.file.truncated) {
      await fs.promises.unlink(target).catch(() => {});
      throw new AppError(413, 'FILE_TOO_LARGE');
    }

    return reply.status(201).send({ url: `/uploads/${filename}` });
  });
}
