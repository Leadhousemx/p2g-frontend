import { api } from "../lib/api";

export type GastoListadoModo = "todos" | "operativos" | "fijos";
export type GastoListadoTipoRegistro = "compra" | "operativo" | "fijo";
export type GastoListadoMetodoPago = "Efectivo" | "Transferencia" | "Cheque" | "Tarjeta" | "Otro";
export type GastoListadoEstadoPago = "Pagado" | "Pendiente" | "No aplica";

export interface GastoListadoApiCompraItem {
  productoNombre?: string;
  productoId?: string;
  precioUnitario?: number;
  cantidad?: number;
  subtotal?: number;
}

export interface GastoListadoApiOperativoItem {
  nombreServicio?: string;
  servicioId?: string;
  cantidad?: number;
  precio?: number;
  total?: number;
}

export interface GastoListadoApiFijoItem {
  nombreGastoFijo?: string;
  gastoFijoId?: string;
  precio?: number;
  total?: number;
}

export interface GastoListadoApiItem {
  _id?: string;
  id?: string;
  tipoRegistro?: GastoListadoTipoRegistro | "compra" | "operacion" | "gasto_fijo";
  subtipoRegistro?: string;
  proveedorId?: string;
  proveedorNombre?: string;
  eventoId?: string;
  eventoNombre?: string;
  sourceEndpoint?: string;
  folio?: string;
  fecha?: string;
  metodoPago?: GastoListadoMetodoPago | string;
  total?: number;
  monto?: number;
  documentoTipo?: string;
  documentoFolio?: string;
  formaPago?: string;
  estadoPago?: GastoListadoEstadoPago | string;
  items?: Array<GastoListadoApiCompraItem | GastoListadoApiOperativoItem | GastoListadoApiFijoItem>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GastosPageResponse {
  items: GastoListadoApiItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ListGastosParams {
  page?: number;
  pageSize?: number;
  tipoRegistro?: GastoListadoModo;
  q?: string;
  folio?: string;
  proveedorId?: string;
  metodoPago?: GastoListadoMetodoPago | string;
  fechaInicio?: string;
  fechaFin?: string;
  minTotal?: number;
  maxTotal?: number;
  sortBy?: "createdAt" | "updatedAt" | "fecha" | "folio" | "metodoPago" | "total" | "tipoRegistro" | "estadoPago" | "proveedorNombre";
  sortOrder?: "asc" | "desc";
}

function normalizePositiveNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeGastosRoot(raw: any) {
  const candidates = [raw, raw?.data, raw?.payload, raw?.result].filter(Boolean);
  return candidates[0] ?? raw;
}

function normalizeGastosPageResponse(raw: any, requestedPage: number, requestedPageSize: number): GastosPageResponse {
  const root = normalizeGastosRoot(raw);
  const items = Array.isArray(root?.items)
    ? root.items
    : Array.isArray(root?.gastos)
      ? root.gastos
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
  const total = Math.max(0, Number(root?.total ?? root?.count ?? root?.totalDocs ?? items.length ?? 0));
  const page = normalizePositiveNumber(root?.page, requestedPage);
  const pageSize = normalizePositiveNumber(root?.pageSize, requestedPageSize);
  const computedTotalPages = total > 0 ? Math.ceil(total / pageSize) : 1;
  const totalPages = normalizePositiveNumber(root?.totalPages, computedTotalPages);
  const hasNextPage = typeof root?.hasNextPage === "boolean" ? root.hasNextPage : page < totalPages;
  const hasPrevPage = typeof root?.hasPrevPage === "boolean" ? root.hasPrevPage : page > 1;

  return {
    items,
    total,
    page,
    pageSize,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

export async function listGastos({
  page = 1,
  pageSize = 10,
  tipoRegistro = "todos",
  q,
  folio,
  proveedorId,
  metodoPago,
  fechaInicio,
  fechaFin,
  minTotal,
  maxTotal,
  sortBy,
  sortOrder,
}: ListGastosParams = {}): Promise<GastosPageResponse> {
  const requestedPage = normalizePositiveNumber(page, 1);
  const requestedPageSize = normalizePositiveNumber(pageSize, 10);

  const response = await api.get("/gastos", {
    params: {
      page: requestedPage,
      pageSize: requestedPageSize,
      tipoRegistro,
      ...(q ? { q } : {}),
      ...(folio ? { folio } : {}),
      ...(proveedorId ? { proveedorId } : {}),
      ...(metodoPago ? { metodoPago } : {}),
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
      ...(Number.isFinite(Number(minTotal)) ? { minTotal: Number(minTotal) } : {}),
      ...(Number.isFinite(Number(maxTotal)) ? { maxTotal: Number(maxTotal) } : {}),
      ...(sortBy ? { sortBy } : {}),
      ...(sortOrder ? { sortOrder } : {}),
    },
  });

  return normalizeGastosPageResponse(response?.data, requestedPage, requestedPageSize);
}
