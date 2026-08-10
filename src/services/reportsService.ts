import { api } from "../lib/api";

export type ReportPeriodType = "monthly" | "semiannual" | "annual";

export interface ReportQueryParams {
  periodType: ReportPeriodType;
  year: number;
  month?: number;
  semester?: 1 | 2;
  negocioId?: string;
}

export type ReportSortOrder = "asc" | "desc";

export interface ReportKpiItem {
  label?: string;
  value?: number | string | null;
  valueFormatted?: string;
  meta?: string;
}

export interface ReportTableRow {
  [key: string]: unknown;
}

export interface IngresosEgresosResponse {
  periodo?: {
    tipo?: string;
    año?: number;
    mes?: number;
    fromDate?: string;
    toDate?: string;
  };
  totals?: {
    ingresosTotal?: number | string;
    egresosTotal?: number | string;
    balance?: number | string;
  };
  kpis?: {
    ingresosTotales?: number | string;
    egresosTotales?: number | string;
    balanceGeneral?: number | string;
  };
  ingresos?: {
    total?: number | string;
    soloVentas?: number | string;
    soloAbonos?: number | string;
    detalles?: Record<string, unknown>;
  };
  egresos?: {
    total?: number | string;
    soloCompras?: number | string;
    soloAbonosProveedores?: number | string;
    soloGastosOperativos?: number | string;
    soloGastosFijos?: number | string;
    detalles?: Record<string, unknown>;
  };
  detalleIngresos?: ReportTableRow[];
  detalleEgresos?: ReportTableRow[];
  movimientos?: ReportTableRow[];
  movimientosResumen?: ReportTableRow[];
  [key: string]: unknown;
}

export type IngresosEgresosDetalleConcepto =
  | "totalIngresos"
  | "soloVentas"
  | "soloAbonos"
  | "totalEgresos"
  | "soloCompras"
  | "soloAbonosProveedores"
  | "soloGastosOperativos"
  | "soloGastosFijos"
  | "movimientosResumen";

export interface IngresosEgresosDetalleParams extends ReportQueryParams {
  concepto: IngresosEgresosDetalleConcepto;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: ReportSortOrder;
}

export interface IngresosEgresosDetalleItem {
  _id?: string;
  id?: string;
  fecha?: string;
  tipoMovimiento?: string;
  subtipo?: string;
  origenModelo?: string;
  origen?: string;
  referencia?: string;
  terceroNombre?: string;
  eventoNombre?: string;
  descripcion?: string;
  monto?: number | string;
  estado?: string;
  vigente?: boolean;
  sourceId?: string;
  parentId?: string;
  parentFolio?: string;
  [key: string]: unknown;
}

export interface IngresosEgresosDetalleResponse {
  periodo?: {
    tipo?: string;
    año?: number | string;
    mes?: number | string;
    fromDate?: string;
    toDate?: string;
  };
  concepto?: IngresosEgresosDetalleConcepto | string;
  total?: number | string;
  count: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  items: IngresosEgresosDetalleItem[];
  [key: string]: unknown;
}

export interface CXCResponse {
  periodo?: {
    tipo?: string;
    año?: number;
    mes?: number;
  };
  kpis?: {
    totalCXC?: number | string;
    countAbiertas?: number | string;
    countVencidas?: number | string;
    countPorVencer7Dias?: number | string;
    abiertas?: number | string;
    vencen7dias?: number | string;
  };
  detalles?: ReportTableRow[];
  cuentas?: ReportTableRow[];
  [key: string]: unknown;
}

export interface CXPResponse {
  periodo?: {
    tipo?: string;
    año?: number;
    mes?: number;
  };
  kpis?: {
    totalCXP?: number | string;
    countAbiertas?: number | string;
    countVencidas?: number | string;
    countPorVencer7Dias?: number | string;
    abiertas?: number | string;
    vencen7dias?: number | string;
  };
  detalles?: ReportTableRow[];
  cuentas?: ReportTableRow[];
  [key: string]: unknown;
}

export interface CotizacionesContratosResponse {
  periodo?: {
    tipo?: string;
    año?: number;
    mes?: number;
  };
  kpis?: {
    numCotizaciones?: number | string;
    numContratadas?: number | string;
    conversionRate?: number | string;
    totalMontosCotizados?: number | string;
    totalMontosContratados?: number | string;
    cotizacionesPeriodo?: number | string;
    contratadasPeriodo?: number | string;
    tasaConversion?: number | string;
  };
  tabla?: ReportTableRow[];
  cotizaciones?: ReportTableRow[];
  [key: string]: unknown;
}

export interface LeadsResponse {
  periodo?: {
    tipo?: string;
    año?: number;
    mes?: number;
  };
  kpis?: {
    totalLeadsPeriodo?: number | string;
    leadsPeriodo?: number | string;
    canalPrincipal?: string;
    cantidadCanalPrincipal?: number | string;
  };
  resumenPorCanal?: ReportTableRow[];
  listaLeads?: ReportTableRow[];
  resumenCanales?: ReportTableRow[];
  leads?: ReportTableRow[];
  [key: string]: unknown;
}

export interface CotizacionesEstadisticasResponse {
  periodo?: {
    tipo?: string;
    año?: number;
    mes?: number;
    fechaInicio?: string;
    fechaFin?: string;
  };
  filtros?: {
    negocioId?: string;
  };
  resumen?: {
    totalCotizaciones?: number | string;
    montoTotalCotizado?: number | string;
  };
  estadisticas?: Record<
    string,
    {
      cantidad?: number | string;
      montoTotal?: number | string;
      porcentaje?: number | string;
    }
  >;
  legacy?: {
    canceladas?: {
      cantidad?: number | string;
      montoTotal?: number | string;
    };
    mapeadasDesdeCancelado?: {
      cantidad?: number | string;
      montoTotal?: number | string;
    };
  };
  [key: string]: unknown;
}

function buildReportParams(filters: ReportQueryParams): URLSearchParams {
  const params = new URLSearchParams();
  params.set("periodType", filters.periodType);
  params.set("year", String(filters.year));

  const normalizedNegocioId = String(filters.negocioId ?? "").trim();
  const shouldSendNegocioId = normalizedNegocioId
    && !["all", "todos", "null", "undefined"].includes(normalizedNegocioId.toLowerCase());

  if (filters.periodType === "monthly" && filters.month) {
    params.set("month", String(filters.month));
  }

  if (filters.periodType === "semiannual" && filters.semester) {
    params.set("semester", String(filters.semester));
  }

  if (shouldSendNegocioId) {
    params.set("negocioId", normalizedNegocioId);
  }

  return params;
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeIngresosEgresosDetalleResponse(
  raw: any,
  requestedPage: number,
  requestedPageSize: number
): IngresosEgresosDetalleResponse {
  const root = unwrapResponse<any>(raw);
  const items = Array.isArray(root?.items)
    ? root.items
    : Array.isArray(root?.results)
      ? root.results
      : Array.isArray(root?.rows)
        ? root.rows
        : Array.isArray(root?.docs)
          ? root.docs
          : Array.isArray(root)
            ? root
            : [];
  const count = Math.max(0, Number(root?.count ?? root?.totalItems ?? items.length ?? 0));
  const page = normalizePositiveNumber(root?.page, requestedPage);
  const pageSize = normalizePositiveNumber(root?.pageSize, requestedPageSize);
  const computedTotalPages = count > 0 ? Math.ceil(count / pageSize) : 1;
  const totalPages = normalizePositiveNumber(root?.totalPages, computedTotalPages);

  return {
    ...root,
    count,
    page,
    pageSize,
    totalPages,
    hasNextPage: typeof root?.hasNextPage === "boolean" ? root.hasNextPage : page < totalPages,
    hasPrevPage: typeof root?.hasPrevPage === "boolean" ? root.hasPrevPage : page > 1,
    items,
  };
}

function unwrapResponse<T>(responseData: any): T {
  return (responseData?.data || responseData?.payload || responseData?.result || responseData) as T;
}

async function fetchReport<T>(path: string, filters: ReportQueryParams): Promise<T> {
  const params = buildReportParams(filters).toString();
  const response = await api.get(`${path}?${params}`);
  return unwrapResponse<T>(response.data);
}

export const getIngresosEgresos = async (params: ReportQueryParams): Promise<IngresosEgresosResponse> => {
  return fetchReport<IngresosEgresosResponse>("/reportes/ingresos-egresos", params);
};

export const getIngresosEgresosDetalle = async ({
  concepto,
  page = 1,
  pageSize = 10,
  sortBy,
  sortOrder,
  ...filters
}: IngresosEgresosDetalleParams): Promise<IngresosEgresosDetalleResponse> => {
  const requestedPage = normalizePositiveNumber(page, 1);
  const requestedPageSize = normalizePositiveNumber(pageSize, 10);
  const params = buildReportParams(filters);
  params.set("concepto", concepto);
  params.set("page", String(requestedPage));
  params.set("pageSize", String(requestedPageSize));

  if (sortBy) {
    params.set("sortBy", sortBy);
  }

  if (sortOrder) {
    params.set("sortOrder", sortOrder);
  }

  const response = await api.get(`/reportes/ingresos-egresos/detalle?${params.toString()}`);
  return normalizeIngresosEgresosDetalleResponse(response.data, requestedPage, requestedPageSize);
};

export const getCXC = async (params: ReportQueryParams): Promise<CXCResponse> => {
  return fetchReport<CXCResponse>("/reportes/cxc", params);
};

export const getCXP = async (params: ReportQueryParams): Promise<CXPResponse> => {
  return fetchReport<CXPResponse>("/reportes/cxp", params);
};

export const getCotizacionesContratos = async (params: ReportQueryParams): Promise<CotizacionesContratosResponse> => {
  return fetchReport<CotizacionesContratosResponse>("/reportes/cotizaciones-contratos", params);
};

export const getLeads = async (params: ReportQueryParams): Promise<LeadsResponse> => {
  return fetchReport<LeadsResponse>("/reportes/leads", params);
};

export const getCotizacionesEstadisticas = async (params: ReportQueryParams): Promise<CotizacionesEstadisticasResponse> => {
  return fetchReport<CotizacionesEstadisticasResponse>("/reportes/cotizaciones-estadisticas", params);
};
