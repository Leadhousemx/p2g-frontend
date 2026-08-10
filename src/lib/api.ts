import apiClient from '../api/axiosConfig';
import { getToken, getRefreshToken } from '../utils/tokenManager';

/**
 * Alias para compatibilidad retroactiva
 * El nuevo sistema usa apiClient desde axiosConfig.ts
 * que ya incluye CSRF token handling automático
 */
export const api = apiClient;
export const apiCookieOnly = apiClient;

/**
 * Verificar sesión actual del usuario
 * GET /api/auth/verify
 */
export async function verifySession() {
  try {
    const response = await apiClient.get<{
      valid: boolean;
      userId: string;
      empresaId: string;
      tokenSource: string;
    }>('/api/auth/verify', {
      timeout: 8000,
    });
    return response;
  } catch (error: any) {
    const status = Number(error?.response?.status || 0);
    if (status === 404) {
      return null;
    }
    console.error('❌ Session verification failed:', error);
    throw error;
  }
}

/**
 * Logout: Limpiar sesión
 * POST /api/auth/logout
 */
export async function logout() {
  try {
    await apiClient.post('/api/auth/logout');
    console.log('✅ Logout exitoso');
  } catch (error) {
    console.error('❌ Error en logout:', error);
    throw error;
  }
}

/**
 * Obtener URL base del API
 */
export function getApiBaseUrl() {
  return import.meta.env.DEV
    ? ''
    : (import.meta.env.VITE_API_URL || 'https://api.brentrix.com');
}

export default apiClient;
