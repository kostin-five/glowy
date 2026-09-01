import axios from "axios";
import {
  authLoginRequestSchema,
  authLogoutResponseSchema,
  authRegisterRequestSchema,
  safeUserSchema,
} from "@glowy/contracts";
import type { Auth, LoginData } from "../types";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { API_BASE_URL } from "./config";

const authInstance = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
});

const silentAuthInstance = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  withCredentials: true,
});

attachUnauthorizedInterceptor(authInstance);

export const AuthApi = {
  async registerRequest(data: Auth) {
    const response = await authInstance.post(
      "/register",
      authRegisterRequestSchema.parse(data)
    );
    return safeUserSchema.parse(response.data);
  },

  async loginRequest(data: LoginData) {
    const response = await authInstance.post(
      "/login",
      authLoginRequestSchema.parse(data)
    );
    return safeUserSchema.parse(response.data);
  },

  async logoutRequest() {
    const response = await authInstance.post("/logout");
    return authLogoutResponseSchema.parse(response.data);
  },

  async meRequest() {
    const response = await silentAuthInstance.get("/me");
    return safeUserSchema.parse(response.data);
  },
};
