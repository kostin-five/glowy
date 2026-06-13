import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AuthApi } from "../api/AuthApi";
import { clearLocalAuthSession } from "../api/authSession";

export const useLogout = () => {
  const navigate = useNavigate();

  return useCallback(async () => {
    try {
      await AuthApi.logoutRequest();
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      clearLocalAuthSession();
      navigate("/login", { replace: true });
    }
  }, [navigate]);
};
