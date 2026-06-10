import axios from "axios";
import type { Auth, LoginData } from "../types";

const url = "https://glowy-backend.onrender.com/api/auth";

export const AuthApi = {
  async registerRequest(data: Auth) {
    const response = await axios.post(`${url}/register`, {
      ...data,
      login: data.email,
    });
    return response.data;
  },

  async loginRequest(data: LoginData) {
    const response = await axios.post(`${url}/login`, {
      ...data,
      login: data.email,
    });
    return response.data;
  },
};
