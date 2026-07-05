import axios from "axios";
import { API_BASE_URL } from "./config";

export const PaymentApi = {
  createFocusPayment: async () => {
    const { data } = await axios.post(
      `${API_BASE_URL}/payments/focus/create`,
      undefined,
      { withCredentials: true }
    );
    return data;
  },
  activateForeverPlan: async () => {
    const { data } = await axios.post(
      `${API_BASE_URL}/payments/forever/activate`,
      undefined,
      { withCredentials: true }
    );
    return data;
  },
  getCurrentPlan: async () => {
    const { data } = await axios.get(`${API_BASE_URL}/payments/current-plan`, {
      withCredentials: true,
    });
    return data;
  },
};
