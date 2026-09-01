import { z } from "zod";

export const requestIdSchema = z.uuid();

export const contractErrorCodeSchema = z
  .string()
  .regex(/^[A-Z0-9_]{1,60}$/);

export const validationDetailSchema = z.object({
  path: z.array(z.union([z.string(), z.number().int()])),
  message: z.string().min(1),
  code: z.string().min(1).optional(),
});

export const contractErrorSchema = z.object({
  error: z.string().min(1),
  code: contractErrorCodeSchema,
  requestId: requestIdSchema,
  details: z.array(validationDetailSchema).optional(),
});

export type ContractError = z.infer<typeof contractErrorSchema>;
export type ValidationDetail = z.infer<typeof validationDetailSchema>;
