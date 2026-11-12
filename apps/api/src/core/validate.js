import { AppError } from './errors.js';

/** Valida `data` com um schema zod e lança VALIDATION_ERROR (400) se inválido. */
export function parse(schema, data) {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new AppError(400, 'VALIDATION_ERROR', {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  return result.data;
}
