import express from "express";
import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
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

router.use(authMiddleware);

router.put("/energy", async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  try {
    const { energyLimit } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { energyDate: today, energyLimit: Number(energyLimit) },
    });
    res.json(updatedUser);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при обновлении" });
  }
});

export default router;
