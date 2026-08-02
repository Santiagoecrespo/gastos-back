// src/api/client.ts
import axios from "axios";

console.log("API URL:", import.meta.env.VITE_API_URL);

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Smart JWT: prefer group-scoped token for group-specific routes
client.interceptors.request.use(
  (config) => {
    const url = config.url ?? "";
    const groupMatch = url.match(/\/api\/groups\/([^/]+)/);
    if (groupMatch) {
      const groupToken = localStorage.getItem(`group_token_${groupMatch[1]}`);
      if (groupToken && config.headers) {
        config.headers.Authorization = `Bearer ${groupToken}`;
        return config;
      }
    }
    const token = localStorage.getItem("access_token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;
