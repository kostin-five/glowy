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

router.post("/yookassa/webhook", async (req, res) => {
  try {
    const { YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY } = process.env;
    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      return res.status(500).json({ error: "Ошибка конфигурации" });
    }

    const event = req.body;
    if (!event || !event.object || !event.object.id) {
      return res.status(200).json({ ok: true });
    }

    const paymentId = event.object.id;

    if (event.event !== "payment.succeeded" && event.event !== "payment.canceled") {
      return res.status(200).json({ ok: true });
    }

    const authString = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");
    const response = await fetch(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${authString}` },
    });

    if (!response.ok) {
      return res.status(500).json({ error: "Ошибка проверки платежа" });
    }

    const yookassaPayment = await response.json();
    const localPayment = await prisma.payment.findFirst({
      where: { providerPaymentId: paymentId },
    });

    if (!localPayment) {
      return res.status(200).json({ ok: true });
    }

    if (event.event === "payment.succeeded" && yookassaPayment.status === "succeeded") {
      if (
        yookassaPayment.id !== paymentId ||
        yookassaPayment.amount?.value !== "99.00" ||
        yookassaPayment.amount?.currency !== "RUB" ||
        String(yookassaPayment.metadata?.userId) !== String(localPayment.userId) ||
        yookassaPayment.metadata?.plan !== "focus" ||
        localPayment.plan !== "focus" ||
        localPayment.amountKopeks !== 9900 ||
        localPayment.currency !== "RUB"
      ) {
        return res.status(200).json({ ok: true });
      }

      if (localPayment.paid) return res.status(200).json({ ok: true });

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: localPayment.id },
          data: { status: "succeeded", paid: true },
        }),
        prisma.user.update({
          where: { id: localPayment.userId },
          data: {
            plan: "focus",
            subscriptionStatus: "active",
            planExpiresAt: expiresAt,
          },
        }),
      ]);
    } else if (event.event === "payment.canceled" && yookassaPayment.status === "canceled") {
      if (!localPayment.paid) {
        await prisma.payment.update({
          where: { id: localPayment.id },
          data: { status: "canceled", paid: false },
        });
      }
    }

    res.status(200).json({ ok: true });
  } catch { 
    res.status(500).json({ error: "Ошибка обработки webhook" });
  }
});

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
  } catch { 
    res.status(500).json({ error: "Ошибка при загрузке данных плана" });
  }
});

router.post("/focus/create", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (
      user?.plan === "focus" &&
      user?.subscriptionStatus === "active" &&
      user?.planExpiresAt &&
      new Date(user.planExpiresAt) > new Date()
    ) {
      return res.status(409).json({
        code: "FOCUS_ALREADY_ACTIVE",
        error: "Тариф Focus уже активен",
        planExpiresAt: user.planExpiresAt,
      });
    }

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
  } catch { 
    res.status(500).json({ error: "Ошибка при создании платежа" });
  }
});


export default router;
