import type { AuthUser } from "./request-context.js";

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user: AuthUser;
    }
  }
}

export {};
