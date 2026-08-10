export function isValidDateInstance(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function toLocalDateOnly(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function extractDateOnly(value: unknown): string {
  if (!value) return "";

  if (isValidDateInstance(value)) {
    return toLocalDateOnly(value);
  }

  const raw = String(value).trim();
  const ymdMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (ymdMatch) {
    return ymdMatch[1];
  }

  const parsed = new Date(raw);
  if (!isValidDateInstance(parsed)) {
    return "";
  }

  return toLocalDateOnly(parsed);
}

export function parseDateOnlyAsLocalDate(value: unknown): Date | null {
  const dateOnly = extractDateOnly(value);
  if (!dateOnly) return null;

  const [year, month, day] = dateOnly.split("-").map(Number);
  if (!year || !month || !day) return null;

  const result = new Date(year, month - 1, day);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDaysToDateOnly(value: unknown, daysToAdd: number): string {
  const baseDate = parseDateOnlyAsLocalDate(value);
  if (!baseDate) return "";

  baseDate.setDate(baseDate.getDate() + Math.max(0, Math.floor(Number(daysToAdd) || 0)));
  return toLocalDateOnly(baseDate);
}

export function formatDateOnly(
  value: unknown,
  locale = "es-MX",
  options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  }
): string {
  const date = parseDateOnlyAsLocalDate(value);
  if (!date) return "-";
  return date.toLocaleDateString(locale, options);
}