import express from "express";
import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { validationResult, check } from "express-validator";

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

router.post(
  "/register",
  [
    check("name", "Имя пользователя не может быть пустым").notEmpty(),
    check("email", "Укажите корректную почту").custom((_, { req }) => {
      const email = getAuthEmail(req.body);
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }),
    check(
      "password",
      "Пароль должен быть больше 4 и меньше 20 символов"
    ).isLength({ min: 4, max: 20 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ message: "Ошибка при регистрации", errors: errors.array() });
      }
      const { name, password } = req.body;
      const email = getAuthEmail(req.body);
      const candidate = await prisma.user.findUnique({ where: { email } });
      if (candidate) {
        res
          .status(400)
          .json({ error: "Пользователь с такой почтой уже существует" });
        return;
      }
      const hashPassword = bcrypt.hashSync(password, 7);
      const newUser = await prisma.user.create({
        data: { name, email, password: hashPassword },
      });
      res.status(201).json(newUser);
    } catch (e) {
      console.error("КРИТИЧЕСКАЯ ОШИБКА БАЗЫ:", e);
      res.status(400).json({ error: "Ошибка при регистрации: " + e.message });
    }
  }
);

router.post("/login", async (req, res) => {
  try {
    const { password } = req.body;
    const email = getAuthEmail(req.body);

    if (!email) {
      return res.status(400).json({ error: "Укажите почту" });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(400).json({ error: `Пользователь не найден` });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: `Неверный пароль` });
    }

    const token = generateAccessToken(user.id);
    res.status(200).json({
      token: token,
      name: user.name,
      email: user.email,
      xp: user.xp,
      level: user.level,
    });
  } catch (e) {
    res.status(400).json({ error: "Ошибка при входе" });
  }
});

export default router;
