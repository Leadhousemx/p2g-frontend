
import axios from "axios";

const viteEnv = (import.meta as any).env || {};
export const api = axios.create({
  baseURL: viteEnv.VITE_API_URL,
  // withCredentials: true, // habilítalo si backend usa cookies
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth.token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getApiBaseUrl() { return viteEnv.VITE_API_URL; }
