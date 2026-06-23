import express from "express";
import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult, check } from "express-validator";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Слишком много попыток входа. Пожалуйста, попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const ipKey = ipKeyGenerator(req, null);
    const email = req.body ? getAuthEmail(req.body) : "unknown";
    return `${ipKey}:${email}`;
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Слишком много регистраций. Пожалуйста, попробуйте позже." },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req, null),
});

import { authMiddleware } from "../middleware/auth.middleware.js";

const { PrismaClient } = pkg;
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const router = express.Router();

const getAuthEmail = (body) => {
  return String(body.email || body.login || "").trim().toLowerCase();
};

const generateAccessToken = (id) => {
  const payload = {
    id,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "24h" });
};

const AUTH_COOKIE_NAME = "glowy_token";
const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  maxAge: 24 * 60 * 60 * 1000,
  path: "/",
};

const AUTH_COOKIE_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
};

const setAuthCookie = (res, token) => {
  res.cookie(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
};

router.post(
  "/register",
  registerLimiter,
  [
    check("name", "Имя пользователя не может быть пустым").notEmpty(),
    check("email", "Укажите корректную почту").custom((_, { req }) => {
      const email = getAuthEmail(req.body);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }),
    check(
      "password",
      "Пароль должен быть не короче 8 символов"
    ).isLength({ min: 8, max: 20 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ error: "Некорректные данные" });
      }
      const { name, password } = req.body;
      const email = getAuthEmail(req.body);
      const candidate = await prisma.user.findUnique({ where: { email } });
      if (candidate) {
        return res
          .status(400)
          .json({ error: "Пользователь с таким email уже существует" });
      }
      const hashPassword = bcrypt.hashSync(password, 10);
      const newUser = await prisma.user.create({
        data: { name, email, password: hashPassword },
      });
      const token = generateAccessToken(newUser.id);
      setAuthCookie(res, token);
      res.status(201).json({
        name: newUser.name,
        email: newUser.email,
        xp: newUser.xp,
        level: newUser.level,
      });
    } catch (e) {
      console.error("ОШИБКА РЕГИСТРАЦИИ:", e);
      res.status(400).json({ error: "Не удалось создать аккаунт" });
    }
  }
);

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { password } = req.body;
    const email = getAuthEmail(req.body);

    if (!email) {
      return res.status(400).json({ error: "Укажите почту" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: "Неверный email или пароль" });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: "Неверный email или пароль" });
    }

    const token = generateAccessToken(user.id);
    setAuthCookie(res, token);
    res.status(200).json({
      name: user.name,
      email: user.email,
      xp: user.xp,
      level: user.level,
    });
  } catch (e) {
    res.status(400).json({ error: "Ошибка при входе" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);
  res.status(200).json({ message: "Выход выполнен" });
});

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        xp: true,
        level: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при получении профиля" });
  }
});

export default router;
