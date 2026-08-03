// src/api/client.ts
import axios from "axios";

console.log("API URL:", import.meta.env.VITE_API_URL);

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

// Smart JWT: prefer group-scoped token for group-specific routes,
// but user-only methods (DELETE on root group) always use access_token
client.interceptors.request.use(
  (config) => {
    const url = config.url ?? "";
    const method = (config.method ?? "").toLowerCase();
    const groupMatch = url.match(/\/api\/groups\/([^/]+)/);
    const isRootGroupDelete = groupMatch && method === "delete" && !url.replace(`/api/groups/${groupMatch[1]}`, "").startsWith("/");
    if (groupMatch && !isRootGroupDelete) {
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
    // Only force-logout on 401 if it's NOT an auth endpoint (avoid login redirect loop)
    const url = error.config?.url ?? "";
    if (error.response?.status === 401 && !url.includes("/auth/")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default client;
