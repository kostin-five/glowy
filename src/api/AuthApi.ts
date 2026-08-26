import axios from "axios";
import type { AiTone, Auth, AvatarId, LoginData } from "../types";
import { attachUnauthorizedInterceptor } from "./unauthorizedInterceptor";
import { API_BASE_URL } from "./config";

type AuthUserResponse = {
  id: number;
  name: string;
  email: string;
  avatarId?: AvatarId;
  aiTone?: AiTone;
};

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
    const response = await authInstance.post("/register", {
      ...data,
      login: data.email,
    });
    return response.data as AuthUserResponse;
  },

  async loginRequest(data: LoginData) {
    const response = await authInstance.post("/login", {
      ...data,
      login: data.email,
    });
    return response.data as AuthUserResponse;
  },

  async logoutRequest() {
    const response = await authInstance.post("/logout");
    return response.data as { message?: string };
  },

  async meRequest() {
    const response = await silentAuthInstance.get("/me");
    return response.data as AuthUserResponse;
  },
};
