import { z } from "zod";
import { contractErrorCodeSchema, requestIdSchema } from "./common.js";

const serializedDateTimeSchema = z.union([
  z.iso.datetime(),
  z.date().transform((value) => value.toISOString()),
]);

export const paymentPlanSchema = z.enum(["start", "focus", "forever"]);
export const subscriptionStatusSchema = z.enum([
  "inactive",
  "active",
  "expired",
]);

export const paymentPlanStateSchema = z.object({
  plan: paymentPlanSchema,
  subscriptionStatus: subscriptionStatusSchema,
  planExpiresAt: serializedDateTimeSchema.nullable(),
});

export const paymentCheckoutSchema = z.object({
  paymentId: z.string().min(1),
  confirmationUrl: z
    .url()
    .refine((value) => new URL(value).protocol === "https:"),
});

export const paymentWebhookAckSchema = z.object({
  ok: z.literal(true),
});

export const paymentErrorSchema = z.object({
  error: z.string().min(1),
  code: contractErrorCodeSchema,
  requestId: requestIdSchema,
  planExpiresAt: serializedDateTimeSchema.nullable().optional(),
  limit: z.number().int().positive().optional(),
});

export type PaymentCheckout = z.infer<typeof paymentCheckoutSchema>;
export type PaymentPlanState = z.infer<typeof paymentPlanStateSchema>;
