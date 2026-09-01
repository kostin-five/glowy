import express from "express";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import crypto from "crypto";
import {
  paymentCheckoutSchema,
  paymentPlanStateSchema,
  paymentWebhookAckSchema,
} from "@glowy/contracts";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { buildErrorEnvelope } from "../middleware/error.middleware.js";
import {
  isPaidForeverEnabled,
  toPublicPlanState,
} from "../services/billing/plan-entitlements.service.js";

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
  forever: {
    description: "вечный доступ Glowy Forever",
    alreadyActiveCode: "LIFETIME_PLAN_ALREADY_ACTIVE",
    alreadyActiveMessage: "У вас уже активен пожизненный тариф",
    getPlanExpiresAt: () => null,
  },
};

const getPlanConfig = (plan, env = process.env) => {
  const config = PLAN_CONFIG[plan];
  if (!config) return null;

  if (plan !== "forever") return config;

  const rawPriceRub = env.FOREVER_PRICE_RUB || "";
  const parsedPrice = Number(rawPriceRub);

  return {
    ...config,
    priceRub:
      Number.isFinite(parsedPrice) && parsedPrice > 0
        ? parsedPrice.toFixed(2)
        : "",
    priceKopeks:
      Number.isFinite(parsedPrice) && parsedPrice > 0
        ? Math.round(parsedPrice * 100)
        : 0,
  };
};

const isExpiredFocusUser = (user, currentTime = new Date()) =>
  user?.plan === "focus" &&
  user?.subscriptionStatus === "active" &&
  user?.planExpiresAt &&
  new Date(user.planExpiresAt).getTime() < currentTime.getTime();

const normalizePlanState = async (db, userId, user, currentTime) => {
  if (!user || !isExpiredFocusUser(user, currentTime)) {
    return user;
  }

  const updatedUser = await db.user.update({
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

const buildPaymentError = (req, error, code, extra = {}) =>
  buildErrorEnvelope(req, error, code, extra);

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
      code: "PAYMENT_RATE_LIMITED",
      requestId: req.requestId,
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

const createPaymentHandler = (
  plan,
  { db, fetchImpl, env, paidForeverEnabled, currentTime }
) => async (req, res) => {
  try {
    if (plan === "forever" && !paidForeverEnabled()) {
      return res
        .status(403)
        .json(
          buildPaymentError(
            req,
            "Тариф Forever пока недоступен для оформления",
            "PAID_FOREVER_DISABLED"
          )
        );
    }

    const planConfig = getPlanConfig(plan, env);
    if (!planConfig?.priceRub || !planConfig.priceKopeks) {
      return res
        .status(500)
        .json(
          buildPaymentError(
            req,
            "Ошибка конфигурации тарифа",
            "PAYMENT_PLAN_CONFIG_INVALID"
          )
        );
    }
    const rawUser = await db.user.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    });
    const user = await normalizePlanState(
      db,
      req.user.id,
      rawUser,
      currentTime()
    );

    if (isActivePlan(user, "forever")) {
      return res
        .status(409)
        .json(
          buildPaymentError(
            req,
            "У вас уже активен пожизненный тариф",
            "LIFETIME_PLAN_ALREADY_ACTIVE"
          )
        );
    }

    if (isActivePlan(user, plan)) {
      return res.status(409).json(
        buildPaymentError(
          req,
          planConfig.alreadyActiveMessage,
          planConfig.alreadyActiveCode,
          { planExpiresAt: user.planExpiresAt }
        )
      );
    }

    const { YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY, YOOKASSA_RETURN_URL } = env;

    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY || !YOOKASSA_RETURN_URL) {
      return res
        .status(500)
        .json(
          buildPaymentError(
            req,
            "Ошибка конфигурации платежей",
            "PAYMENT_PROVIDER_CONFIG_INVALID"
          )
        );
    }

    const idempotenceKey = crypto.randomUUID();
    const authString = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");

    const response = await fetchImpl("https://api.yookassa.ru/v3/payments", {
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
      logger.error("payments.yookassa.create_rejected", {
        req,
        error: new Error("YooKassa rejected payment creation"),
        statusCode: response.status,
      });
      return res
        .status(500)
        .json(
          buildPaymentError(
            req,
            "Ошибка инициализации платежа",
            "PAYMENT_CREATE_REJECTED"
          )
        );
    }

    const data = await response.json();

    if (!data.id || !data.status || !data.confirmation?.confirmation_url) {
      return res
        .status(500)
        .json(
          buildPaymentError(
            req,
            "Ошибка инициализации платежа",
            "PAYMENT_PROVIDER_RESPONSE_INVALID"
          )
        );
    }

    const payment = await db.payment.create({
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

    res.json(
      paymentCheckoutSchema.parse({
        paymentId: payment.providerPaymentId,
        confirmationUrl: payment.confirmationUrl,
      })
    );
  } catch (error) {
    logger.error("payments.create.failed", { req, error, statusCode: 500 });
    res
      .status(500)
      .json(
        buildPaymentError(
          req,
          "Ошибка при создании платежа",
          "PAYMENT_CREATE_FAILED"
        )
      );
  }
};

export const createPaymentRouter = ({
  db = prisma,
  authenticate = authMiddleware,
  fetchImpl = globalThis.fetch,
  env = process.env,
  paidForeverEnabled = isPaidForeverEnabled,
  currentTime = () => new Date(),
} = {}) => {
const router = express.Router();

router.post("/yookassa/webhook", async (req, res) => {
  try {
    const { YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY } = env;
    if (!YOOKASSA_SHOP_ID || !YOOKASSA_SECRET_KEY) {
      return res
        .status(500)
        .json(
          buildPaymentError(
            req,
            "Ошибка конфигурации",
            "PAYMENT_PROVIDER_CONFIG_INVALID"
          )
        );
    }

    const event = req.body;
    if (!event || !event.object || !event.object.id) {
      return res.status(200).json(paymentWebhookAckSchema.parse({ ok: true }));
    }

    const paymentId = event.object.id;

    if (event.event !== "payment.succeeded" && event.event !== "payment.canceled") {
      return res.status(200).json(paymentWebhookAckSchema.parse({ ok: true }));
    }

    const authString = Buffer.from(`${YOOKASSA_SHOP_ID}:${YOOKASSA_SECRET_KEY}`).toString("base64");
    const response = await fetchImpl(`https://api.yookassa.ru/v3/payments/${paymentId}`, {
      headers: { Authorization: `Basic ${authString}` },
    });

    if (!response.ok) {
      return res
        .status(500)
        .json(
          buildPaymentError(
            req,
            "Ошибка проверки платежа",
            "PAYMENT_VERIFICATION_FAILED"
          )
        );
    }

    const yookassaPayment = await response.json();
    const localPayment = await db.payment.findFirst({
      where: { providerPaymentId: paymentId },
    });

    if (!localPayment) {
      return res.status(200).json(paymentWebhookAckSchema.parse({ ok: true }));
    }

    const localPlanConfig = getPlanConfig(localPayment.plan, env);

    if (event.event === "payment.succeeded" && yookassaPayment.status === "succeeded") {
      if (
        yookassaPayment.id !== paymentId ||
        !localPlanConfig ||
        yookassaPayment.amount?.value !== localPlanConfig.priceRub ||
        yookassaPayment.amount?.currency !== "RUB" ||
        String(yookassaPayment.metadata?.userId) !== String(localPayment.userId) ||
        yookassaPayment.metadata?.plan !== localPayment.plan ||
        localPayment.amountKopeks !== localPlanConfig.priceKopeks ||
        localPayment.currency !== "RUB"
      ) {
        return res.status(200).json(paymentWebhookAckSchema.parse({ ok: true }));
      }

      if (localPayment.paid) {
        return res.status(200).json(paymentWebhookAckSchema.parse({ ok: true }));
      }

      const planExpiresAt = localPlanConfig.getPlanExpiresAt();

      await db.$transaction([
        db.payment.update({
          where: { id: localPayment.id },
          data: { status: "succeeded", paid: true },
        }),
        db.user.update({
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
        await db.payment.update({
          where: { id: localPayment.id },
          data: { status: "canceled", paid: false },
        });
      }
    }

    res.status(200).json(paymentWebhookAckSchema.parse({ ok: true }));
  } catch (error) {
    logger.error("payments.webhook.failed", { req, error, statusCode: 500 });
    res
      .status(500)
      .json(
        buildPaymentError(
          req,
          "Ошибка обработки webhook",
          "PAYMENT_WEBHOOK_FAILED"
        )
      );
  }
});

router.use(authenticate);

router.get("/current-plan", async (req, res) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: {
        plan: true,
        subscriptionStatus: true,
        planExpiresAt: true,
      },
    });

    if (!user) {
      return res
        .status(404)
        .json(
          buildPaymentError(
            req,
            "Пользователь не найден",
            "PAYMENT_USER_NOT_FOUND"
          )
        );
    }

    const normalizedUser = await normalizePlanState(
      db,
      req.user.id,
      user,
      currentTime()
    );

    res.json(paymentPlanStateSchema.parse(toPublicPlanState(normalizedUser)));
  } catch (error) {
    logger.error("payments.current_plan.failed", { req, error, statusCode: 500 });
    res
      .status(500)
      .json(
        buildPaymentError(
          req,
          "Ошибка при загрузке данных плана",
          "PAYMENT_PLAN_LOAD_FAILED"
        )
      );
  }
});

const paymentHandlerDependencies = {
  db,
  fetchImpl,
  env,
  paidForeverEnabled,
  currentTime,
};

router.post(
  "/focus/create",
  paymentCreateLimiter,
  createPaymentHandler("focus", paymentHandlerDependencies)
);
router.post(
  "/forever/create",
  paymentCreateLimiter,
  createPaymentHandler("forever", paymentHandlerDependencies)
);

router.post("/forever/activate", paymentCreateLimiter, (req, res) => {
  res
    .status(410)
    .json(
      buildPaymentError(
        req,
        "Бесплатная активация Forever больше недоступна",
        "PLAN_UNAVAILABLE"
      )
    );
});

return router;
};

export default createPaymentRouter();
