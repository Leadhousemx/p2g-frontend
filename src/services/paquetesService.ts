import { api } from "../lib/api";

export interface Elemento {
  idCatalogo: string;
  tipo: "platillo" | "bebida" | "mobiliario" | "personal" | "adicional";
  nombre: string;
  precioPorMesa: number;
  cantidadMesas: number;
  total: number;
}

export interface Paquete {
  _id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  elementos: Elemento[];
  totalPaquete: number;
  descuentoTipo: "porcentaje" | "monto" | null;
  descuentoValor: number;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaquetesResponse {
  paquetes: Paquete[];
  total: number;
  totalFiltrado: number;
  page: number;
  pageSize: number;
}

export interface ListPaquetesOptions {
  nombre?: string;
  activo?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: string;
}

export const listPaquetes = async (options?: ListPaquetesOptions): Promise<PaquetesResponse> => {
  const params = {
    page: options?.page || 1,
    pageSize: options?.pageSize || 10,
    sortBy: options?.sortBy || "nombre",
    sortDir: options?.sortDir || "asc",
    ...(options?.nombre && { nombre: options.nombre }),
    ...(options?.activo !== undefined && { activo: options.activo }),
  };

  const response = await api.get("/paquetes", { params });
  return response.data;
};

export const getPaquete = async (id: string): Promise<Paquete> => {
  const response = await api.get(`/paquetes/${id}`);
  return response.data;
};

export const createPaquete = async (payload: any): Promise<Paquete> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.post("/paquetes", data);
  return response.data;
};

export const updatePaquete = async (id: string, payload: any): Promise<Paquete> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.put(`/paquetes/${id}`, data);
  return response.data;
};

export const deletePaquete = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await api.delete(`/paquetes/${id}`);
  return response.data;
};
