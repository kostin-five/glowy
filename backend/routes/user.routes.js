import express from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  DEFAULT_AVATAR_ID,
  isKnownAiTone,
  isKnownAvatarId,
} from "../constants/profile.constants.js";
import { isFocusEntitled } from "../services/feature-entitlements.service.js";
import {
  createTelegramLinkService,
  TelegramLinkError,
} from "../services/telegram/telegram-link.service.js";

const AUTH_COOKIE_NAME = "glowy_token";
const AUTH_COOKIE_CLEAR_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
};

export const validatePreferencePatch = (bodyValue) => {
  const body = bodyValue && typeof bodyValue === "object" ? bodyValue : {};
  const allowedKeys = ["avatarId", "aiTone", "focusBetaEnabled"];
  const suppliedKeys = Object.keys(body);

  if (!suppliedKeys.length || suppliedKeys.some((key) => !allowedKeys.includes(key))) {
    return { error: "Переданы неизвестные или пустые настройки" };
  }
  if ("avatarId" in body && !isKnownAvatarId(body.avatarId)) {
    return { error: "Неизвестный вариант аватара" };
  }
  if ("aiTone" in body && !isKnownAiTone(body.aiTone)) {
    return { error: "Неизвестный стиль общения" };
  }
  if (
    "focusBetaEnabled" in body &&
    typeof body.focusBetaEnabled !== "boolean"
  ) {
    return { error: "Некорректное значение beta-настроек" };
  }

  return {
    data: Object.fromEntries(
      allowedKeys.filter((key) => key in body).map((key) => [key, body[key]])
    ),
  };
};

const toPreferenceResponse = (user) => {
  const canUseFocusFeatures = isFocusEntitled(user);

  return {
    avatarId: isKnownAvatarId(user.avatarId)
      ? user.avatarId || DEFAULT_AVATAR_ID
      : DEFAULT_AVATAR_ID,
    aiTone:
      canUseFocusFeatures && isKnownAiTone(user.aiTone) ? user.aiTone : "calm",
    focusBetaEnabled: canUseFocusFeatures && user.focusBetaEnabled,
    canUseFocusFeatures,
    focusBetaAvailable: canUseFocusFeatures,
  };
};

export const createUserRouter = ({
  db = prisma,
  telegramLinks = createTelegramLinkService({ db }),
} = {}) => {
  const router = express.Router();

  router.use(authMiddleware);

  router.get("/preferences", async (req, res) => {
    try {
      const user = await db.user.findUnique({
        where: { id: req.user.id },
        select: {
          avatarId: true,
          aiTone: true,
          focusBetaEnabled: true,
          plan: true,
          subscriptionStatus: true,
          planExpiresAt: true,
        },
      });

      if (!user) return res.status(404).json({ error: "Пользователь не найден" });
      return res.json(toPreferenceResponse(user));
    } catch (error) {
      logger.error("user.preferences.fetch_failed", {
        req,
        error,
        statusCode: 500,
      });
      return res.status(500).json({ error: "Не удалось загрузить настройки" });
    }
  });

  router.patch("/preferences", async (req, res) => {
    const validation = validatePreferencePatch(req.body);
    if (validation.error) return res.status(400).json({ error: validation.error });

    try {
      const currentUser = await db.user.findUnique({
        where: { id: req.user.id },
        select: {
          avatarId: true,
          aiTone: true,
          focusBetaEnabled: true,
          plan: true,
          subscriptionStatus: true,
          planExpiresAt: true,
        },
      });

      if (!currentUser) {
        return res.status(404).json({ error: "Пользователь не найден" });
      }

      if (
        validation.data.focusBetaEnabled === true &&
        !isFocusEntitled(currentUser)
      ) {
        return res.status(403).json({
          error: "Beta-функции доступны только активному тарифу Focus или Founder",
        });
      }

      if ("aiTone" in validation.data && !isFocusEntitled(currentUser)) {
        return res.status(403).json({
          error: "Настройка тона доступна только на тарифах Focus и Founder",
        });
      }

      const updatedUser = await db.user.update({
        where: { id: req.user.id },
        data: validation.data,
        select: {
          avatarId: true,
          aiTone: true,
          focusBetaEnabled: true,
          plan: true,
          subscriptionStatus: true,
          planExpiresAt: true,
        },
      });

      return res.json(toPreferenceResponse(updatedUser));
    } catch (error) {
      logger.error("user.preferences.update_failed", {
        req,
        error,
        statusCode: 500,
      });
      return res.status(500).json({ error: "Не удалось сохранить настройки" });
    }
  });

  router.get("/telegram", async (req, res) => {
    try {
      return res.json(await telegramLinks.getStatus(req.user.id));
    } catch (error) {
      logger.error("user.telegram.status_failed", { req, error, statusCode: 500 });
      return res.status(500).json({ error: "Не удалось загрузить подключение Telegram" });
    }
  });

  router.post("/telegram/link-code", async (req, res) => {
    try {
      return res.status(201).json(await telegramLinks.createCode(req.user.id));
    } catch (error) {
      const status = error instanceof TelegramLinkError ? error.status : 500;
      logger.error("user.telegram.link_code_failed", { req, error, statusCode: status });
      return res.status(status).json({
        error:
          error instanceof TelegramLinkError
            ? error.message
            : "Не удалось создать код подключения",
      });
    }
  });

  router.delete("/telegram", async (req, res) => {
    try {
      return res.json(await telegramLinks.unlinkUser(req.user.id));
    } catch (error) {
      logger.error("user.telegram.unlink_failed", { req, error, statusCode: 500 });
      return res.status(500).json({ error: "Не удалось отключить Telegram" });
    }
  });

router.get("/progress", async (req, res) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: {
        xp: true,
        level: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json(user);
  } catch (e) {
    logger.error("user.progress.fetch_failed", { req, error: e, statusCode: 500 });
    res.status(500).json({ error: "Ошибка при загрузке прогресса" });
  }
});

router.put(
  "/energy",
  [
    body("currentEnergy").optional().isNumeric().withMessage("Должно быть числом"),
    body("energyLimit").optional().isNumeric().withMessage("Должно быть числом"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const rawEnergy = req.body.currentEnergy ?? req.body.energyLimit;
      const currentEnergy = Math.min(100, Math.max(0, Number(rawEnergy)));

      if (Number.isNaN(currentEnergy)) {
        return res.status(400).json({ error: "Некорректный уровень энергии" });
      }

      const updatedUser = await db.user.update({
        where: { id: req.user.id },
        data: { currentEnergy },
      });
      res.json(updatedUser);
    } catch (e) {
      logger.error("user.energy.update_failed", { req, error: e, statusCode: 500 });
      res.status(500).json({ error: "Ошибка при обновлении" });
    }
  }
);

router.delete("/account", async (req, res) => {
  try {
    const user = await db.user.findUnique({
      where: { id: req.user.id },
      select: { id: true },
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    await db.user.delete({
      where: { id: req.user.id },
    });
    res.clearCookie(AUTH_COOKIE_NAME, AUTH_COOKIE_CLEAR_OPTIONS);
    return res.json({ ok: true });
  } catch (error) {
    logger.error("user.account.delete_failed", { req, error, statusCode: 500 });
    return res.status(500).json({ error: "Не удалось удалить аккаунт" });
  }
  });

  return router;
};

export default createUserRouter();
