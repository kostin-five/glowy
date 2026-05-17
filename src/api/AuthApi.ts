import axios from "axios";
import type { Auth } from "../types";

const url = "http://localhost:3001/api/auth";

export const AuthApi = {
  async registerRequest(data: Auth) {
    const response = await axios.post(`${url}/register`, data);
    return response.data;
  },

  async loginRequest(data: Auth) {
    const response = await axios.post(`${url}/login`, data);
    return response.data;
  },
};
