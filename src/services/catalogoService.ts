import { api } from "../lib/api";

export type CatalogoTipo = "platillos" | "bebidas" | "personal" | "mobiliario" | "audio" | "otros" | "tipoeventos";

export interface CatalogoItem {
  _id: string;
  nombre: string;
  precio: number;
  tipo: CatalogoTipo;
  descripcion?: string;
  activo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogoResponse {
  items: CatalogoItem[];
  total: number;
  totalFiltrado: number;
  tipo: CatalogoTipo;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface CatalogoPorTipo {
  platillos: CatalogoItem[];
  bebidas: CatalogoItem[];
  personal: CatalogoItem[];
  mobiliario: CatalogoItem[];
  audio: CatalogoItem[];
  otros: CatalogoItem[];
  tipoeventos: CatalogoItem[];
}

export interface ListCatalogoOptions {
  q?: string;
  nombre?: string;
  activo?: boolean;
  minPrecio?: number;
  maxPrecio?: number;
  page?: number;
  pageSize?: number;
  sortBy?: "nombre" | "precio" | "activo" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
  sortDir?: "asc" | "desc";
  top?: number;
}

const TIPOS_VALIDOS: CatalogoTipo[] = ["platillos", "bebidas", "personal", "mobiliario", "audio", "otros", "tipoeventos"];

export const isValidTipo = (tipo: string): tipo is CatalogoTipo => {
  return TIPOS_VALIDOS.includes(tipo as CatalogoTipo);
};

function normalizePositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeCatalogoResponse(raw: any, tipo: CatalogoTipo, requestedPage: number, requestedPageSize: number): CatalogoResponse {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const total = Math.max(0, Number(raw?.total || raw?.totalFiltrado || 0));
  const totalFiltrado = Math.max(0, Number(raw?.totalFiltrado || total));
  const page = normalizePositiveNumber(raw?.page, requestedPage);
  const pageSize = normalizePositiveNumber(raw?.pageSize, requestedPageSize);
  const computedTotalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const totalPages = normalizePositiveNumber(raw?.totalPages, computedTotalPages);
  const hasNextPage = typeof raw?.hasNextPage === "boolean" ? raw.hasNextPage : page < totalPages;
  const hasPrevPage = typeof raw?.hasPrevPage === "boolean" ? raw.hasPrevPage : page > 1;

  return {
    items,
    total,
    totalFiltrado,
    tipo,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

/**
 * Lista catálogo por tipo con filtros y paginación
 */
export const listCatalogo = async (
  tipo: CatalogoTipo,
  options?: ListCatalogoOptions
): Promise<CatalogoResponse> => {
  if (!isValidTipo(tipo)) {
    throw new Error(`Tipo de catálogo inválido: ${tipo}`);
  }

  const requestedPage = normalizePositiveNumber(options?.page, 1);
  const requestedPageSize = normalizePositiveNumber(options?.pageSize, 50);
  const sortOrder = options?.sortOrder || options?.sortDir || "asc";
  const params = {
    page: requestedPage,
    pageSize: requestedPageSize,
    sortBy: options?.sortBy || "nombre",
    sortOrder,
    ...(options?.q && { q: options.q }),
    ...(options?.nombre && !options?.q ? { nombre: options.nombre } : {}),
    ...(options?.activo !== undefined && { activo: options.activo }),
    ...(options?.minPrecio !== undefined && { minPrecio: options.minPrecio }),
    ...(options?.maxPrecio !== undefined && { maxPrecio: options.maxPrecio }),
    ...(options?.top !== undefined && { top: options.top }),
  };

  const response = await api.get(`/catalogo/${tipo}`, { params });
  return normalizeCatalogoResponse(response.data, tipo, requestedPage, requestedPageSize);
};

/**
 * Obtiene todos los catálogos activos por empresa
 */
export const getAllCatalogos = async (): Promise<CatalogoPorTipo> => {
  const response = await api.get("/catalogo/todos");
  return response.data;
};

/**
 * Obtiene un item del catálogo específico
 */
export const getCatalogoItem = async (tipo: CatalogoTipo, id: string): Promise<CatalogoItem> => {
  if (!isValidTipo(tipo)) {
    throw new Error(`Tipo de catálogo inválido: ${tipo}`);
  }

  const response = await api.get(`/catalogo/${tipo}/${id}`);
  return response.data;
};

/**
 * Crea un nuevo item en el catálogo
 */
export const createCatalogoItem = async (
  tipo: CatalogoTipo,
  payload: Partial<CatalogoItem>
): Promise<CatalogoItem> => {
  if (!isValidTipo(tipo)) {
    throw new Error(`Tipo de catálogo inválido: ${tipo}`);
  }

  const { _id, empresaId, createdAt, updatedAt, tipo: _, ...data } = payload || {};
  const response = await api.post(`/catalogo/${tipo}`, data);
  return response.data;
};

/**
 * Actualiza un item del catálogo
 */
export const updateCatalogoItem = async (
  tipo: CatalogoTipo,
  id: string,
  payload: Partial<CatalogoItem>
): Promise<CatalogoItem> => {
  if (!isValidTipo(tipo)) {
    throw new Error(`Tipo de catálogo inválido: ${tipo}`);
  }

  const { _id, empresaId, createdAt, updatedAt, tipo: _, ...data } = payload || {};
  const response = await api.put(`/catalogo/${tipo}/${id}`, data);
  return response.data;
};

/**
 * Elimina un item del catálogo
 */
export const deleteCatalogoItem = async (
  tipo: CatalogoTipo,
  id: string
): Promise<{ message: string; id: string }> => {
  if (!isValidTipo(tipo)) {
    throw new Error(`Tipo de catálogo inválido: ${tipo}`);
  }

  const response = await api.delete(`/catalogo/${tipo}/${id}`);
  return response.data;
};
