import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import type { AuthUser } from "../types/request-context.js";

const AUTH_COOKIE_NAME = "glowy_token";

const parseCookies = (cookieHeader = ""): Record<string, string> =>
  cookieHeader.split(";").reduce((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (!rawName) return cookies;

    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {} as Record<string, string>);

const getTokenFromRequest = (req: Request): string | null => {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[AUTH_COOKIE_NAME]) return cookies[AUTH_COOKIE_NAME];

  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  return authHeader.split(" ")[1] || null;
};

const sendUnauthorized = (req: Request, res: Response) =>
  res.status(401).json({
    message: "Пользователь не авторизован",
    code: "AUTH_UNAUTHORIZED",
    ...(req.requestId ? { requestId: req.requestId } : {}),
  });

type AuthDb = Pick<PrismaClient, "telegramConnection">;

const toAuthUser = (decoded: string | JwtPayload): AuthUser | null => {
  if (typeof decoded === "string" || !Number.isSafeInteger(decoded.id)) {
    return null;
  }
  return { ...decoded, id: decoded.id as number };
};

export const createAuthMiddleware = ({
  db = prisma,
  jwtSecret,
}: {
  db?: AuthDb;
  jwtSecret?: string;
} = {}): RequestHandler => async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return sendUnauthorized(req, res);
    }

    const decoded = jwt.verify(
      token,
      (jwtSecret || process.env.JWT_SECRET) as jwt.Secret
    );
    const user = toAuthUser(decoded);
    if (!user) {
      return sendUnauthorized(req, res);
    }
    if (user.channel === "telegram-mini-app") {
      if (!Number.isSafeInteger(user.telegramConnectionId)) {
        return sendUnauthorized(req, res);
      }
      const connection = await db.telegramConnection.findFirst({
        where: {
          id: user.telegramConnectionId,
          userId: user.id,
        },
        select: { id: true },
      });
      if (!connection) {
        return sendUnauthorized(req, res);
      }
    }
    req.user = user;

    next();
  } catch {
    return sendUnauthorized(req, res);
  }
};

export const authMiddleware = createAuthMiddleware();
