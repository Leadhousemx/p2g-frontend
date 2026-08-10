import { api } from "../lib/api";

export type FormaDePago = "transferencia" | "efectivo" | "tarjeta" | "cheque" | "otro";

export interface CotizacionPopulated {
  _id: string;
  folio: string;
  nombreEvento: string;
  total: number;
  anticipo: number;
  saldo: number;
  fechaEvento?: string;
  lugarEvento?: string;
  direccionEvento?: string;
  ubicacion?: string;
  salonNombre?: string;
  salon?: {
    nombre?: string;
  };
  cliente?: {
    nombre?: string;
    telefono?: string;
    email?: string;
  };
  empresa?: {
    logoUrl?: string;
  };
}

export interface CreatedByPopulated {
  nombre: string;
  email: string;
}

export interface Pago {
  _id: string;
  folio?: string;
  empresaId: string;
  cotizacionId: CotizacionPopulated | string;
  origen?: "sistema" | "manual";
  usuarioId?: string;
  fecha: string;
  monto: number;
  formaDePago: FormaDePago;
  cuenta?: string;
  referencia?: string;
  notas?: string;
  estado?: string;
  status?: string;
  deletedAt?: string | null;
  cancelado?: boolean;
  canceladoAt?: string | null;
  anulado?: boolean;
  anuladoAt?: string | null;
  activo?: boolean;
  createdBy: CreatedByPopulated;
  createdAt: string;
  updatedAt: string;
}

export interface PagoReciboEmpresa {
  _id?: string;
  id?: string;
  nombre?: string;
  nombreComercial?: string;
  razonSocial?: string;
  rfc?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  logoUrl?: string;
}

export interface PagoReciboNegocio {
  _id?: string;
  id?: string;
  nombre?: string;
  salonNombre?: string;
  direccion?: string;
  ubicacion?: string;
}

export interface PagoReciboResumen {
  saldoAnterior?: number;
  saldoPendiente?: number;
  totalServicio?: number;
  totalPagos?: number;
  anticipo?: number;
  saldo?: number;
}

export interface PagoReciboDetalleResponse {
  pago?: Pago;
  cotizacion?: CotizacionPopulated;
  empresa?: PagoReciboEmpresa;
  negocio?: PagoReciboNegocio;
  resumen?: PagoReciboResumen;
}

export interface PagosResponse {
  pagos: Pago[];
  total: number;
  totalFiltrado: number;
  page: number;
  pageSize: number;
}

export interface PagosFilters {
  cotizacionId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export interface PagoPayload {
  cotizacionId: string;
  fecha?: string;
  monto: number;
  formaDePago: FormaDePago;
  cuenta?: string;
  referencia?: string;
  notas?: string;
}

export interface CrearPagoResponse {
  pago: Pago;
  cotizacion: CotizacionPopulated;
  resumen: {
    totalPagos: number;
    anticipo: number;
    saldo: number;
  };
}

export const listPagos = async (filters?: PagosFilters): Promise<PagosResponse> => {
  const params = new URLSearchParams();
  if (filters?.cotizacionId) params.append("cotizacionId", filters.cotizacionId);
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.pageSize) params.append("pageSize", String(filters.pageSize));
  if (filters?.sortBy) params.append("sortBy", filters.sortBy);
  if (filters?.sortDir) params.append("sortDir", filters.sortDir);

  const queryString = params.toString();
  const url = queryString ? `/pagos?${queryString}` : "/pagos";
  const response = await api.get(url);
  return response.data;
};

export const getPago = async (id: string): Promise<Pago> => {
  const response = await api.get(`/pagos/${id}`);
  return response.data;
};

export const getPagoReciboDetalle = async (id: string): Promise<PagoReciboDetalleResponse> => {
  const response = await api.get(`/pagos/${id}`);
  return response.data;
};

export const createPago = async (payload: PagoPayload): Promise<CrearPagoResponse> => {
  const response = await api.post("/pagos", payload);
  return response.data;
};

export const deletePago = async (id: string): Promise<{ message: string; pagoId: string }> => {
  const response = await api.delete(`/pagos/${id}`);
  return response.data;
};

export const removePago = deletePago;
