import { api } from "../lib/api";

export interface ServicioOperativo {
  _id: string;
  nombre: string;
  precio?: number;
  descripcion?: string;
  activo?: boolean;
  empresaId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ServiciosOperativosResponse {
  servicios: ServicioOperativo[];
  total?: number;
}

export async function listServiciosOperativos(): Promise<ServiciosOperativosResponse> {
  const response = await api.get("/servicios-operativos");
  const data = response?.data;

  return {
    servicios: Array.isArray(data?.servicios)
      ? data.servicios
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [],
    total: Number(data?.total || 0),
  };
}

export async function searchServiciosOperativos(nombre: string): Promise<ServicioOperativo[]> {
  const response = await api.get(`/servicios-operativos/buscar?nombre=${encodeURIComponent(nombre)}`);
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.servicios)) return data.servicios;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function createServicioOperativo(payload: Partial<ServicioOperativo>): Promise<ServicioOperativo> {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.post("/servicios-operativos", data);
  return response.data;
}