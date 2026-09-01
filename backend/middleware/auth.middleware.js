import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const AUTH_COOKIE_NAME = "glowy_token";

const parseCookies = (cookieHeader = "") =>
  cookieHeader.split(";").reduce((cookies, cookie) => {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (!rawName) return cookies;

    cookies[rawName] = decodeURIComponent(rawValue.join("="));
    return cookies;
  }, {});

const getTokenFromRequest = (req) => {
  const cookies = parseCookies(req.headers.cookie);
  if (cookies[AUTH_COOKIE_NAME]) return cookies[AUTH_COOKIE_NAME];

  const authHeader = req.headers.authorization;
  if (!authHeader) return null;

  return authHeader.split(" ")[1] || null;
};

const sendUnauthorized = (req, res) =>
  res.status(401).json({
    message: "Пользователь не авторизован",
    code: "AUTH_UNAUTHORIZED",
    ...(req.requestId ? { requestId: req.requestId } : {}),
  });

export const createAuthMiddleware = ({
  db = prisma,
  jwtSecret,
} = {}) => async (req, res, next) => {
  if (req.method === "OPTIONS") {
    return next();
  }

  try {
    const token = getTokenFromRequest(req);
    if (!token) {
      return sendUnauthorized(req, res);
    }

    const decoded = jwt.verify(token, jwtSecret || process.env.JWT_SECRET);
    if (decoded.channel === "telegram-mini-app") {
      if (!Number.isSafeInteger(decoded.telegramConnectionId)) {
        return sendUnauthorized(req, res);
      }
      const connection = await db.telegramConnection.findFirst({
        where: {
          id: decoded.telegramConnectionId,
          userId: decoded.id,
        },
        select: { id: true },
      });
      if (!connection) {
        return sendUnauthorized(req, res);
      }
    }
    req.user = decoded;

    next();
  } catch (e) {
    return sendUnauthorized(req, res);
  }
};

export const authMiddleware = createAuthMiddleware();
