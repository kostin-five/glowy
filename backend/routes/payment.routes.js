import express from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

const PAYMENT_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const PAYMENT_RATE_LIMIT_MAX = 5;

const PLAN_CONFIG = {
  focus: {
    priceRub: "99.00",
    priceKopeks: 9900,
    description: "подписка Glowy Focus на 30 дней",
    alreadyActiveCode: "FOCUS_ALREADY_ACTIVE",
    alreadyActiveMessage: "Тариф Focus уже активен",
    getPlanExpiresAt: () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      return expiresAt;
    },
  },
};

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

const paymentCreateLimiter = rateLimit({
  windowMs: PAYMENT_RATE_LIMIT_WINDOW_MS,
  max: PAYMENT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.user?.id ? `user:${req.user.id}` : ipKeyGenerator(req),
  handler: (req, res) =>
    res.status(429).json({
      error: "Слишком много попыток. Подожди немного и попробуй снова.",
      limit: PAYMENT_RATE_LIMIT_MAX,
    }),
});

const isActivePlan = (user, plan) => {
  if (user?.plan !== plan || user?.subscriptionStatus !== "active") return false;
  if (plan === "focus") {
    return Boolean(user?.planExpiresAt && new Date(user.planExpiresAt) > new Date());
  }
  return plan === "forever";
};

const createPaymentHandler = (plan) => async (req, res) => {
  try {
    const planConfig = PLAN_CONFIG[plan];
    const rawUser = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    });
    const user = await normalizePlanState(req.user.id, rawUser);

    if (isActivePlan(user, plan)) {
      return res.status(409).json({
        code: planConfig.alreadyActiveCode,
        error: planConfig.alreadyActiveMessage,
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
        amount: { value: planConfig.priceRub, currency: "RUB" },
        capture: true,
        confirmation: { type: "redirect", return_url: YOOKASSA_RETURN_URL },
        description: planConfig.description,
        metadata: { userId: req.user.id, plan },
      }),
    });

    if (!response.ok) {
      console.error("Payment create request to YooKassa failed", {
        status: response.status,
        userId: req.user.id,
        plan,
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
        plan,
        amountKopeks: planConfig.priceKopeks,
        currency: "RUB",
        confirmationUrl: data.confirmation.confirmation_url,
        paid: false,
      },
    });

    res.json({ paymentId: payment.providerPaymentId, confirmationUrl: payment.confirmationUrl });
  } catch (error) {
    console.error(`Payment ${plan}/create failed`, {
      code: error?.code || "UNKNOWN_ERROR",
      status: error?.status || 500,
      message: error?.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: "Ошибка при создании платежа" });
  }
};

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
        !PLAN_CONFIG[localPayment.plan] ||
        yookassaPayment.amount?.value !== PLAN_CONFIG[localPayment.plan].priceRub ||
        yookassaPayment.amount?.currency !== "RUB" ||
        String(yookassaPayment.metadata?.userId) !== String(localPayment.userId) ||
        yookassaPayment.metadata?.plan !== localPayment.plan ||
        localPayment.amountKopeks !== PLAN_CONFIG[localPayment.plan].priceKopeks ||
        localPayment.currency !== "RUB"
      ) {
        return res.status(200).json({ ok: true });
      }

      if (localPayment.paid) return res.status(200).json({ ok: true });

      const planExpiresAt = PLAN_CONFIG[localPayment.plan].getPlanExpiresAt();

      await prisma.$transaction([
        prisma.payment.update({
          where: { id: localPayment.id },
          data: { status: "succeeded", paid: true },
        }),
        prisma.user.update({
          where: { id: localPayment.userId },
          data: {
            plan: localPayment.plan,
            subscriptionStatus: "active",
            planExpiresAt,
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

router.post("/focus/create", paymentCreateLimiter, createPaymentHandler("focus"));

router.post("/forever/activate", paymentCreateLimiter, async (req, res) => {
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

    if (isActivePlan(user, "forever")) {
      return res.json(user);
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        plan: "forever",
        subscriptionStatus: "active",
        planExpiresAt: null,
      },
      select: {
        plan: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    });

    res.json(updatedUser);
  } catch (error) {
    console.error("Payment forever/activate failed", {
      code: error?.code || "UNKNOWN_ERROR",
      status: error?.status || 500,
      message: error?.message,
      userId: req.user?.id,
    });
    res.status(500).json({ error: "Ошибка при активации тарифа" });
  }
});

export default router;
