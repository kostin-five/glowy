import express from "express";
import pg from "pg";
import pkg from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { authMiddleware } from "../middleware/auth.middleware.js";
import crypto from "crypto";

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

router.get("/current-plan", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при загрузке данных плана" });
  }
});

router.post("/focus/create", async (req, res) => {
  try {
    const { YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, YOOKASSA_RETURN_URL } = process.env;

    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY || !YOOKASSA_RETURN_URL) {
      return res.status(500).json({ error: "Ошибка конфигурации платежей" });
    }

    const idempotenceKey = crypto.randomUUID();
    const authString = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");

    const response = await fetch("https://api.yookassa.ru/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotence-Key": idempotenceKey,
        Authorization: `Basic ${authString}`,
      },
      body: JSON.stringify({
        amount: { value: "99.00", currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: YOOKASSA_RETURN_URL },
        description: "подписка Glowy Focus на 30 дней",
        metadata: { userId: req.user.id, plan: "focus" },
      }),
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Ошибка инициализации платежа" });
    }

    const data = await response.json();

    if (!data.id || !data.status || !data.confirmation?.confirmation_url) {
      return res.status(500).json({ error: "Ошибка инициализации платежа" });
    }

    const payment = await prisma.payment.create({
      data: {
        userId: req.user.id,
        provider: "yookassa",
        providerPaymentId: data.id,
        status: data.status,
        plan: "focus",
        amountKopeks: 9900,
        currency: "RUB",
        confirmationUrl: data.confirmation.confirmation_url,
        paid: false,
      },
    });

    res.json({ paymentId: payment.providerPaymentId, confirmationUrl: payment.confirmationUrl });
  } catch (e) {
    res.status(500).json({ error: "Ошибка при создании платежа" });
  }
});


export default router;
