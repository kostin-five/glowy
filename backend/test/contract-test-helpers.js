import assert from "node:assert/strict";

export const createTestAuthMiddleware = (user = { id: 1 }) =>
  (req, _res, next) => {
    req.user = user;
    next();
  };

export const assertContract = (schema, value) => {
  const result = schema.safeParse(value);
  assert.equal(
    result.success,
    true,
    result.success ? undefined : JSON.stringify(result.error.issues)
  );
  return result.data;
};

export const createProviderSpy = ({ result, error } = {}) => {
  const calls = [];
  const provider = async (...args) => {
    calls.push(args);
    if (error) throw error;
    return result;
  };

  return { provider, calls };
};
