const rawApiUrl =
  import.meta.env.VITE_API_URL || "https://glowy-backend.onrender.com/api";

export const API_BASE_URL = rawApiUrl.replace(/\/$/, "");
