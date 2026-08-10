type LogLevel = "debug" | "info" | "warn" | "error";

const viteEnv = (import.meta as any).env || {};
const isDev = Boolean(viteEnv.DEV);

const SENSITIVE_KEYS = new Set([
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "password",
  "secret",
  "jwt",
]);

function redactString(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, "[JWT_REDACTED]");
}

function sanitize(value: any, keyHint?: string): any {
  if (value == null) return value;

  if (keyHint && SENSITIVE_KEYS.has(keyHint.toLowerCase())) {
    return "[REDACTED]";
  }

  if (typeof value === "string") {
    return redactString(value);
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message || "Unknown error"),
      ...(isDev && value.stack ? { stack: value.stack } : {}),
    };
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item));
  }

  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = sanitize(val, key);
    }
    return out;
  }

  return value;
}

function shouldLog(level: LogLevel): boolean {
  if (isDev) return true;
  return level === "warn" || level === "error";
}

function emit(level: LogLevel, message: string, meta?: any) {
  if (!shouldLog(level)) return;

  const method = level === "debug" ? "debug" : level;
  const safeMessage = redactString(message);
  const safeMeta = meta === undefined ? undefined : sanitize(meta);

  if (safeMeta === undefined) {
    (console as any)[method](`[${level.toUpperCase()}] ${safeMessage}`);
    return;
  }

  (console as any)[method](`[${level.toUpperCase()}] ${safeMessage}`, safeMeta);
}

export const logger = {
  debug: (message: string, meta?: any) => emit("debug", message, meta),
  info: (message: string, meta?: any) => emit("info", message, meta),
  warn: (message: string, meta?: any) => emit("warn", message, meta),
  error: (message: string, meta?: any) => emit("error", message, meta),
};
