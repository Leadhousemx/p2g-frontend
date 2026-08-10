import { api } from "../lib/api";
import { getToken } from "../utils/tokenManager";

const RFC_GENERICO = "XAXX010101000";

const readSessionJson = (key: string): any => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const decodeTokenPayload = (token: string | null): any => {
  if (!token) return null;
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
};

const resolveEmpresaId = (payload: any): string => {
  const fromPayload = String(payload?.empresaId || "").trim();
  if (fromPayload) return fromPayload;

  const authUser = readSessionJson("authUser") || {};
  const authCompany = readSessionJson("authCompany") || {};
  const decoded = decodeTokenPayload(getToken()) || {};

  return String(
    authCompany?._id ||
      authCompany?.id ||
      authUser?.empresaId ||
      authUser?.companyId ||
      decoded?.empresaId ||
      decoded?.companyId ||
      decoded?.empresa?._id ||
      decoded?.empresa?.id ||
      ""
  ).trim();
};

export interface Proveedor {
  _id: string;
  nombreComercial: string;
  razonSocial: string;
  rfc: string;
  telefono: string;
  email: string;
  contactoNombre: string;
  formaPago: "contado" | "credito";
  activo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProveedorDetalle extends Proveedor {
  totalCompras?: number;
  cantidadCompras?: number;
}

export interface ProveedoresResponse {
  proveedores: Proveedor[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface ListProveedoresOptions {
  q?: string;
  searchNombre?: string;
  searchRfc?: string;
  activo?: boolean;
  formaPago?: "contado" | "credito";
  rfcGenerico?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "updatedAt" | "nombreComercial" | "razonSocial" | "rfc" | "email" | "telefono" | "contactoNombre" | "formaPago" | "activo";
  sortOrder?: "asc" | "desc";
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeProveedoresResponse(raw: any, requestedPage: number, requestedPageSize: number): ProveedoresResponse {
  if (Array.isArray(raw)) {
    const total = raw.length;
    const totalPages = Math.max(1, Math.ceil(total / requestedPageSize));
    return {
      proveedores: raw,
      total,
      page: requestedPage,
      pageSize: requestedPageSize,
      totalPages,
      hasNextPage: requestedPage < totalPages,
      hasPrevPage: requestedPage > 1,
    };
  }

  const proveedores = Array.isArray(raw?.proveedores) ? raw.proveedores : [];
  const total = Math.max(0, Number(raw?.total || 0));
  const page = normalizePositiveNumber(raw?.page, requestedPage);
  const pageSize = normalizePositiveNumber(raw?.pageSize, requestedPageSize);
  const computedTotalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const totalPages = normalizePositiveNumber(raw?.totalPages, computedTotalPages);
  const hasNextPage = typeof raw?.hasNextPage === "boolean" ? raw.hasNextPage : page < totalPages;
  const hasPrevPage = typeof raw?.hasPrevPage === "boolean" ? raw.hasPrevPage : page > 1;

  return {
    proveedores,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

export const listProveedores = async (options: ListProveedoresOptions = {}): Promise<ProveedoresResponse> => {
  const {
    q = "",
    searchNombre = "",
    searchRfc = "",
    activo,
    formaPago,
    rfcGenerico,
    page = 1,
    pageSize = 10,
    sortBy,
    sortOrder,
  } = options;
  const requestedPage = normalizePositiveNumber(page, 1);
  const requestedPageSize = normalizePositiveNumber(pageSize, 10);
  const response = await api.get("/proveedores", {
    params: {
      ...(q ? { q } : {}),
      ...(searchNombre && !q ? { searchNombre } : {}),
      ...(searchRfc && !q ? { searchRfc } : {}),
      ...(activo !== undefined ? { activo } : {}),
      ...(formaPago ? { formaPago } : {}),
      ...(rfcGenerico !== undefined ? { rfcGenerico } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
      page: requestedPage,
      pageSize: requestedPageSize,
    },
  });

  return normalizeProveedoresResponse(response.data, requestedPage, requestedPageSize);
};

/**
 * Carga todos los proveedores del sistema iterando sobre las páginas.
 * Útil para selectores que necesitan mostrar todos los proveedores disponibles.
 */
export const listAllProveedores = async (options: Omit<ListProveedoresOptions, "page" | "pageSize"> = {}): Promise<Proveedor[]> => {
  const PAGE_SIZE = 100;
  const firstPage = await listProveedores({ ...options, page: 1, pageSize: PAGE_SIZE });

  if (firstPage.totalPages <= 1) {
    return firstPage.proveedores;
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      listProveedores({ ...options, page: index + 2, pageSize: PAGE_SIZE })
    )
  );

  return [
    ...firstPage.proveedores,
    ...remainingResponses.flatMap((page) => page.proveedores),
  ];
};

export const getProveedor = async (id: string): Promise<ProveedorDetalle> => {
  const response = await api.get(`/proveedores/${id}`);
  return response.data;
};

export const createProveedor = async (payload: any): Promise<Proveedor> => {
  // Strip read-only fields
  const { _id, createdAt, updatedAt, ...data } = payload || {};
  const rfcNormalizado = String(data?.rfc || "").trim().toUpperCase();
  data.rfc = rfcNormalizado || RFC_GENERICO;
  data.nombre = String(data?.nombre || data?.nombreComercial || "").trim();
  const empresaId = resolveEmpresaId(data);
  if (empresaId) {
    data.empresaId = empresaId;
  }

  const response = await api.post("/proveedores", data);
  return response.data;
};

export const updateProveedor = async (id: string, payload: any): Promise<Proveedor> => {
  // Strip read-only fields
  const { _id, createdAt, updatedAt, ...data } = payload || {};

  const response = await api.put(`/proveedores/${id}`, data);
  return response.data;
};

export const deleteProveedor = async (id: string): Promise<{ message: string }> => {
  const response = await api.delete(`/proveedores/${id}`);
  return response.data;
};

export const removeProveedor = deleteProveedor;
