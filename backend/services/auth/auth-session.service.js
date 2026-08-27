import jwt from "jsonwebtoken";

export const AUTH_COOKIE_NAME = "glowy_token";
export const WEB_SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
export const TELEGRAM_SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const getTelegramSessionHours = () => {
  const configured = Number(process.env.TELEGRAM_MINI_APP_SESSION_HOURS || 24);
  return Number.isFinite(configured)
    ? Math.min(24, Math.max(1, Math.floor(configured)))
    : 24;
};

export const SAFE_USER_SELECT = {
  id: true,
  name: true,
  email: true,
  xp: true,
  level: true,
  avatarId: true,
  aiTone: true,
};

const baseCookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "none",
  path: "/",
};

export const createAuthToken = (
  userId,
  {
    jwtSecret = process.env.JWT_SECRET,
    telegramConnectionId = null,
    expiresIn = telegramConnectionId ? `${getTelegramSessionHours()}h` : "30d",
  } = {}
) => {
  const payload = telegramConnectionId
    ? { id: userId, channel: "telegram-mini-app", telegramConnectionId }
    : { id: userId };
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

export const setAuthCookie = (
  res,
  token,
  { telegram = false } = {}
) => {
  res.cookie(AUTH_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: telegram
      ? getTelegramSessionHours() * 60 * 60 * 1000
      : WEB_SESSION_MAX_AGE_MS,
  });
};

export const clearAuthCookie = (res) => {
  res.clearCookie(AUTH_COOKIE_NAME, baseCookieOptions);
};

export const toSafeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  xp: user.xp,
  level: user.level,
  avatarId: user.avatarId,
  aiTone: user.aiTone,
});
