import { z } from 'zod';
import { PASSWORD, SOCIAL_PROVIDERS } from '@swiftmarket/shared';

const email = z.string().trim().toLowerCase().pipe(z.email());

/** bcrypt só considera os primeiros 72 bytes. */
export const passwordField = z.string().min(PASSWORD.MIN_LENGTH).max(PASSWORD.MAX_LENGTH);

export const registerBody = z.object({
  name: z.string().trim().min(2).max(80),
  email,
  password: passwordField,
});

export const loginBody = z.object({
  email,
  password: z.string().min(1).max(72),
});

export const socialBody = z.object({
  provider: z.enum(SOCIAL_PROVIDERS),
});

export const forgotBody = z.object({ email });

export const resetBody = z.object({
  email,
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/),
  password: passwordField,
});

export const changePasswordBody = z.object({
  currentPassword: z.string().min(1).max(72),
  newPassword: passwordField,
});
