import { api, apiCookieOnly } from "../lib/api";

export type NegocioTipo = "Salón de eventos" | "Catering" | "Alquiladora" | "Coordinación" | "Decoración" | "Floristerría" | "Producción";

export interface Negocio {
  _id: string;
  nombre: string;
  tipo: NegocioTipo;
  activo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NegociosResponse {
  negocios: Negocio[];
  total: number;
  page: number;
  totalPages: number;
  totalActivos: number;
  totalInactivos: number;
}

export interface NegociosFilters {
  search?: string;
  page?: number;
  limit?: number;
  pageSize?: number;
  activos?: boolean;
  activo?: boolean;
}

const GENERATED_NEGOCIO_NAME_PATTERNS = [
  /^smoke\b/i,
  /^diag\s+(?:smoke|fix)\b/i,
];

function isGeneratedNegocioName(value: any): boolean {
  const normalized = String(value || "").trim();
  if (!normalized) return false;
  return GENERATED_NEGOCIO_NAME_PATTERNS.some((pattern) => pattern.test(normalized));
}

function toBooleanActivo(value: any): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "activo", "activa", "enabled"].includes(normalized)) return true;
    if (["false", "0", "inactivo", "inactiva", "disabled"].includes(normalized)) return false;
  }
  return true;
}

function coerceJsonObject(value: any): any {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

function looksLikeNegocioRecord(value: any): boolean {
  if (!value || typeof value !== "object") return false;
  const id = value._id || value.id;
  const nombre = value.nombre || value.name;
  return Boolean(id && nombre);
}

function normalizeArrayCandidate(candidate: any): any[] {
  const parsed = coerceJsonObject(candidate);
  if (!Array.isArray(parsed)) return [];
  if (parsed.length === 0) return parsed;
  const objectItems = parsed.filter((item) => item && typeof item === "object");
  if (objectItems.length === 0) return [];
  if (objectItems.some(looksLikeNegocioRecord)) return objectItems;
  return objectItems;
}

function extractArrayFromUnknown(value: any): any[] {
  const parsedValue = coerceJsonObject(value);

  if (Array.isArray(parsedValue)) {
    return normalizeArrayCandidate(parsedValue);
  }

  if (!parsedValue || typeof parsedValue !== "object") return [];

  const directCandidates = [
    parsedValue.negocios,
    parsedValue.items,
    parsedValue.docs,
    parsedValue.results,
    parsedValue.rows,
    parsedValue.list,
    parsedValue.records,
    parsedValue.businesses,
    parsedValue.data,
    parsedValue.data?.negocios,
    parsedValue.data?.items,
    parsedValue.data?.docs,
    parsedValue.result?.negocios,
    parsedValue.result?.items,
    parsedValue.payload?.negocios,
    parsedValue.payload?.items,
    parsedValue.response?.negocios,
    parsedValue.response?.items,
  ];

  for (const candidate of directCandidates) {
    const normalized = normalizeArrayCandidate(candidate);
    if (normalized.length > 0) return normalized;
  }

  if (looksLikeNegocioRecord(parsedValue.negocio)) return [parsedValue.negocio];
  if (looksLikeNegocioRecord(parsedValue.data?.negocio)) return [parsedValue.data.negocio];
  if (looksLikeNegocioRecord(parsedValue.result?.negocio)) return [parsedValue.result.negocio];

  return [];
}

function normalizeNegociosResponse(raw: any, page: number, pageSize: number): NegociosResponse {
  const payload = coerceJsonObject(raw?.data ?? raw);

  const collection = extractArrayFromUnknown(payload);

  const negocios: Negocio[] = Array.from(
    new Map(
      (collection || [])
        .filter(looksLikeNegocioRecord)
        .map((item: any) => {
          const normalized = {
            ...item,
            _id: String(item?._id || item?.id || ""),
            nombre: String(item?.nombre || item?.name || "Sin nombre"),
            tipo: (item?.tipo || item?.type || "Salón de eventos") as NegocioTipo,
            activo: toBooleanActivo(item?.activo ?? item?.activa ?? item?.isActive ?? item?.estado),
            empresaId: String(item?.empresaId || item?.empresa || ""),
            createdAt: String(item?.createdAt || item?.creadoEn || ""),
            updatedAt: String(item?.updatedAt || item?.actualizadoEn || ""),
          };

          return [normalized._id, normalized] as const;
        })
    ).values()
  ).filter((item) => !isGeneratedNegocioName(item?.nombre));

  const total = Number(
    payload?.total
    ?? payload?.count
    ?? payload?.totalDocs
    ?? payload?.negocios?.total
    ?? payload?.meta?.total
    ?? negocios.length
  );
  const totalActivos = Number(payload?.totalActivos ?? negocios.filter((n) => n.activo).length);
  const totalInactivos = Number(payload?.totalInactivos ?? Math.max(0, total - totalActivos));
  const resolvedPage = Number(payload?.page ?? payload?.meta?.page ?? page);
  const totalPages = Number(
    payload?.totalPages
    ?? payload?.pages
    ?? payload?.meta?.totalPages
    ?? Math.max(1, Math.ceil((total || 0) / pageSize))
  );

  return {
    negocios,
    total,
    page: resolvedPage,
    totalPages,
    totalActivos,
    totalInactivos,
  };
}

async function getNegociosWithFallback<T>(url: string, params?: Record<string, any>): Promise<T> {
  try {
    const bearerResponse = await api.get<T>(url, {
      params,
      _skipRefresh: true,
    });
    return bearerResponse.data;
  } catch (bearerError: any) {
    if (Number(bearerError?.response?.status || 0) !== 401) {
      throw bearerError;
    }

    const cookieResponse = await apiCookieOnly.get<T>(url, {
      params,
      _skipRefresh: true,
    });
    return cookieResponse.data;
  }
}

async function mutateNegociosWithFallback<T>(
  method: "post" | "put" | "delete",
  url: string,
  payload?: any
): Promise<T> {
  try {
    const bearerResponse = await api.request<T>({
      method,
      url,
      data: payload,
      _skipRefresh: true,
    });
    return bearerResponse.data;
  } catch (bearerError: any) {
    if (Number(bearerError?.response?.status || 0) !== 401) {
      throw bearerError;
    }

    const cookieResponse = await apiCookieOnly.request<T>({
      method,
      url,
      data: payload,
      _skipRefresh: true,
    });
    return cookieResponse.data;
  }
}

export const listNegocios = async (filters?: NegociosFilters): Promise<NegociosResponse> => {
  const page = Number(filters?.page || 1);
  const pageSize = Number(filters?.pageSize || filters?.limit || 10);
  const fetchLimit = Math.max(pageSize * 10, 100);
  const activeFilter =
    filters?.activos !== undefined
      ? filters.activos
      : filters?.activo !== undefined
        ? filters.activo
        : undefined;

  const params = {
    ...(filters?.search ? { search: filters.search } : {}),
    page: 1,
    limit: fetchLimit,
  };

  const rawResult = await getNegociosWithFallback<any>("/negocios", params);
  let result = normalizeNegociosResponse(rawResult, page, pageSize);

  if (activeFilter !== undefined) {
    const filtered = (result.negocios || []).filter((item) => Boolean(item?.activo) === Boolean(activeFilter));
    if (filtered.length > 0 || result.negocios.length === 0) {
      result = {
        ...result,
        negocios: filtered,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)),
      };
    }
  }

  const startIndex = Math.max(0, (page - 1) * pageSize);
  const paginatedNegocios = result.negocios.slice(startIndex, startIndex + pageSize);

  result = {
    ...result,
    page,
    total: result.negocios.length,
    totalActivos: result.negocios.filter((item) => item.activo).length,
    totalInactivos: result.negocios.filter((item) => !item.activo).length,
    totalPages: Math.max(1, Math.ceil(result.negocios.length / pageSize)),
    negocios: paginatedNegocios,
  };

  return result;
};

export const getNegocio = async (id: string): Promise<Negocio> => {
  return getNegociosWithFallback<Negocio>(`/negocios/${id}`);
};

export const createNegocio = async (payload: any): Promise<Negocio> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  return mutateNegociosWithFallback<Negocio>("post", "/negocios", data);
};

export const updateNegocio = async (id: string, payload: any): Promise<Negocio> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  return mutateNegociosWithFallback<Negocio>("put", `/negocios/${id}`, data);
};

export const deleteNegocio = async (id: string): Promise<Negocio> => {
  return mutateNegociosWithFallback<Negocio>("delete", `/negocios/${id}`);
};