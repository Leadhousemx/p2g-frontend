import { api } from "../lib/api";

export interface RegistroGastoFijoItem {
  nombreGastoFijo: string;
  gastoFijoId?: string;
  precio: number;
  total?: number;
}

export interface RegistroGastoFijo {
  _id: string;
  folio: string;
  fecha: string;
  metodoPago: "Efectivo" | "Transferencia" | "Cheque" | "Tarjeta" | "Otro";
  items: RegistroGastoFijoItem[];
  total: number;
  empresaId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegistroGastoFijoPayload {
  fecha: string;
  metodoPago: RegistroGastoFijo["metodoPago"];
  items: RegistroGastoFijoItem[];
}

export interface RegistrosGastosFijosResponse {
  registros: RegistroGastoFijo[];
  total?: number;
}

export interface RegistrosGastosFijosPageResponse {
  registros: RegistroGastoFijo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListRegistrosGastosFijosPageParams {
  page?: number;
  pageSize?: number;
  q?: string;
  folio?: string;
  metodoPago?: RegistroGastoFijo["metodoPago"];
  fechaInicio?: string;
  fechaFin?: string;
  minTotal?: number;
  maxTotal?: number;
  sortBy?: "createdAt" | "fecha" | "folio" | "metodoPago" | "total";
  sortOrder?: "asc" | "desc";
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeRegistrosGastosFijosRoot(raw: any) {
  const candidates = [raw, raw?.data, raw?.payload, raw?.result].filter(Boolean);
  return candidates[0] ?? raw;
}

function normalizeRegistrosGastosFijosPageResponse(
  raw: any,
  requestedPage: number,
  requestedPageSize: number
): RegistrosGastosFijosPageResponse {
  const root = normalizeRegistrosGastosFijosRoot(raw);
  const registros = Array.isArray(root?.registros)
    ? root.registros
    : Array.isArray(root?.items)
      ? root.items
      : Array.isArray(root?.results)
        ? root.results
        : Array.isArray(root?.rows)
          ? root.rows
          : Array.isArray(root?.docs)
            ? root.docs
            : Array.isArray(root?.data)
              ? root.data
              : Array.isArray(root)
                ? root
                : [];
  const total = Math.max(
    0,
    Number(root?.total ?? root?.totalFiltrado ?? root?.count ?? root?.totalDocs ?? registros.length ?? 0)
  );
  const page = normalizePositiveNumber(root?.page, requestedPage);
  const pageSize = normalizePositiveNumber(root?.pageSize, requestedPageSize);
  const computedTotalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const totalPages = normalizePositiveNumber(root?.totalPages, computedTotalPages);
  const hasNextPage = typeof root?.hasNextPage === "boolean" ? root.hasNextPage : page < totalPages;
  const hasPrevPage = typeof root?.hasPrevPage === "boolean" ? root.hasPrevPage : page > 1;

  return {
    registros,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

export async function getNextFolioRegistroGastoFijo(): Promise<string> {
  const response = await api.get("/registros-gastos-fijos/next-folio");
  return response?.data?.nextFolio || "GFI-0001";
}

export async function listRegistrosGastosFijosPage({
  page = 1,
  pageSize = 10,
  q,
  folio,
  metodoPago,
  fechaInicio,
  fechaFin,
  minTotal,
  maxTotal,
  sortBy,
  sortOrder,
}: ListRegistrosGastosFijosPageParams = {}): Promise<RegistrosGastosFijosPageResponse> {
  const requestedPage = normalizePositiveNumber(page, 1);
  const requestedPageSize = normalizePositiveNumber(pageSize, 10);

  const response = await api.get("/registros-gastos-fijos", {
    params: {
      page: requestedPage,
      pageSize: requestedPageSize,
      ...(q ? { q } : {}),
      ...(folio ? { folio } : {}),
      ...(metodoPago ? { metodoPago } : {}),
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
      ...(Number.isFinite(Number(minTotal)) ? { minTotal: Number(minTotal) } : {}),
      ...(Number.isFinite(Number(maxTotal)) ? { maxTotal: Number(maxTotal) } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    },
  });

  return normalizeRegistrosGastosFijosPageResponse(response?.data, requestedPage, requestedPageSize);
}

export async function listRegistrosGastosFijos(): Promise<RegistrosGastosFijosResponse> {
  const response = await api.get("/registros-gastos-fijos");
  const root = normalizeRegistrosGastosFijosRoot(response?.data);

  return {
    registros: Array.isArray(root?.registros)
      ? root.registros
      : Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root?.results)
          ? root.results
          : Array.isArray(root?.rows)
            ? root.rows
            : Array.isArray(root?.docs)
              ? root.docs
              : Array.isArray(root?.data)
                ? root.data
                : Array.isArray(root)
                  ? root
                  : [],
    total: Number(
      root?.total ?? root?.totalFiltrado ?? root?.count ?? root?.totalDocs ?? root?.registros?.length ?? 0
    ),
  };
}

export async function getRegistroGastoFijo(id: string): Promise<RegistroGastoFijo> {
  const response = await api.get(`/registros-gastos-fijos/${id}`);
  return response.data;
}

export async function createRegistroGastoFijo(payload: RegistroGastoFijoPayload): Promise<RegistroGastoFijo> {
  const response = await api.post("/registros-gastos-fijos", payload);
  return response.data;
}

export async function updateRegistroGastoFijo(id: string, payload: RegistroGastoFijoPayload): Promise<RegistroGastoFijo> {
  const response = await api.put(`/registros-gastos-fijos/${id}`, payload);
  return response.data;
}

export async function deleteRegistroGastoFijo(id: string): Promise<void> {
  await api.delete(`/registros-gastos-fijos/${id}`);
}