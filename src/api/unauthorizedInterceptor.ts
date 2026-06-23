import axios from "axios";
import type { AxiosInstance } from "axios";

export const attachUnauthorizedInterceptor = (api: AxiosInstance) => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        window.dispatchEvent(new CustomEvent("glowy:unauthorized"));
      }

      return Promise.reject(error);
    }
  );
};
