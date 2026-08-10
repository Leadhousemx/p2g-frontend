// src/services/api.js
import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "https://api.brentrix.com/api";

const API = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

// Interceptor para enviar el token automáticamente
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;
