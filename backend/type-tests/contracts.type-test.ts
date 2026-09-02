import type { AuthUser } from "../types/request-context.js";

const validUser = { id: 42 } satisfies AuthUser;

// This compile-time fixture proves that an authenticated request cannot omit its owner id.
// @ts-expect-error AuthUser requires a numeric id.
const invalidUser: AuthUser = {};

void validUser;
void invalidUser;
