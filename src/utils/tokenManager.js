import { logger } from "../lib/logger";
// utils/tokenManager.js
const STORAGE_KEY = "accessToken";
const REFRESH_STORAGE_KEY = "refreshToken";
const LEGACY_STORAGE_KEYS = ["token", "access_token"];

function safeReadSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeWriteSession(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    logger.warn("tokenManager sessionStorage write failed", { key });
  }
}

function safeRemoveSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    logger.warn("tokenManager sessionStorage remove failed", { key });
  }
}

function safeReadLocal(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeRemoveLocal(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    logger.warn("tokenManager localStorage remove failed", { key });
  }
}

function looksLikeJwt(value) {
  return typeof value === "string" && value.split(".").length === 3;
}

// Guardar token en sessionStorage (Phase 1)
export function setToken(token) {
  if (!looksLikeJwt(token)) {
    logger.warn("tokenManager rejected non-JWT token write");
    return;
  }

  safeWriteSession(STORAGE_KEY, token);
  safeRemoveLocal(STORAGE_KEY);
  for (const key of LEGACY_STORAGE_KEYS) {
    safeRemoveLocal(key);
    safeRemoveSession(key);
  }
}

export function setRefreshToken(refreshToken) {
  if (!looksLikeJwt(refreshToken)) {
    logger.warn("tokenManager rejected non-JWT refresh token write");
    return;
  }
  safeWriteSession(REFRESH_STORAGE_KEY, refreshToken);
  safeRemoveLocal(REFRESH_STORAGE_KEY);
}

// Compatibilidad legacy
export function getEncryptedToken() {
  return getToken();
}

// Obtener token JWT (sessionStorage preferente)
export function getToken() {
  const sessionToken = safeReadSession(STORAGE_KEY);
  if (looksLikeJwt(sessionToken)) {
    return sessionToken;
  }

  const legacyCandidates = [
    safeReadLocal(STORAGE_KEY),
    ...LEGACY_STORAGE_KEYS.map((key) => safeReadLocal(key)),
  ];

  for (const candidate of legacyCandidates) {
    if (looksLikeJwt(candidate)) {
      safeWriteSession(STORAGE_KEY, candidate);
      safeRemoveLocal(STORAGE_KEY);
      for (const key of LEGACY_STORAGE_KEYS) {
        safeRemoveLocal(key);
      }
      return candidate;
    }
  }

  return null;
}

export function getRefreshToken() {
  const sessionRefresh = safeReadSession(REFRESH_STORAGE_KEY);
  if (looksLikeJwt(sessionRefresh)) {
    return sessionRefresh;
  }

  const legacyRefresh = safeReadLocal(REFRESH_STORAGE_KEY);
  if (looksLikeJwt(legacyRefresh)) {
    safeWriteSession(REFRESH_STORAGE_KEY, legacyRefresh);
    safeRemoveLocal(REFRESH_STORAGE_KEY);
    return legacyRefresh;
  }

  return null;
}

// Eliminar token
export function removeToken() {
  safeRemoveSession(STORAGE_KEY);
  safeRemoveSession(REFRESH_STORAGE_KEY);
  safeRemoveLocal(STORAGE_KEY);
  safeRemoveLocal(REFRESH_STORAGE_KEY);
  for (const key of LEGACY_STORAGE_KEYS) {
    safeRemoveLocal(key);
    safeRemoveSession(key);
  }
}

