import axios, { AxiosInstance, AxiosError } from 'axios';
import { clearCsrfToken, ensureCsrfToken, refreshCsrfToken } from '../services/csrfService';
import { getRefreshToken, getToken, removeToken, setRefreshToken, setToken } from '../utils/tokenManager';
import {
  handleSessionInvalidation,
  INVALID_SESSION_CODE,
  SESSION_REPLACED_CODE,
  TOKEN_EXPIRED_CODE,
} from '../services/authSessionService';

/**
 * CONFIGURACIÓN POR ENTORNO
 *
 * DESARROLLO:
 * - API_URL = http://localhost:5000
 * - withCredentials = true (enviar cookies)
 * - SameSite = Lax (en cookies)
 *
 * PRODUCCIÓN:
 * - API_URL = https://api.brentrix.com
 * - withCredentials = true (enviar cookies)
 * - SameSite = None (en cookies - permite subdominios)
 */

// Detectar entorno desde variables de entorno
const isDevelopment = import.meta.env.DEV;
const API_URL = isDevelopment
  ? ''
  : (import.meta.env.VITE_API_URL || 'https://api.brentrix.com');

console.log(`📡 API URL configurada: ${API_URL}`);
console.log(`🌍 Entorno: ${isDevelopment ? 'DESARROLLO' : 'PRODUCCIÓN'}`);

/**
 * Crear cliente Axios con configuración base
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, // CRUCIAL: envía cookies en todos los requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

const REFRESH_ENDPOINT = '/api/auth/refresh';
const PUBLIC_AUTH_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/register-company',
  '/api/auth/accept-invite',
];

let activeRefreshPromise: Promise<string> | null = null;

const normalizeCode = (value: unknown): string => String(value || '').trim().toUpperCase();

const isAbsoluteHttpUrl = (value?: string): boolean => Boolean(value && /^https?:\/\//i.test(value));

const getPathFromUrl = (url?: string): string => {
  if (!url) return '';
  if (isAbsoluteHttpUrl(url)) {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
  return url;
};

const isRefreshRequest = (url?: string): boolean => {
  const path = getPathFromUrl(url);
  return path.endsWith(REFRESH_ENDPOINT);
};

const isPublicAuthRequest = (url?: string): boolean => {
  const path = getPathFromUrl(url);
  return PUBLIC_AUTH_ENDPOINTS.some((publicPath) => path.endsWith(publicPath));
};

const extractAccessToken = (payload: any): string | null => {
  const candidates = [
    payload?.accessToken,
    payload?.token,
    payload?.data?.accessToken,
    payload?.data?.token,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.split('.').length === 3) {
      return candidate;
    }
  }

  return null;
};

const extractRefreshToken = (payload: any): string | null => {
  const candidates = [
    payload?.refreshToken,
    payload?.data?.refreshToken,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.split('.').length === 3) {
      return candidate;
    }
  }

  return null;
};

export async function refreshAccessToken(): Promise<string> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  activeRefreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    const requestBody = refreshToken ? { refreshToken } : {};

    const refreshUrl = `${API_URL}${REFRESH_ENDPOINT}`;
    const response = await axios.post(refreshUrl, requestBody, {
      withCredentials: true,
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const nextAccessToken = extractAccessToken(response.data);
    if (!nextAccessToken) {
      throw new Error('Refresh response did not include a valid access token');
    }

    setToken(nextAccessToken);

    const nextRefreshToken = extractRefreshToken(response.data);
    if (nextRefreshToken) {
      setRefreshToken(nextRefreshToken);
    }

    return nextAccessToken;
  })().finally(() => {
    activeRefreshPromise = null;
  });

  return activeRefreshPromise;
}

const normalizeApiPath = (url?: string): string | undefined => {
  if (!url) return url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/api/')) return url;
  if (url === '/api') return url;
  if (url.startsWith('/')) return `/api${url}`;
  return `/api/${url}`;
};

/**
 * ===============================================
 * INTERCEPTOR DE REQUEST
 * ===============================================
 *
 * Para cada request POST, PUT, DELETE:
 * 1. Verificar que existe CSRF token en memoria
 * 2. Si no existe: obtenerlo del backend
 * 3. Agregar header X-CSRF-Token con el token
 */
apiClient.interceptors.request.use(
  async (config) => {
    config.url = normalizeApiPath(config.url);

    const accessToken = getToken();
    if (accessToken) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${accessToken}`;
    }

    // Solo para requests que modifican datos (POST, PUT, DELETE, PATCH)
    const mutatingMethods = ['post', 'put', 'delete', 'patch'];

    if (mutatingMethods.includes(config.method?.toLowerCase() || '')) {
      console.log(`📤 [${config.method?.toUpperCase()}] ${config.url}`);

      const csrfToken = await ensureCsrfToken(API_URL);
      console.log(`   → CSRF token ready: ${csrfToken.substring(0, 20)}...`);

      // Agregar token al header
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = csrfToken;
      console.log('   ✅ Header X-CSRF-Token agregado');
    }

    return config;
  },
  (error) => {
    console.error('❌ Error en request interceptor:', error);
    return Promise.reject(error);
  }
);

/**
 * ===============================================
 * INTERCEPTOR DE RESPONSE
 * ===============================================
 *
 * Manejo de errores específicos:
 * - 403 CSRF: refrescar token y reintentar
 * - 401 Unauthorized: logout automático
 * - Otros: pasar error al componente
 */
apiClient.interceptors.response.use(
  (response) => {
    // Éxito, pasar respuesta como está
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;
    const status = Number(error.response?.status || 0);
    const code = normalizeCode((error.response?.data as any)?.code);
    const responseMessage = String((error.response?.data as any)?.message || (error.response?.data as any)?.msg || '').trim();
    const method = String(originalRequest?.method || '').toLowerCase();
    const requestUrl = originalRequest?.url;
    const skipRefreshFlow = Boolean(originalRequest?._skipRefresh);
    const isPublicAuthFlow = isPublicAuthRequest(requestUrl);
    const mutatingMethods = ['post', 'put', 'delete', 'patch'];
    const csrfErrorCodes = [
      'MISSING_CSRF_COOKIE',
      'MISSING_CSRF_HEADER',
      'CSRF_TOKEN_MISMATCH',
      'INVALID_CSRF_TOKEN',
      'EBADCSRFTOKEN',
    ];
    const shouldAttemptCsrfRefresh =
      status === 403 &&
      mutatingMethods.includes(method) &&
      (!code || csrfErrorCodes.includes(code)) &&
      !skipRefreshFlow;
    const shouldForceLogoutForSessionInvalidation =
      status === 401 &&
      !isPublicAuthFlow &&
      (code === SESSION_REPLACED_CODE || code === INVALID_SESSION_CODE);

    if (shouldForceLogoutForSessionInvalidation) {
      handleSessionInvalidation({
        code,
        message: responseMessage,
      });
      return Promise.reject(error);
    }

    // 403 - CSRF errors (solo primera vez para evitar loop infinito)
    if (
      shouldAttemptCsrfRefresh &&
      !originalRequest._csrfRetry
    ) {
      const errorCodeLabel = code || 'UNKNOWN_403';
      console.warn(`🔄 403 mutating request (${errorCodeLabel}), refrescando token y reintentando...`);
      originalRequest._csrfRetry = true;

      try {
        // Refrescar token
        const newToken = await refreshCsrfToken(API_URL);

        // Agregar nuevo token al header
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers['X-CSRF-Token'] = newToken;

        // Reintentar request original
        console.log('📤 Reintentando request con nuevo CSRF token...');
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error('❌ Fallo al refrescar CSRF token:', refreshError);
        return Promise.reject(refreshError);
      }
    }

    const shouldAttemptAccessRefresh =
      status === 401 &&
      code === TOKEN_EXPIRED_CODE &&
      !originalRequest?._authRetry &&
      !isRefreshRequest(requestUrl) &&
      !isPublicAuthFlow &&
      !skipRefreshFlow;

    if (shouldAttemptAccessRefresh) {
      originalRequest._authRetry = true;

      try {
        const freshAccessToken = await refreshAccessToken();

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${freshAccessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        const refreshStatus = Number((refreshError as any)?.response?.status || 0);
        const refreshCode = normalizeCode((refreshError as any)?.response?.data?.code);
        const refreshMessage = String((refreshError as any)?.response?.data?.message || (refreshError as any)?.response?.data?.msg || '').trim();

        if (
          refreshStatus === 401 ||
          refreshCode === SESSION_REPLACED_CODE ||
          refreshCode === INVALID_SESSION_CODE ||
          refreshCode === TOKEN_EXPIRED_CODE
        ) {
          console.error('❌ No fue posible refrescar sesión, cerrando sesión local');
          handleSessionInvalidation({
            code: refreshCode || TOKEN_EXPIRED_CODE,
            message: refreshMessage,
          });
        }

        return Promise.reject(refreshError);
      }
    }

    // 401 en endpoint de refresh o en request ya reintentado: sesión ya no recuperable
    if (status === 401 && !isPublicAuthFlow && (isRefreshRequest(requestUrl) || originalRequest?._authRetry)) {
      handleSessionInvalidation({
        code,
        message: responseMessage,
      });
    }

    // 402 — TRIAL_EXPIRED or COMMERCIAL_EXPIRED
    if (status === 402) {
      const errCode = normalizeCode((error.response?.data as any)?.error?.code);
      if (errCode === 'TRIAL_EXPIRED') {
        window.dispatchEvent(
          new CustomEvent('brentrix:trial-blocked', {
            detail: { code: 'TRIAL_EXPIRED', data: error.response?.data },
          }),
        );
      } else if (errCode === 'COMMERCIAL_EXPIRED') {
        window.dispatchEvent(
          new CustomEvent('brentrix:access-blocked', {
            detail: { code: 'COMMERCIAL_EXPIRED', data: error.response?.data },
          }),
        );
      }
    }

    // 403 — ACCOUNT_SUSPENDED or COMMERCIAL_SUSPENDED (not CSRF errors)
    // Both route to brentrix:access-blocked so CommercialBlockedPage handles them.
    if (status === 403 && !shouldAttemptCsrfRefresh && !originalRequest._csrfRetry) {
      const errCode = normalizeCode((error.response?.data as any)?.error?.code);
      if (errCode === 'ACCOUNT_SUSPENDED' || errCode === 'COMMERCIAL_SUSPENDED') {
        window.dispatchEvent(
          new CustomEvent('brentrix:access-blocked', {
            detail: { code: errCode, data: error.response?.data },
          }),
        );
      }
    }

    // 400 - Validation error
    if (error.response?.status === 400) {
      console.warn('⚠️  Validation error 400:', (error.response?.data as any));
      // Los componentes pueden mostrar estos errores al usuario
    }

    // Pasar error al componente
    return Promise.reject(error);
  }
);

export default apiClient;
