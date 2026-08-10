const LOCALE = 'es-MX';

const DATE_FMT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
};

const DATETIME_FMT: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
};

function isValidDate(value: unknown): boolean {
  if (!value || value === 'null' || value === 'undefined') return false;
  const d = new Date(value as string);
  return !isNaN(d.getTime());
}

export function fmtDate(value: unknown, fallback = 'Sin registro'): string {
  if (!isValidDate(value)) return fallback;
  try {
    return new Intl.DateTimeFormat(LOCALE, DATE_FMT).format(new Date(value as string));
  } catch {
    return fallback;
  }
}

export function fmtDatetime(value: unknown, fallback = 'Sin registro'): string {
  if (!isValidDate(value)) return fallback;
  try {
    return new Intl.DateTimeFormat(LOCALE, DATETIME_FMT).format(new Date(value as string));
  } catch {
    return fallback;
  }
}

export function fmtLastAccess(value: unknown): string {
  return fmtDatetime(value, 'Sin acceso registrado');
}

export function fmtTrial(value: unknown): string {
  return fmtDate(value, 'No configurado');
}

export function fmtRelative(value: unknown): string {
  if (!isValidDate(value)) return 'Sin registro';
  const diffMs = Date.now() - new Date(value as string).getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`;
  if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} mes.`;
  return fmtDate(value);
}
