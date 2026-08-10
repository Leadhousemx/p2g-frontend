import { api } from "../lib/api";

export interface Cliente {
  _id: string;
  empresaId: string;
  nombre: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
  cp?: string;
  medio: string;
  fechaNacimiento: string;
  calificacion: "good" | "neutral" | "bad";
  createdAt: string;
  updatedAt: string;
}

export interface ClientesResponse {
  clientes: Cliente[];
  total: number;
}

export interface ClientesPageResponse extends ClientesResponse {
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListClientesPageParams {
  page?: number;
  pageSize?: number;
  q?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeClientesPageResponse(raw: any, requestedPage: number, requestedPageSize: number): ClientesPageResponse {
  const clientes = Array.isArray(raw?.clientes) ? raw.clientes : [];
  const total = Math.max(0, Number(raw?.total || 0));
  const page = normalizePositiveNumber(raw?.page, requestedPage);
  const pageSize = normalizePositiveNumber(raw?.pageSize, requestedPageSize);
  const computedTotalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const totalPages = normalizePositiveNumber(raw?.totalPages, computedTotalPages);
  const hasNextPage = typeof raw?.hasNextPage === "boolean" ? raw.hasNextPage : page < totalPages;
  const hasPrevPage = typeof raw?.hasPrevPage === "boolean" ? raw.hasPrevPage : page > 1;

  return {
    clientes,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

export const listClientes = async ({
  page = 1,
  pageSize = 10,
  q,
  sortBy,
  sortOrder,
}: ListClientesPageParams = {}): Promise<ClientesPageResponse> => {
  const requestedPage = normalizePositiveNumber(page, 1);
  const requestedPageSize = normalizePositiveNumber(pageSize, 10);

  const response = await api.get("/clientes", {
    params: {
      page: requestedPage,
      pageSize: requestedPageSize,
      ...(q ? { q } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    },
  });

  return normalizeClientesPageResponse(response.data, requestedPage, requestedPageSize);
};

export const listClientesPage = listClientes;

export const getCliente = async (id: string): Promise<Cliente> => {
  const response = await api.get(`/clientes/${id}`);
  return response.data;
};

export const createCliente = async (payload: any): Promise<Cliente> => {
  // Strip read-only fields
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};

  const response = await api.post("/clientes", data);
  return response.data;
};

export const updateCliente = async (id: string, payload: any): Promise<Cliente> => {
  // Strip read-only fields
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};

  const response = await api.put(`/clientes/${id}`, data);
  return response.data;
};

export const deleteCliente = async (id: string): Promise<any> => {
  const response = await api.delete(`/clientes/${id}`);
  return response.data;
};
