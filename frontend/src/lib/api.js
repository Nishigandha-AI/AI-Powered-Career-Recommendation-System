import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API, withCredentials: true });

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err?.config?.url || "";
    const isAuthCheck = url.includes("/auth/me");
    if (err?.response?.status === 401 && !isAuthCheck && !window.location.pathname.startsWith("/sign")) {
      window.location.href = "/signin";
    }
    return Promise.reject(err);
  }
);

export default api;
