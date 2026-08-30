import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthApi } from "../api/AuthApi";
import { clearLocalAuthSession } from "../api/authSession";
import { useTelegramMiniApp } from "../telegram/telegramMiniAppContext";
import { blockTelegramMiniAppAutoRestore } from "../telegram/telegramMiniAppSession";

export const useLogout = () => {
  const navigate = useNavigate();
  const { isTelegramMiniApp } = useTelegramMiniApp();

  return useCallback(async () => {
    try {
      await AuthApi.logoutRequest();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      if (isTelegramMiniApp) {
        blockTelegramMiniAppAutoRestore();
      }
      clearLocalAuthSession();
      navigate("/login", { replace: true });
    }
  }, [isTelegramMiniApp, navigate]);
};
