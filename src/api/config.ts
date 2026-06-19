const getApiUrl = () => {
  const url = import.meta.env.VITE_API_URL;

  if (import.meta.env.PROD && !url) {
    throw new Error("VITE_API_URL is required in production");
  }

  return (url || "http://localhost:3001/api").replace(/\/$/, "");
};

export const API_BASE_URL = getApiUrl();
