import express from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

const FOCUS_PRICE_RUB = "99.00";
const FOCUS_PRICE_KOPEKS = 9900;
const FOCUS_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const FOCUS_RATE_LIMIT_MAX = 5;

const isExpiredFocusUser = (user) =>
  user?.plan === "focus" &&
  user?.subscriptionStatus === "active" &&
  user?.planExpiresAt &&
  new Date(user.planExpiresAt).getTime() < Date.now();

const normalizePlanState = async (userId, user) => {
  if (!user || !isExpiredFocusUser(user)) {
    return user;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      plan: "start",
      subscriptionStatus: "expired",
    },
    select: {
      plan: true,
      subscriptionStatus: true,
      planExpiresAt: true,
    },
  });

  return updatedUser;
};

const focusCreateLimiter = rateLimit({
  windowMs: FOCUS_RATE_LIMIT_WINDOW_MS,
  max: FOCUS_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req),
  handler: (req, res) =>
    res.status(429).json({
      error: "Слишком много попыток. Подожди немного и попробуй снова.",
      limit: FOCUS_RATE_LIMIT_MAX,
    }),
});

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
        yookassaPayment.amount?.value !== FOCUS_PRICE_RUB ||
        yookassaPayment.amount?.currency !== "RUB" ||
        String(yookassaPayment.metadata?.userId) !== String(localPayment.userId) ||
        yookassaPayment.metadata?.plan !== "focus" ||
        localPayment.plan !== "focus" ||
        localPayment.amountKopeks !== FOCUS_PRICE_KOPEKS ||
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
  } catch (error) {
    console.error("Payment webhook failed", {
      code: error?.code || "UNKNOWN_ERROR",
      status: error?.status || 500,
      message: error?.message,
    });
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

    const normalizedUser = await normalizePlanState(req.user.id, user);

    res.json(normalizedUser);
  } catch (error) {
    console.error("Payment current-plan failed", {
      code: error?.code || "UNKNOWN_ERROR",
      status: error?.status || 500,
      message: error?.message,
    });
    res.status(500).json({ error: "Ошибка при загрузке данных плана" });
  }
});

router.post("/focus/create", focusCreateLimiter, async (req, res) => {
  try {
    const rawUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    });
    const user = await normalizePlanState(req.user.id, rawUser);

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
        amount: { value: FOCUS_PRICE_RUB, currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: YOOKASSA_RETURN_URL },
        description: "подписка Glowy Focus на 30 дней",
        metadata: { userId: req.user.id, plan: "focus" },
      }),
    });

    if (!response.ok) {
      console.error("Payment create request to YooKassa failed", {
        status: response.status,
        userId: req.user.id,
      });
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
        amountKopeks: FOCUS_PRICE_KOPEKS,
        currency: "RUB",
        confirmationUrl: data.confirmation.confirmation_url,
        paid: false,
      },
    });

    res.json({ paymentId: payment.providerPaymentId, confirmationUrl: payment.confirmationUrl });
  } catch (error) {
    console.error("Payment focus/create failed", {
      code: error?.code || "UNKNOWN_ERROR",
      status: error?.status || 500,
      message: error?.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: "Ошибка при создании платежа" });
  }
});

export default router;
