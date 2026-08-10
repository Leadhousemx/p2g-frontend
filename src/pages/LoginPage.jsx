import { logger } from "../lib/logger";
// src/pages/LoginPage.jsx

import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth-context";
import apiClient from "../api/axiosConfig";
import { getCsrfToken, refreshCsrfToken } from "../services/csrfService";
import { removeToken, setRefreshToken, setToken } from "../utils/tokenManager";
import axios from "axios";
import { Lock, Mail } from "lucide-react";
import logo from "../assets/logo brentrix sin fondo.png";
import { LoginBackground } from "../components/LoginBackground";
import { consumeSessionNotice, resetSessionInvalidationState } from "../services/authSessionService";

// Obtener API URL desde variables de entorno
const API_URL = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://api.brentrix.com');

const ALLOWED_REDIRECT_PREFIXES = [
  "/dashboard",
  "/cotizaciones",
  "/compras",
  "/clientes",
  "/proveedores",
  "/pagos",
  "/catalogos",
  "/catalogo",
  "/paquetes",
  "/negocios",
  "/reportes",
  "/salones",
  "/configuracion",
  "/perfil",
];

function sanitizeRedirectPath(value) {
  if (!value || typeof value !== "string") return "/dashboard";
  if (!value.startsWith("/")) return "/dashboard";
  if (value.startsWith("//")) return "/dashboard";

  const lower = value.toLowerCase();
  if (lower.includes("://") || lower.startsWith("javascript:")) {
    return "/dashboard";
  }

  const isAllowed = ALLOWED_REDIRECT_PREFIXES.some(
    (prefix) => lower === prefix || lower.startsWith(`${prefix}/`) || lower.startsWith(`${prefix}?`)
  );

  return isAllowed ? value : "/dashboard";
}


export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setStatus, setUser, setCompany } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const pendingMessage = consumeSessionNotice();
    if (pendingMessage) {
      setServerError(pendingMessage);
    }
  }, []);

  const persistTokens = (accessToken, refreshToken) => {
    try {
      if (accessToken) {
        setToken(accessToken);
        if (refreshToken) {
          setRefreshToken(refreshToken);
        }
      } else {
        removeToken();
      }
    } catch (storageError) {
      logger.warn("[Login] Token storage failed", {
        message: storageError?.message || "unknown",
      });
    }
  };


  // Log config info in dev
  if (import.meta.env.DEV) {
    logger.debug("[Login] API URL configurada", { apiUrl: API_URL });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = {};
    setServerError("");
    if (!email) {
      validationErrors.email = "El correo electrónico es obligatorio";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      validationErrors.email = "Formato de correo inválido";
    }
    if (!password) {
      validationErrors.password = "La contraseña es obligatoria";
    }
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;
    setLoading(true);
    try {
      // ✅ PASO 1: Obtener CSRF token ANTES de hacer login
      console.log('🔐 [LOGIN] Paso 1: Obtener CSRF token');
      await getCsrfToken(API_URL);
      logger.debug("[Login] CSRF token obtenido");

      // ✅ PASO 2: Hacer login con apiClient (el interceptor agregará el X-CSRF-Token automáticamente)
      console.log('🔐 [LOGIN] Paso 2: POST /api/auth/login');
      const res = await apiClient.post("/api/auth/login", { email, password });
      const { accessToken, refreshToken, user, company, empresa } = res.data || {};
      persistTokens(accessToken, refreshToken);

      // ✅ PASO 3: Sincronizar CSRF token/cookie para requests mutables posteriores
      await refreshCsrfToken(API_URL);

      console.log('✅ [LOGIN] Success');
      resetSessionInvalidationState();
      setStatus && setStatus("authenticated");
      setUser && setUser(user || null);
      setCompany && setCompany(company || empresa || null);
      // Redirección inteligente
      const params = new URLSearchParams(location.search);
      const redirect = sanitizeRedirectPath(params.get("redirect"));
      navigate(redirect, { replace: true });
    } catch (err) {
      setStatus && setStatus("unauthenticated");
      if (axios.isAxiosError(err) && !err.response) {
        setServerError("No se pudo conectar con el API. Revisa red/proxy.");
        logger.warn("[Login] API login network error", {
          message: err?.message || "unknown",
          code: err?.code || "",
        });
      } else {
        const backendMsg = err?.response?.data?.msg || err?.response?.data?.message;
        setServerError(backendMsg || "Error al iniciar sesión");
        logger.warn("[Login] API login rejected", {
          status: err?.response?.status || 0,
          message: err?.message || "unknown",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full min-h-screen flex items-center justify-center overflow-hidden">
      {/* Premium Background - Lightweight CSS-only */}
      <LoginBackground />

      {/* Content Container */}
      <div className="relative z-10 w-full px-4 flex items-center justify-center py-8">

        {/* Card wrapper — translate-y on mobile only: 50px downward breathing room */}
        <div className="relative w-full max-w-md translate-y-[50px] md:translate-y-0">

          {/* Outer ambient — wide, very soft; creates the "floating in nebula" zone */}
          <div
            className="pointer-events-none absolute -inset-20 rounded-3xl"
            style={{
              background: 'rgba(48,18,165,0.07)',
              filter: 'blur(96px)',
            }}
          />

          {/* Inner ambient — tighter, slightly stronger; defines card separation */}
          <div
            className="pointer-events-none absolute -inset-8 rounded-3xl"
            style={{
              background: 'rgba(62,30,190,0.13)',
              filter: 'blur(60px)',
            }}
          />

          {/* Glass card */}
          <div
            className={`relative z-10 rounded-3xl border border-white/[0.20] backdrop-blur-2xl p-8 sm:p-10 transition-all duration-500 ease-out transform ${
              mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{
              background:
                'linear-gradient(to bottom, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.034) 100%)',
              boxShadow:
                '0 0 0 1px rgba(255,255,255,0.14) inset, ' +
                '0 48px 96px rgba(0,0,0,0.65), ' +
                '0 0 72px rgba(55,25,175,0.14)',
            }}
          >
            {/* Logo Container */}
            <div className="flex justify-center mb-8">
              <img
                src={logo}
                alt="Logo Brentrix"
                className="animate-glow h-20 w-20 object-contain"
              />
            </div>

            {/* Heading */}
            <h1 className="text-center text-4xl font-extrabold text-white mb-2 tracking-tight">
              Iniciar sesión
            </h1>
            <p className="text-center text-sm text-white/60 mb-8">Accede a tu cuenta</p>

            {/* Server Error */}
            {serverError && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm text-center font-medium">
                {serverError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Input */}
              <div>
                <div className="relative">
                  <Mail
                    size={15}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    placeholder="Correo electrónico"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 pl-11 pr-4 border transition-all duration-200 focus:outline-none font-medium text-sm ${
                      errors.email
                        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                        : "border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 hover:border-white/40"
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-300 text-xs mt-1.5 font-medium">{errors.email}</p>
                )}
              </div>

              {/* Password Input */}
              <div>
                <div className="relative">
                  <Lock
                    size={15}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 pl-11 pr-4 border transition-all duration-200 focus:outline-none font-medium text-sm ${
                      errors.password
                        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                        : "border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 hover:border-white/40"
                    }`}
                  />
                </div>
                {errors.password && (
                  <p className="text-red-300 text-xs mt-1.5 font-medium">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 mt-6 rounded-lg font-semibold text-white text-sm bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Ingresando...
                  </span>
                ) : (
                  "Ingresar"
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-xs text-white/60 mt-6">
              ¿No tienes una cuenta?{" "}
              <Link
                to="/register"
                className="text-sky-300 hover:text-sky-200 font-semibold transition-colors"
              >
                Crea una ahora
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
