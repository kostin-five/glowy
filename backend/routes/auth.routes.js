import express from "express";
import { validationResult, check } from "express-validator";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
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
} from "../services/auth/auth-session.service.js";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Слишком много попыток входа. Пожалуйста, попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    `${ipKeyGenerator(req.ip)}:${normalizeAuthEmail(req.body || {}) || "unknown"}`,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Слишком много регистраций. Пожалуйста, попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip),
});

const registerValidators = [
  check("name", "Имя пользователя не может быть пустым").notEmpty(),
  check("email", "Укажите корректную почту").custom((_, { req }) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeAuthEmail(req.body))
  ),
  check("password", "Пароль должен быть не короче 8 символов").isLength({
    min: 8,
    max: 20,
  }),
];

export const createAuthRouter = ({
  db = prisma,
  authenticate = authMiddleware,
} = {}) => {
  const router = express.Router();

  router.post("/register", registerLimiter, registerValidators, async (req, res) => {
    try {
      if (!validationResult(req).isEmpty()) {
        return res.status(400).json({ error: "Некорректные данные" });
      }
      const user = await createUserWithCredentials({
        db,
        input: {
          name: req.body.name,
          email: normalizeAuthEmail(req.body),
          password: req.body.password,
        },
      });
      setAuthCookie(res, createAuthToken(user.id));
      return res.status(201).json(toSafeUser(user));
    } catch (error) {
      const status = error instanceof CredentialsError ? error.status : 400;
      logger.error("auth.register.failed", { req, error, statusCode: status });
      return res.status(status).json({
        error:
          error instanceof CredentialsError
            ? error.message
            : "Не удалось создать аккаунт",
      });
    }
  });

  router.post("/login", loginLimiter, async (req, res) => {
    try {
      if (!normalizeAuthEmail(req.body)) {
        return res.status(400).json({ error: "Укажите почту" });
      }
      const user = await verifyUserCredentials({
        db,
        email: normalizeAuthEmail(req.body),
        password: req.body.password,
      });
      setAuthCookie(res, createAuthToken(user.id));
      return res.status(200).json(toSafeUser(user));
    } catch (error) {
      const status = error instanceof CredentialsError ? error.status : 400;
      logger.error("auth.login.failed", { req, error, statusCode: status });
      return res.status(status).json({
        error:
          error instanceof CredentialsError ? error.message : "Ошибка при входе",
      });
    }
  });

  router.post("/logout", (_req, res) => {
    clearAuthCookie(res);
    return res.status(200).json({ message: "Выход выполнен" });
  });

  router.get("/me", authenticate, async (req, res) => {
    try {
      const user = await db.user.findUnique({
        where: { id: req.user.id },
        select: SAFE_USER_SELECT,
      });
      if (!user) return res.status(404).json({ error: "Пользователь не найден" });
      return res.json(user);
    } catch (error) {
      logger.error("auth.profile.fetch_failed", { req, error, statusCode: 500 });
      return res.status(500).json({ error: "Ошибка при получении профиля" });
    }
  });

  return router;
};

export default createAuthRouter();
