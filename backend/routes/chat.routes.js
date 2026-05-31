import express from "express";
import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { rateLimit } from "express-rate-limit";

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

const limitter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: "Лимит AI исчерпан, отдохни" },
});

router.post("/", limitter, async (req, res) => {
  try {
    res.status(200).json({ message: "Запрос к ИИ прошел успешно!" });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
});

export default router;
