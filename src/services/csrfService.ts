import axios from 'axios';

let csrfToken: string | null = null;
const CSRF_STORAGE_KEY = 'csrfToken';

const readStoredCsrfToken = (): string | null => {
  try {
    return localStorage.getItem(CSRF_STORAGE_KEY);
  } catch {
    return null;
  }
};

const writeStoredCsrfToken = (token: string): void => {
  try {
    localStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    // no-op (storage unavailable)
  }
};

const clearStoredCsrfToken = (): void => {
  try {
    localStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // no-op (storage unavailable)
  }
};

const extractCsrfToken = (data: any): string | null => {
  const candidates = [
    data?.csrfToken,
    data?.csrf_token,
    data?.token,
    data?.csrf?.token,
    data?.data?.csrfToken,
    data?.data?.token,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
};

/**
 * Obtener CSRF token del backend
 * El backend devuelve el token en JSON + en cookie (Set-Cookie header)
 *
 * IMPORTANTE:
 * - En desarrollo: GET http://localhost:5000/api/auth/csrf-token
 * - En producción: GET https://api.brentrix.com/api/auth/csrf-token
 * - SIEMPRE con withCredentials: true para que se guarde en cookies
 */
export const getCsrfToken = async (apiUrl: string): Promise<string> => {
  try {
    const url = `${apiUrl}/api/auth/csrf-token`;
    console.log(`🔐 Obtener CSRF token de: ${url}`);
    console.log(`🔐 withCredentials: true`);

    const response = await axios.get(url, {
      withCredentials: true, // CRUCIAL: permite que se guarde la cookie
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    console.log(`✅ Response status: ${response.status}`);
    csrfToken = extractCsrfToken(response.data);
    if (csrfToken) {
      writeStoredCsrfToken(csrfToken);
      console.log(`✅ CSRF token obtenido: ${csrfToken.substring(0, 20)}...`);
      return csrfToken;
    }

    throw new Error('CSRF token missing in /api/auth/csrf-token response');
  } catch (error: any) {
    console.error('❌ Error obteniendo CSRF token:');
    console.error('   Tipo de error:', error?.constructor?.name);
    console.error('   Mensaje:', error?.message);
    console.error('   Status:', error?.response?.status);
    console.error('   Response:', error?.response?.data);
    console.error('   Request URL:', error?.config?.url);
    console.error('   Error completo:', error);
    throw error;
  }
};

/**
 * Obtener el token actualmente cached (sin hacer request al backend)
 */
export const getCachedCsrfToken = (): string | null => {
  if (csrfToken) return csrfToken;
  const stored = readStoredCsrfToken();
  if (stored) {
    csrfToken = stored;
  }
  return csrfToken;
};

/**
 * Asegurar que existe token CSRF (cache/storage o request)
 */
export const ensureCsrfToken = async (apiUrl: string): Promise<string> => {
  const cached = getCachedCsrfToken();
  if (cached) return cached;
  return getCsrfToken(apiUrl);
};

/**
 * Refrescar CSRF token (si el actual es inválido o expiró)
 * Llamar esto si recibes 403 "Missing CSRF token in cookie"
 */
export const refreshCsrfToken = async (apiUrl: string): Promise<string> => {
  console.log('🔄 Refrescando CSRF token...');
  csrfToken = null;
  return getCsrfToken(apiUrl);
};

/**
 * Limpiar token (al logout)
 */
export const clearCsrfToken = (): void => {
  csrfToken = null;
  clearStoredCsrfToken();
  console.log('🗑️  CSRF token limpiado');
};
