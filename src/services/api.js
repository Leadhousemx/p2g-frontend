// src/services/api.js
import axios from "axios";

// Aquí pones la URL base de tu backend
const API = axios.create({
  baseURL: "http://162.240.234.127:5000/api", // Cambia por tu dominio en producción
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
