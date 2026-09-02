import assert from "node:assert/strict";
import type { RequestHandler } from "express";
import type { ZodType } from "zod";

export const createTestAuthMiddleware = (
  user: { id: number } = { id: 1 }
): RequestHandler =>
  (req, _res, next) => {
    req.user = user;
    next();
  };

export const assertContract = <Output>(schema: ZodType<Output>, value: unknown): Output => {
  const result = schema.safeParse(value);
  assert.equal(
    result.success,
    true,
    result.success ? undefined : JSON.stringify(result.error.issues)
  );
  return result.data;
};

export const createProviderSpy = ({
  result,
  error,
}: { result?: unknown; error?: unknown } = {}) => {
  const calls: unknown[][] = [];
  const provider = async (...args: unknown[]): Promise<unknown> => {
    calls.push(args);
    if (error) throw error;
    return result;
  };

  return { provider, calls };
};
