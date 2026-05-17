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
    check("username", "Имя пользователя не может быть пустым").notEmpty(),
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
      const { username, password } = req.body;
      const candidate = await prisma.user.findUnique({ where: { username } });
      if (candidate) {
        res
          .status(400)
          .json({ error: "Пользователь с таким именем уже существует" });
        return;
      }
      const hashPassword = bcrypt.hashSync(password, 7);
      const newUser = await prisma.user.create({
        data: { username, password: hashPassword },
      });
      res.status(201).json(newUser);
    } catch (e) {
      res.status(400).json({ error: "Ошибка при регистрации" });
    }
  }
);

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(400).json({ error: `Пользователь не найден` });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ error: `Неверный пароль` });
    }

    const token = generateAccessToken(user.id);
    res.status(201).json(token);
  } catch (e) {
    res.status(400).json({ error: "Ошибка при входе" });
  }
});

export default router;
