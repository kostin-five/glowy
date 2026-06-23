import axios from "axios";
import type { Auth, LoginData } from "../types";
import { attachUnauthorizedInterceptor } from "./authSession";
import { API_BASE_URL } from "./config";

const authInstance = axios.create({
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
    return response.data;
  },

  async loginRequest(data: LoginData) {
    const response = await authInstance.post("/login", {
      ...data,
      login: data.email,
    });
    return response.data;
  },

  async logoutRequest() {
    const response = await authInstance.post("/logout");
    return response.data;
  },

  async meRequest() {
    const response = await authInstance.get("/me");
    return response.data;
  },
};
