export const ESTADOS_COTIZACION = [
  "Cotizado",
  "En revision",
  "No aceptada",
  "Contratado",
  "Cancelado",
];

export const ESTADOS_DROPDOWN = [
  "Cotizado",
  "En revision",
  "No aceptada",
  "Contratado",
];

export const ESTADO_CONFIG = {
  Cotizado: {
    icon: "📋",
    label: "Cotización Inicial",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    calendarBackgroundColor: "#f59e0b",
    calendarBorderColor: "#d97706",
  },
  "En revision": {
    icon: "👀",
    label: "En Revisión",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    calendarBackgroundColor: "#3b82f6",
    calendarBorderColor: "#2563eb",
  },
  "No aceptada": {
    icon: "❌",
    label: "No Aceptada",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    calendarBackgroundColor: "#6b7280",
    calendarBorderColor: "#4b5563",
  },
  Contratado: {
    icon: "✅",
    label: "Contratado",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    calendarBackgroundColor: "#10b981",
    calendarBorderColor: "#059669",
  },
  Cancelado: {
    icon: "🚫",
    label: "Cancelado",
    badgeClass: "bg-red-50 text-red-800 border-red-300",
    calendarBackgroundColor: "#ef4444",
    calendarBorderColor: "#dc2626",
  },
};

export function normalizeQuotationStatus(status) {
  if (!status) return "Cotizado";
  return status;
}

export function isValidQuotationStatus(status) {
  return ESTADOS_COTIZACION.includes(String(status || ""));
}

export function isValidQuotationStatusForSubmit(status) {
  return ESTADOS_DROPDOWN.includes(String(status || ""));
}

export function getQuotationStatusConfig(status) {
  const normalized = normalizeQuotationStatus(status);
  return ESTADO_CONFIG[normalized] || ESTADO_CONFIG.Cotizado;
}