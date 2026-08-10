import { api } from "../lib/api";

export interface GastoOperativoItem {
  nombreServicio: string;
  servicioId?: string;
  cantidad: number;
  precio: number;
  total?: number;
}

export interface GastoOperativo {
  _id: string;
  folio: string;
  fecha: string;
  metodoPago: "Efectivo" | "Transferencia" | "Cheque" | "Tarjeta" | "Otro";
  tipoGasto: "general" | "evento";
  eventoId?: string;
  eventoNombre?: string;
  items: GastoOperativoItem[];
  total: number;
  empresaId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GastoOperativoPayload {
  fecha: string;
  metodoPago: GastoOperativo["metodoPago"];
  tipoGasto: GastoOperativo["tipoGasto"];
  eventoId?: string;
  items: GastoOperativoItem[];
}

export interface GastosOperativosResponse {
  gastosOperativos: GastoOperativo[];
  total?: number;
}

export interface GastosOperativosPageResponse {
  gastosOperativos: GastoOperativo[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListGastosOperativosPageParams {
  page?: number;
  pageSize?: number;
  q?: string;
  folio?: string;
  tipoGasto?: GastoOperativo["tipoGasto"];
  metodoPago?: GastoOperativo["metodoPago"];
  eventoId?: string;
  fechaInicio?: string;
  fechaFin?: string;
  minTotal?: number;
  maxTotal?: number;
  sortBy?: "createdAt" | "fecha" | "folio" | "tipoGasto" | "metodoPago" | "total";
  sortOrder?: "asc" | "desc";
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeGastosOperativosRoot(raw: any) {
  const candidates = [raw, raw?.data, raw?.payload, raw?.result].filter(Boolean);
  return candidates[0] ?? raw;
}

function normalizeGastosOperativosPageResponse(
  raw: any,
  requestedPage: number,
  requestedPageSize: number
): GastosOperativosPageResponse {
  const root = normalizeGastosOperativosRoot(raw);
  const gastosOperativos = Array.isArray(root?.gastosOperativos)
    ? root.gastosOperativos
    : Array.isArray(root?.gastos)
      ? root.gastos
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
    Number(
      root?.total ??
      root?.totalFiltrado ??
      root?.count ??
      root?.totalDocs ??
      gastosOperativos.length ??
      0
    )
  );
  const page = normalizePositiveNumber(root?.page, requestedPage);
  const pageSize = normalizePositiveNumber(root?.pageSize, requestedPageSize);
  const computedTotalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const totalPages = normalizePositiveNumber(root?.totalPages, computedTotalPages);
  const hasNextPage = typeof root?.hasNextPage === "boolean" ? root.hasNextPage : page < totalPages;
  const hasPrevPage = typeof root?.hasPrevPage === "boolean" ? root.hasPrevPage : page > 1;

  return {
    gastosOperativos,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

export async function getNextFolioGastoOperativo(): Promise<string> {
  const response = await api.get("/gastos-operativos/next-folio");
  return response?.data?.nextFolio || "OPE-0001";
}

export async function listGastosOperativosPage({
  page = 1,
  pageSize = 10,
  q,
  folio,
  tipoGasto,
  metodoPago,
  eventoId,
  fechaInicio,
  fechaFin,
  minTotal,
  maxTotal,
  sortBy,
  sortOrder,
}: ListGastosOperativosPageParams = {}): Promise<GastosOperativosPageResponse> {
  const requestedPage = normalizePositiveNumber(page, 1);
  const requestedPageSize = normalizePositiveNumber(pageSize, 10);

  const response = await api.get("/gastos-operativos", {
    params: {
      page: requestedPage,
      pageSize: requestedPageSize,
      ...(q ? { q } : {}),
      ...(folio ? { folio } : {}),
      ...(tipoGasto ? { tipoGasto } : {}),
      ...(metodoPago ? { metodoPago } : {}),
      ...(eventoId ? { eventoId } : {}),
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
      ...(Number.isFinite(Number(minTotal)) ? { minTotal: Number(minTotal) } : {}),
      ...(Number.isFinite(Number(maxTotal)) ? { maxTotal: Number(maxTotal) } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    },
  });

  return normalizeGastosOperativosPageResponse(response?.data, requestedPage, requestedPageSize);
}

export async function listGastosOperativos(): Promise<GastosOperativosResponse> {
  const response = await api.get("/gastos-operativos");
  const root = normalizeGastosOperativosRoot(response?.data);

  return {
    gastosOperativos: Array.isArray(root?.gastosOperativos)
      ? root.gastosOperativos
      : Array.isArray(root?.gastos)
        ? root.gastos
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
      root?.total ?? root?.totalFiltrado ?? root?.count ?? root?.totalDocs ?? root?.gastosOperativos?.length ?? root?.gastos?.length ?? 0
    ),
  };
}
export async function getGastoOperativo(id: string): Promise<GastoOperativo> {
  const response = await api.get(`/gastos-operativos/${id}`);
  return response.data;
}

export async function createGastoOperativo(payload: GastoOperativoPayload): Promise<GastoOperativo> {
  const response = await api.post("/gastos-operativos", payload);
  return response.data;
}

export async function updateGastoOperativo(id: string, payload: GastoOperativoPayload): Promise<GastoOperativo> {
  const response = await api.put(`/gastos-operativos/${id}`, payload);
  return response.data;
}

export async function deleteGastoOperativo(id: string): Promise<void> {
  await api.delete(`/gastos-operativos/${id}`);
}