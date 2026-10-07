import express from "express";
import type { Request, RequestHandler, Router } from "express";
import type { PrismaClient } from "@prisma/client";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import {
  authLoginRequestSchema,
  authLogoutResponseSchema,
  authRegisterRequestSchema,
  safeUserSchema,
} from "@glowy/contracts";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware, getTokenFromRequest } from "../middleware/auth.middleware.js";
import { buildErrorEnvelope, requireRegistrationEnabled } from "../middleware/error.middleware.js";
import {
  createUserWithCredentials,
  CredentialsError,
  normalizeAuthEmail,
  verifyUserCredentials,
} from "../services/auth/credentials.service.js";
import {
  clearAuthCookie,
  createAuthToken,
  SAFE_USER_SELECT,
  setAuthCookie,
  toSafeUser,
  revokeAuthToken,
} from "../services/auth/auth-session.service.js";

const buildAuthError = (req: Request, error: string, code: string) =>
  buildErrorEnvelope(req, error, code);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  handler: (req, res) =>
    res
      .status(429)
      .json(
        buildAuthError(
          req,
          "Слишком много попыток входа. Пожалуйста, попробуйте позже.",
          "AUTH_RATE_LIMITED"
        )
      ),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip || "unknown")}:${normalizeAuthEmail(req.body || {}) || "unknown"}`,
});

const loginIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  handler: (req, res) => res.status(429).json(buildAuthError(req,
    "Слишком много попыток входа. Пожалуйста, попробуйте позже.", "AUTH_RATE_LIMITED")),
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  handler: (req, res) =>
    res
      .status(429)
      .json(
        buildAuthError(
          req,
          "Слишком много регистраций. Пожалуйста, попробуйте позже.",
          "AUTH_RATE_LIMITED"
        )
      ),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
});

export const createAuthRouter = ({
  db = prisma,
  authenticate = authMiddleware,
  revokeToken = revokeAuthToken,
}: {
  db?: Pick<PrismaClient, "user">;
  authenticate?: RequestHandler;
  revokeToken?: (token: string) => Promise<void>;
} = {}): Router => {
  const router = express.Router();

  router.post("/register", requireRegistrationEnabled, registerLimiter, async (req, res) => {
    try {
      const requestResult = authRegisterRequestSchema.safeParse({
        name: req.body?.name,
        email: normalizeAuthEmail(req.body),
        password: req.body?.password,
      });
      if (!requestResult.success) {
        return res
          .status(400)
          .json(
            buildAuthError(
              req,
              "Некорректные данные",
              "AUTH_INVALID_INPUT"
            )
          );
      }
      const user = await createUserWithCredentials({
        db,
        input: requestResult.data,
      });
      setAuthCookie(res, createAuthToken(user.id));
      return res.status(201).json(safeUserSchema.parse(toSafeUser(user)));
    } catch (error) {
      const status = error instanceof CredentialsError ? error.status : 400;
      logger.error("auth.register.failed", { req, error, statusCode: status });
      return res.status(status).json(
        buildAuthError(
          req,
          error instanceof CredentialsError
            ? error.message
            : "Не удалось создать аккаунт",
          error instanceof CredentialsError
            ? error.code
            : "AUTH_REGISTER_FAILED"
        )
      );
    }
  });

  router.post("/login", loginIpLimiter, loginLimiter, async (req, res) => {
    try {
      const email = normalizeAuthEmail(req.body);
      if (!email) {
        return res
          .status(400)
          .json(buildAuthError(req, "Укажите почту", "AUTH_INVALID_INPUT"));
      }
      const requestResult = authLoginRequestSchema.safeParse({
        email,
        password: req.body?.password,
      });
      const user = await verifyUserCredentials({
        db,
        email: requestResult.success ? requestResult.data.email : email,
        password: requestResult.success
          ? requestResult.data.password
          : req.body?.password,
      });
      setAuthCookie(res, createAuthToken(user.id));
      return res.status(200).json(safeUserSchema.parse(toSafeUser(user)));
    } catch (error) {
      const status = error instanceof CredentialsError ? error.status : 400;
      logger.error("auth.login.failed", { req, error, statusCode: status });
      return res.status(status).json(
        buildAuthError(
          req,
          error instanceof CredentialsError ? error.message : "Ошибка при входе",
          error instanceof CredentialsError ? error.code : "AUTH_LOGIN_FAILED"
        )
      );
    }
  });

  router.post("/logout", async (req, res) => {
    try {
      const token = getTokenFromRequest(req);
      if (token) await revokeToken(token);
    } catch {
      return res.status(503).json(buildAuthError(req, "Не удалось завершить сессию. Попробуйте ещё раз.", "AUTH_LOGOUT_FAILED"));
    }
    clearAuthCookie(res);
    return res
      .status(200)
      .json(authLogoutResponseSchema.parse({ message: "Выход выполнен" }));
  });

  router.get("/me", authenticate, async (req, res) => {
    try {
      const user = await db.user.findUnique({
        where: { id: req.user.id },
        select: SAFE_USER_SELECT,
      });
      if (!user) {
        return res
          .status(404)
          .json(
            buildAuthError(req, "Пользователь не найден", "AUTH_USER_NOT_FOUND")
          );
      }
      return res.json(safeUserSchema.parse(user));
    } catch (error) {
      logger.error("auth.profile.fetch_failed", { req, error, statusCode: 500 });
      return res
        .status(500)
        .json(
          buildAuthError(
            req,
            "Ошибка при получении профиля",
            "AUTH_PROFILE_FAILED"
          )
        );
    }
  });

  return router;
};

export default createAuthRouter();
