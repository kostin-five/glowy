import { z } from "zod";
import { contractErrorSchema, requestIdSchema } from "./common.js";
import { positiveIdSchema } from "./primitives.js";

export const avatarIdSchema = z.enum([
  "orbit-indigo",
  "orbit-mint",
  "orbit-coral",
  "orbit-sun",
  "orbit-sky",
  "orbit-rose",
]);

export const aiToneSchema = z.enum(["calm", "moderate", "strict"]);

export const safeUserSchema = z
  .object({
    id: positiveIdSchema,
    name: z.string().min(1).max(100),
    email: z.email(),
    xp: z.number().int().nonnegative(),
    level: z.number().int().positive(),
    avatarId: avatarIdSchema.nullable(),
    aiTone: aiToneSchema,
  })
  .strict();

export const authRegisterRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(8).max(20),
  })
  .strict();

export const authLoginRequestSchema = z
  .object({
    email: z.email().transform((value) => value.toLowerCase()),
    password: z.string().min(1),
  })
  .strict();

export const authLogoutResponseSchema = z.object({
  message: z.literal("Выход выполнен"),
});

export const authErrorSchema = contractErrorSchema;

export const authUnauthorizedErrorSchema = z.object({
  message: z.literal("Пользователь не авторизован"),
  code: z.literal("AUTH_UNAUTHORIZED"),
  requestId: requestIdSchema,
});

export type AiTone = z.infer<typeof aiToneSchema>;
export type AuthLoginRequest = z.input<typeof authLoginRequestSchema>;
export type AuthRegisterRequest = z.input<typeof authRegisterRequestSchema>;
export type AvatarId = z.infer<typeof avatarIdSchema>;
export type SafeUser = z.infer<typeof safeUserSchema>;
