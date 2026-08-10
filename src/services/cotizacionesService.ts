import { api } from "../lib/api";
import { logger } from "../lib/logger";
import { isValidQuotationStatus, normalizeQuotationStatus } from "../constants/quotationStatus";
import { formatDateOnly } from "../utils/dateOnly";

function sanitizeEstadoForApi(estado: any): string | undefined {
  if (estado === undefined || estado === null || estado === "") return undefined;
  const normalized = normalizeQuotationStatus(String(estado));
  if (!isValidQuotationStatus(normalized)) {
    throw new Error("Estado inválido. Debe ser uno de: Cotizado, En revision, No aceptada, Contratado, Cancelado");
  }
  if (normalized === "Cancelado") return "No aceptada";
  return normalized;
}
function normalizeTipoEvento(value: any): string {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if (typeof value.nombre === "string") return value.nombre;
    if (typeof value.label === "string") return value.label;
    if (typeof value.value === "string") return value.value;
  }
  return "";
}

function normalizeIvaPct(payload: any): number {
  const raw = payload?.ivaPct ?? payload?.ivaPorcentaje ?? payload?.ivaRate;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 16;
}

function normalizeOptionalIvaPct(payload: any): number | undefined {
  const hasIva =
    payload?.ivaPct !== undefined ||
    payload?.ivaPorcentaje !== undefined ||
    payload?.ivaRate !== undefined;

  if (!hasIva) return undefined;

  const value = Number(payload?.ivaPct ?? payload?.ivaPorcentaje ?? payload?.ivaRate);
  return Number.isFinite(value) ? value : 16;
}

export type Cotizacion = {
  _id: string;
  folio: string;
  tipoEvento: string;
  nombreEvento: string;
  fechaEvento: string;
  eventStartDate?: string;
  eventDurationDays?: number;
  eventEndDate?: string;
  horaInicio: string;
  horaFin: string;
  negocioId: string;
  paqueteId?: string;
  direccion?: string;
  notas?: string;
  invitadosAdultos: number;
  invitadosNinos: number;
  cliente: {
    nombre: string;
    telefono?: string;
    email?: string;
  };
  items: Array<{
    tipo: "Platillo" | "Bebida" | "Personal" | "Paquete" | "Extra" | "Mobiliario" | "Audio";
    nombre: string;
    precio: number;
    cantidad: number;
    applyDurationMultiplier?: boolean;
    baseLineTotal?: number;
    lineDaysApplied?: number;
    lineTotal?: number;
  }>;
  ivaPct: number;
  incluyeIva: boolean;
  descuentoPct: number;
  descuentoMonto: number;
  descuentoTipo: "porcentaje" | "monto";
  anticipo: number;
  estado: "Cotizado" | "En revision" | "No aceptada" | "Contratado" | "Cancelado";
  observaciones?: string;
  subtotal: number;
  ivaMonto: number;
  descuentoTotal: number;
  total: number;
  saldo: number;
  saldoPendiente?: number;
  porcentajePagado?: number;
  totalPagado?: number;
  estaPagadaAl100?: boolean;
  clienteNombre?: string;
  displayLabel?: string;
  eventoCerrado?: boolean;
  fechaCierreEvento?: string;
  cerradoPor?:
    | string
    | {
        _id?: string;
        id?: string;
        nombre?: string;
        email?: string;
      };
  puedeCerrarEvento?: boolean;
  motivoNoPuedeCerrarEvento?: string;
  estadoOperativoEvento?: string;
  eventoCancelado?: boolean;
  fechaCancelacionEvento?: string;
  motivoCancelacion?: string;
  estadoAntesCancelacion?: string;
  generoReembolso?: boolean;
  montoReembolso?: number;
  generoGastoCancelacion?: boolean;
  montoGastoCancelacion?: number;
  observacionesCancelacion?: string;
  utilidadEvento?: number;
  utilidadEventoReal?: number;
  utilidadEventoSoloCompras?: number;
  egresosTotalesEvento?: number;
  totalComprasEvento?: number;
  totalGastosOperativosEvento?: number;
  createdAt: string;
  updatedAt: string;
  breakdown?: {
    subtotalOneTime?: number;
    subtotalPerDayBase?: number;
    subtotalPerDayExtended?: number;
    subtotalFinal?: number;
    eventDays?: number;
    subtotalAfterDiscount?: number;
    subtotalOneDay?: number;
    numberOfDays?: number;
    subtotalByDays?: number;
    descuentoTotal?: number;
    ivaMonto?: number;
    total?: number;
  };
};

export interface CotizacionesPageResponse {
  cotizaciones: Cotizacion[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListCotizacionesPageParams {
  page?: number;
  pageSize?: number;
  q?: string;
  estado?: string;
  clienteId?: string;
  negocioId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  sortBy?: "createdAt" | "updatedAt" | "fechaEvento" | "fechaContratacion" | "folio" | "nombreEvento" | "estado" | "total";
  sortOrder?: "asc" | "desc";
  folio?: string;
}

const COTIZACIONES_MAX_PAGE_SIZE = 100;

function normalizeCotizacionesRoot(raw: any) {
  const candidates = [raw, raw?.data, raw?.payload, raw?.result].filter(Boolean);
  return candidates[0] ?? raw;
}

function extractCotizacionesCollection(raw: any): Cotizacion[] {
  const root = normalizeCotizacionesRoot(raw);
  if (Array.isArray(root?.cotizaciones)) return root.cotizaciones;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root?.rows)) return root.rows;
  if (Array.isArray(root?.docs)) return root.docs;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root)) return root;
  return [];
}

function getCotizacionEventDateValue(cotizacion: Partial<Cotizacion> | null | undefined): string {
  const candidates = [
    cotizacion?.fechaEvento,
    cotizacion?.eventStartDate,
    cotizacion?.eventEndDate,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  return "";
}

export function getCotizacionEventOptionLabel(cotizacion: Partial<Cotizacion> | null | undefined): string {
  if (!cotizacion) return "Evento sin información";

  const estadoOperativoSuffix = cotizacion.eventoCerrado ? " (cerrado)" : "";

  // Usar displayLabel del backend cuando está disponible
  if (cotizacion.displayLabel) {
    return `${cotizacion.displayLabel}${estadoOperativoSuffix}`;
  }

  // Fallback defensivo para compatibilidad con respuestas anteriores
  const nombre = String(
    cotizacion.nombreEvento ||
    (cotizacion as Record<string, unknown>).nombre ||
    (cotizacion as Record<string, unknown>).titulo ||
    "Evento sin nombre"
  ).trim();

  const cliente = String(
    cotizacion.clienteNombre ||
    cotizacion.cliente?.nombre ||
    (cotizacion.cliente as Record<string, unknown> | undefined)?.razonSocial ||
    ""
  ).trim();

  const eventDateValue = getCotizacionEventDateValue(cotizacion);
  const fecha = eventDateValue
    ? formatDateOnly(eventDateValue, "es-MX", { day: "numeric", month: "numeric", year: "numeric" })
    : "";

  const parts = [nombre, cliente || null, fecha || null].filter(Boolean);
  return parts.join(" - ") + estadoOperativoSuffix;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeCotizacionesPageResponse(
  raw: any,
  requestedPage: number,
  requestedPageSize: number
): CotizacionesPageResponse {
  const root = normalizeCotizacionesRoot(raw);
  const cotizaciones = extractCotizacionesCollection(root);
  const total = Math.max(0, Number(root?.total ?? root?.count ?? root?.totalDocs ?? cotizaciones.length ?? 0));
  const page = normalizePositiveNumber(root?.page, requestedPage);
  const pageSize = normalizePositiveNumber(root?.pageSize, requestedPageSize);
  const computedTotalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const totalPages = normalizePositiveNumber(root?.totalPages, computedTotalPages);
  const hasNextPage = typeof root?.hasNextPage === "boolean" ? root.hasNextPage : page < totalPages;
  const hasPrevPage = typeof root?.hasPrevPage === "boolean" ? root.hasPrevPage : page > 1;

  return {
    cotizaciones,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

export const listCotizacionesPage = async ({
  page = 1,
  pageSize = 10,
  q,
  estado,
  clienteId,
  negocioId,
  fechaInicio,
  fechaFin,
  sortBy,
  sortOrder,
  folio,
}: ListCotizacionesPageParams = {}): Promise<CotizacionesPageResponse> => {
  const requestedPage = normalizePositiveNumber(page, 1);
  const requestedPageSize = normalizePositiveNumber(pageSize, 10);

  const response = await api.get("/cotizaciones", {
    params: {
      page: requestedPage,
      pageSize: requestedPageSize,
      ...(q ? { q } : {}),
      ...(estado ? { estado } : {}),
      ...(clienteId ? { clienteId } : {}),
      ...(negocioId ? { negocioId } : {}),
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
      ...(folio ? { folio } : {}),
    },
  });

  return normalizeCotizacionesPageResponse(response.data, requestedPage, requestedPageSize);
};

export const listCotizaciones = async (): Promise<Cotizacion[]> => {
  const pageSize = COTIZACIONES_MAX_PAGE_SIZE;
  const firstResponse = await api.get("/cotizaciones", {
    params: { page: 1, pageSize },
  });

  const firstPageResponse = normalizeCotizacionesPageResponse(firstResponse.data, 1, pageSize);
  const firstPage = firstPageResponse.cotizaciones;

  const totalPages = Number(firstPageResponse.totalPages || 1);
  if (!Number.isFinite(totalPages) || totalPages <= 1) {
    return firstPage;
  }

  const remainingRequests = Array.from({ length: totalPages - 1 }, (_, index) => {
    const page = index + 2;
    return api.get("/cotizaciones", { params: { page, pageSize } });
  });

  const remainingResponses = await Promise.all(remainingRequests);
  const remainingPages = remainingResponses.flatMap((response, index) =>
    normalizeCotizacionesPageResponse(response.data, index + 2, pageSize).cotizaciones
  );

  const allCotizaciones = [...firstPage, ...remainingPages];
  return allCotizaciones;
};

export const listCotizacionesContratadas = async ({ includeClosed = true }: { includeClosed?: boolean } = {}): Promise<Cotizacion[]> => {
  const pageSize = COTIZACIONES_MAX_PAGE_SIZE;
  const firstPage = await listCotizacionesPage({ page: 1, pageSize, estado: "Contratado" });
  const contracted = firstPage.cotizaciones.filter(
    (cotizacion) =>
      normalizeQuotationStatus(cotizacion?.estado) === "Contratado" &&
      (includeClosed || cotizacion?.eventoCerrado !== true)
  );

  if (firstPage.totalPages <= 1) {
    return contracted;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listCotizacionesPage({ page: index + 2, pageSize, estado: "Contratado" })
    )
  );

  return [
    ...contracted,
    ...remainingResponses.flatMap((page) =>
      page.cotizaciones.filter(
        (cotizacion) =>
          normalizeQuotationStatus(cotizacion?.estado) === "Contratado" &&
          (includeClosed || cotizacion?.eventoCerrado !== true)
      )
    ),
  ];
};

export const getCotizacion = async (id: string): Promise<Cotizacion> => {
  const response = await api.get(`/cotizaciones/${id}`);
  return response.data;
};

export const createCotizacion = async (payload: any): Promise<Cotizacion> => {
  // IMPORTANTE: el backend genera folio, no lo mandamos, y calcula subtotal, total, etc.
  const {
    folio, subtotal, total, ivaMonto, descuentoTotal, saldo,
    _id, createdAt, updatedAt, clienteId, clienteNombre, clienteTelefono, clienteEmail, salonId, estado: _estado,
    ...rest
  } = payload || {};

  // Asegurar estructura correcta del cliente - SOLO: nombre, telefono (opcional), email (opcional)
  const clienteData = payload.cliente || {};
  const estado = sanitizeEstadoForApi(payload?.estado ?? _estado);
  const data = {
    ...rest,
    tipoEvento: normalizeTipoEvento(payload?.tipoEvento),
    cliente: {
      nombre: clienteData.nombre,
      ...(clienteData.telefono && { telefono: clienteData.telefono }),
      ...(clienteData.email && { email: clienteData.email }),
    },
    ivaPct: normalizeIvaPct(payload),
    descuentoTipo: payload.descuentoTipo?.toLowerCase() === "porcentaje" ? "porcentaje" : "monto",
    negocioId: payload.negocioId,
    ...(payload.paqueteId && { paqueteId: payload.paqueteId }),
    ...(estado && { estado }),
  };

  const response = await api.post("/cotizaciones", data);
  return response.data;
};

export const updateCotizacion = async (id: string, payload: any): Promise<Cotizacion> => {
  // IMPORTANTE: strip campos read-only y calculated, y NO incluir negocioId (no se puede cambiar)
  const {
    folio, subtotal, total, ivaMonto, descuentoTotal, saldo, iva,
    _id, createdAt, updatedAt, empresaId,
    eventEndDate,
    negocioId, // NO enviar negocioId en updates
    ...rest
  } = payload || {};

  const clienteData = payload?.cliente;
  const ivaPct = normalizeOptionalIvaPct(payload);

  const data: any = {
    ...rest,
    ...(payload?.tipoEvento !== undefined && { tipoEvento: normalizeTipoEvento(payload.tipoEvento) }),
    ...(ivaPct !== undefined && { ivaPct, ivaPorcentaje: ivaPct, ivaRate: ivaPct }),
    ...(payload?.descuentoTipo !== undefined && {
      descuentoTipo: payload.descuentoTipo?.toLowerCase() === "porcentaje" ? "porcentaje" : "monto",
    }),
  };

  // Incluir cliente solo cuando realmente se manda en el payload
  if (clienteData && typeof clienteData === "object") {
    const nombre = typeof clienteData.nombre === "string" ? clienteData.nombre.trim() : "";
    if (nombre) {
      data.cliente = {
        nombre,
        ...(clienteData.telefono && { telefono: clienteData.telefono }),
        ...(clienteData.email && { email: clienteData.email }),
      };
    }
  }

  // Incluir paqueteId solo si tiene valor
  if (payload.paqueteId && String(payload.paqueteId).trim()) {
    data.paqueteId = payload.paqueteId;
  }

  const estado = sanitizeEstadoForApi(payload?.estado);
  if (estado) {
    data.estado = estado;
  }

  const response = await api.put(`/cotizaciones/${id}`, data);
  return response.data;
};

export const deleteCotizacion = async (id: string): Promise<void> => {
  await api.delete(`/cotizaciones/${id}`);
};

export async function getCotizacionById(id: string) {
  const { data } = await api.get(`/cotizaciones/${id}`);
  return data;
}

export async function cerrarEventoCotizacion(id: string): Promise<Cotizacion> {
  const { data } = await api.patch(`/cotizaciones/${id}/cerrar-evento`);
  return data?.cotizacion || data?.data?.cotizacion || data?.data || data;
}

export interface CancelarEventoPayload {
  motivoCancelacion: string;
  generoReembolso: boolean;
  montoReembolso: number;
  generoGastoCancelacion: boolean;
  montoGastoCancelacion: number;
  observacionesCancelacion?: string;
}

export async function cancelarEventoCotizacion(
  id: string,
  payload: CancelarEventoPayload
): Promise<{ ok: boolean; message: string; cotizacion: Cotizacion }> {
  const { data } = await api.patch(`/cotizaciones/${id}/cancelar-evento`, payload);
  return data;
}

export async function previewCotizacion(payload: any, cotizacionId?: string): Promise<Cotizacion | null> {
  const candidates: Array<{ method: "post" | "put"; url: string }> = cotizacionId
    ? [
        { method: "post", url: `/cotizaciones/${cotizacionId}/preview` },
        { method: "put", url: `/cotizaciones/${cotizacionId}/preview` },
        { method: "post", url: "/cotizaciones/preview" },
      ]
    : [
        { method: "post", url: "/cotizaciones/preview" },
      ];

  let lastError: any = null;

  for (const candidate of candidates) {
    try {
      const response = await api.request({
        method: candidate.method,
        url: candidate.url,
        data: payload,
      });
      return response?.data?.cotizacion || response?.data?.data?.cotizacion || response?.data || null;
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 404 || status === 405) {
        lastError = err;
        continue;
      }
      throw err;
    }
  }

  if (lastError) {
    logger.warn("Quotation preview endpoint not available", {
      cotizacionId,
      status: lastError?.response?.status,
    });
  }

  return null;
}

export const sendCotizacionNotification = async (id: string, clienteEmail?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const response = await api.post(`/cotizaciones/${id}/send-notification`, {
      clienteEmail
    });
    return response.data || { success: true, message: "Notificación enviada al cliente" };
  } catch (err) {
    const e = err as any;
    logger.error("Error sending cotización notification", {
      status: e?.response?.status,
      message: e?.message,
      cotizacionId: id,
    });
    // No lanzar error si falla, solo registrar en consola
    return { success: false, message: "La cotización se actualizó pero no se pudo enviar el email" };
  }
};
