import { api } from "../lib/api";

export type FormaDePagoCompra = "transferencia" | "efectivo" | "tarjeta" | "cheque" | "otro";

export interface CompraPopulated {
  _id: string;
  folio: string;
  total: number;
  anticipo?: number;
  totalPagado?: number;
  saldoPendiente?: number;
  estadoPago?: "Pagado" | "Pendiente";
}

export interface PagoCompra {
  _id: string;
  folio?: string;
  empresaId: string;
  compraId: CompraPopulated;
  origen?: "sistema" | "manual";
  usuarioId?: string;
  fecha: string;
  monto: number;
  formaDePago: FormaDePagoCompra;
  cuenta?: string;
  referencia?: string;
  notas?: string;
  createdBy?: {
    nombre?: string;
    email?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface PagosCompraResponse {
  pagos: PagoCompra[];
  total: number;
  totalFiltrado?: number;
  page: number;
  pageSize: number;
}

export interface PagosCompraFilters {
  compraId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface PagoCompraPayload {
  compraId: string;
  fecha?: string;
  monto: number;
  formaDePago: FormaDePagoCompra;
  cuenta?: string;
  referencia?: string;
  notas?: string;
}

export interface CrearPagoCompraResponse {
  pago: PagoCompra;
  compra: CompraPopulated;
  resumen?: {
    totalPagos?: number;
    totalPagado?: number;
    saldoPendiente?: number;
  };
}

export const listPagosCompra = async (filters?: PagosCompraFilters): Promise<PagosCompraResponse> => {
  const params = new URLSearchParams();
  if (filters?.compraId) params.append("compraId", filters.compraId);
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.pageSize) params.append("pageSize", String(filters.pageSize));
  if (filters?.sortBy) params.append("sortBy", filters.sortBy);
  if (filters?.sortDir) params.append("sortDir", filters.sortDir);

  const query = params.toString();
  const url = query ? `/pagos-compras?${query}` : "/pagos-compras";
  const response = await api.get(url);
  return response.data;
};

export const createPagoCompra = async (payload: PagoCompraPayload): Promise<CrearPagoCompraResponse> => {
  const response = await api.post("/pagos-compras", payload);
  return response.data;
};

export const deletePagoCompra = async (id: string): Promise<{ message: string; pagoId: string }> => {
  const response = await api.delete(`/pagos-compras/${id}`);
  return response.data;
};
