import { logger } from "../lib/logger";
import { clearCsrfToken } from "./csrfService";
import { removeToken } from "../utils/tokenManager";

export const AUTH_USER_KEY = "authUser";
export const AUTH_COMPANY_KEY = "authCompany";
export const AUTH_SESSION_NOTICE_KEY = "authSessionNotice";
export const AUTH_SESSION_INVALIDATED_EVENT = "auth:session-invalidated";
export const SESSION_REPLACED_CODE = "SESSION_REPLACED";
export const INVALID_SESSION_CODE = "INVALID_SESSION";
export const TOKEN_EXPIRED_CODE = "TOKEN_EXPIRED";
const LEGACY_USER_KEY = "user";
const LEGACY_COMPANY_KEY = "company";

const LOGIN_PATH = "/login";

let forcedLogoutInFlight = false;

function safeSessionRemove(key: string) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    logger.warn("authSessionService sessionStorage remove failed", { key });
  }
}

function safeSessionRead(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSessionWrite(key: string, value: string) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    logger.warn("authSessionService sessionStorage write failed", { key });
  }
}

function safeLocalRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    logger.warn("authSessionService localStorage remove failed", { key });
  }
}

function normalizeCode(value: unknown): string {
  return String(value || "").trim().toUpperCase();
}

function isLoginPath(pathname: string): boolean {
  return pathname === LOGIN_PATH || pathname.startsWith(`${LOGIN_PATH}/`);
}

function persistSessionNotice(message: string) {
  if (!message) return;
  const existing = safeSessionRead(AUTH_SESSION_NOTICE_KEY);
  if (existing) return;
  safeSessionWrite(AUTH_SESSION_NOTICE_KEY, message);
}

export function consumeSessionNotice(): string {
  const value = safeSessionRead(AUTH_SESSION_NOTICE_KEY) || "";
  if (value) {
    safeSessionRemove(AUTH_SESSION_NOTICE_KEY);
  }
  return value;
}

export function clearLocalAuthState() {
  removeToken();
  clearCsrfToken();
  safeSessionRemove(AUTH_USER_KEY);
  safeSessionRemove(AUTH_COMPANY_KEY);
  safeSessionRemove(LEGACY_USER_KEY);
  safeSessionRemove(LEGACY_COMPANY_KEY);
  safeLocalRemove("user");
  safeLocalRemove(LEGACY_USER_KEY);
  safeLocalRemove(LEGACY_COMPANY_KEY);
  safeLocalRemove(AUTH_USER_KEY);
  safeLocalRemove(AUTH_COMPANY_KEY);
}

export function resolveSessionInvalidationMessage(code?: unknown, fallbackMessage?: unknown): string {
  const normalizedCode = normalizeCode(code);

  if (normalizedCode === SESSION_REPLACED_CODE) {
    return "Tu cuenta se abrio en otro dispositivo y esta sesion se cerro automaticamente.";
  }

  if (normalizedCode === INVALID_SESSION_CODE) {
    return "Tu sesion ya no es valida. Inicia sesion nuevamente.";
  }

  if (typeof fallbackMessage === "string" && fallbackMessage.trim()) {
    return fallbackMessage.trim();
  }

  if (normalizedCode === TOKEN_EXPIRED_CODE) {
    return "Tu sesion expiro. Inicia sesion nuevamente.";
  }

  return "Tu sesion finalizo. Inicia sesion nuevamente.";
}

function redirectToLogin(preserveRedirect = true) {
  if (typeof window === "undefined") return;

  const path = String(window.location.pathname || "");
  if (isLoginPath(path)) {
    return;
  }

  const nextUrl = preserveRedirect
    ? `${LOGIN_PATH}?redirect=${encodeURIComponent(`${window.location.pathname}${window.location.search || ""}`)}`
    : LOGIN_PATH;

  window.location.replace(nextUrl);
}

export function resetSessionInvalidationState() {
  forcedLogoutInFlight = false;
}

export function handleSessionInvalidation(options?: {
  code?: unknown;
  message?: unknown;
  preserveRedirect?: boolean;
}) {
  const message = resolveSessionInvalidationMessage(options?.code, options?.message);
  persistSessionNotice(message);

  if (forcedLogoutInFlight) {
    return message;
  }

  forcedLogoutInFlight = true;
  clearLocalAuthState();

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(AUTH_SESSION_INVALIDATED_EVENT, {
      detail: {
        code: normalizeCode(options?.code),
        message,
      },
    }));
  }

  redirectToLogin(options?.preserveRedirect !== false);
  return message;
}