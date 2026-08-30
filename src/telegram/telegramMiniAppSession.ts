const AUTO_RESTORE_BLOCKED_KEY = "glowy_telegram_auto_restore_blocked";

const getStorage = () => {
  if (typeof window === "undefined") return null;
  return window.localStorage;
};

export const blockTelegramMiniAppAutoRestore = () => {
  try {
    getStorage()?.setItem(AUTO_RESTORE_BLOCKED_KEY, "1");
  } catch {
    // Logout must still complete when browser storage is unavailable.
  }
};

export const allowTelegramMiniAppAutoRestore = () => {
  try {
    getStorage()?.removeItem(AUTO_RESTORE_BLOCKED_KEY);
  } catch {
    // A successful login must not fail because browser storage is unavailable.
  }
};

export const isTelegramMiniAppAutoRestoreBlocked = () => {
  try {
    return getStorage()?.getItem(AUTO_RESTORE_BLOCKED_KEY) === "1";
  } catch {
    return false;
  }
};
