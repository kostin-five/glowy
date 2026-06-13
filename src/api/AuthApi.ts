import axios from "axios";
import type { Auth, LoginData } from "../types";
import { attachUnauthorizedInterceptor } from "./authSession";

const url = "https://glowy-backend.onrender.com/api/auth";

const authInstance = axios.create({
  baseURL: url,
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
};
