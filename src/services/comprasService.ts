import { api } from "../lib/api";
import { ensureCsrfToken, refreshCsrfToken } from "./csrfService";

const API_URL = import.meta.env.DEV
  ? ""
  : (import.meta.env.VITE_API_URL || "https://api.brentrix.com");

export interface CompraItem {
  productoNombre: string;
  productoId?: string;
  precioUnitario: number;
  cantidad: number;
  subtotal: number;
}

export interface Compra {
  _id: string;
  folio: string;
  fecha: string;
  documentoTipo: "Factura" | "Recibo" | "Nota" | "Remisión" | "Orden de Compra" | "Otro";
  documentoFolio: string;
  proveedorId: string;
  proveedorNombre: string;
  formaPago: "Contado" | "Crédito" | "Anticipo";
  metodoPago: "Efectivo" | "Transferencia" | "Cheque" | "Tarjeta" | "Otro";
  items: CompraItem[];
  descuento?: number;
  subtotalProductos?: number;
  monto: number;
  total: number;
  totalCompra?: number;
  anticipo?: number;
  totalPagado?: number;
  saldoPendiente?: number;
  estadoPago?: "Pagado" | "Pendiente";
  tipoCompra: "general" | "evento";
  eventoId?: string;
  eventoNombre?: string;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComprasResponse {
  compras: Compra[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CompraPayload {
  fecha: string;
  documentoTipo: Compra["documentoTipo"];
  documentoFolio: string;
  proveedorId: string;
  formaPago: Compra["formaPago"];
  anticipo?: number;
  descuento?: number;
  total?: number;
  metodoPago: Compra["metodoPago"];
  tipoCompra: Compra["tipoCompra"];
  eventoId?: string;
  eventoNombre?: string;
  items: CompraItem[];
}

export interface NextFolioResponse {
  nextFolio: string;
}

export const listCompras = async (filters?: {
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  tipoCompra?: "general" | "evento";
  eventoId?: string;
  page?: number;
  pageSize?: number;
}): Promise<ComprasResponse> => {
  const params = new URLSearchParams();
  if (filters?.desde) params.append("desde", filters.desde);
  if (filters?.hasta) params.append("hasta", filters.hasta);
  if (filters?.proveedorId) params.append("proveedorId", filters.proveedorId);
  if (filters?.tipoCompra) params.append("tipoCompra", filters.tipoCompra);
  if (filters?.eventoId) params.append("eventoId", filters.eventoId);
  if (filters?.page) params.append("page", filters.page.toString());
  if (filters?.pageSize) params.append("pageSize", filters.pageSize.toString());

  const queryString = params.toString();
  const url = queryString ? `/compras?${queryString}` : "/compras";
  const response = await api.get(url);

  const data = response?.data;
  const rootCandidates = [data, data?.data, data?.payload, data?.result].filter(Boolean);
  const root = rootCandidates[0] ?? data;

  if (Array.isArray(root)) {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 10;
    const total = root.length;
    return {
      compras: root,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  }

  const compras = Array.isArray(root?.compras)
    ? root.compras
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
              : [];

  const page = Number(root?.page || filters?.page || 1);
  const pageSize = Number(root?.pageSize || root?.limit || filters?.pageSize || 10);
  const total = Number(
    root?.total ?? root?.totalFiltrado ?? root?.count ?? root?.totalDocs ?? compras.length
  );
  const totalPages = Number(
    root?.totalPages ?? root?.pages ?? Math.max(1, Math.ceil(total / Math.max(1, pageSize)))
  );

  return {
    compras,
    total,
    page,
    pageSize,
    totalPages,
  };
};

export const getCompra = async (id: string): Promise<Compra> => {
  const response = await api.get(`/compras/${id}`);
  return response.data;
};

export const getNextFolio = async (): Promise<string> => {
  const response = await api.get("/compras/next-folio");
  return response.data?.nextFolio || "C-0001";
};

export const createCompra = async (payload: CompraPayload): Promise<Compra> => {
  // Strip read-only fields - empresaId viene del token
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.post("/compras", data);
  return response.data;
};

export const updateCompra = async (id: string, payload: CompraPayload): Promise<Compra> => {
  // Strip read-only fields y folio (no se edita)
  const { _id, empresaId, folio, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.put(`/compras/${id}`, data);
  return response.data;
};

export const deleteCompra = async (id: string): Promise<{ message: string; compra: Compra }> => {
  const sendDelete = async (csrfToken: string) => {
    return api.delete(`/compras/${id}`, {
      headers: {
        "X-CSRF-Token": csrfToken,
      },
    });
  };

  const csrfToken = await ensureCsrfToken(API_URL);

  try {
    const response = await sendDelete(csrfToken);
    return response.data;
  } catch (error: any) {
    const status = Number(error?.response?.status || 0);
    if (status === 403) {
      const refreshedToken = await refreshCsrfToken(API_URL);
      const retryResponse = await sendDelete(refreshedToken);
      return retryResponse.data;
    }
    throw error;
  }
};
