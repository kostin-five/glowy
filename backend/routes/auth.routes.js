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
    check("login", "Логин пользователя не может быть пустым").notEmpty(),
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
      const { name, login, password } = req.body;
      const candidate = await prisma.user.findUnique({ where: { login } });
      if (candidate) {
        res
          .status(400)
          .json({ error: "Пользователь с таким логином уже существует" });
        return;
      }
      const hashPassword = bcrypt.hashSync(password, 7);
      const newUser = await prisma.user.create({
        data: { name, login, password: hashPassword },
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
    const { login, password } = req.body;
    const user = await prisma.user.findUnique({ where: { login } });

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
      login: user.login,
      xp: user.xp,
      level: user.level,
    });
  } catch (e) {
    res.status(400).json({ error: "Ошибка при входе" });
  }
});

export default router;
