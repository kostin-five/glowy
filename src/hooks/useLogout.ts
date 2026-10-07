import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthApi } from "../api/AuthApi";
import { clearLocalAuthSession } from "../api/authSession";
import { useTelegramMiniApp } from "../telegram/telegramMiniAppContext";
import { blockTelegramMiniAppAutoRestore } from "../telegram/telegramMiniAppSession";
import { useAuthStore } from "../store/useAuthStore";

export const useLogout = () => {
  const navigate = useNavigate();
  const { isTelegramMiniApp } = useTelegramMiniApp();

  return useCallback(async () => {
    try {
      if (!useAuthStore.getState().isGuest) await AuthApi.logoutRequest();
    } catch {
      window.alert("Не удалось завершить серверную сессию. Проверь соединение и попробуй ещё раз.");
      return;
    }
    if (isTelegramMiniApp) blockTelegramMiniAppAutoRestore();
    clearLocalAuthSession();
    navigate("/login", { replace: true });
  }, [isTelegramMiniApp, navigate]);
};
