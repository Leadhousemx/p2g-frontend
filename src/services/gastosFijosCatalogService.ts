import { api } from "../lib/api";

export interface GastoFijoCatalogo {
  _id: string;
  nombre: string;
  precio?: number;
  descripcion?: string;
  activo?: boolean;
  empresaId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GastosFijosCatalogoResponse {
  gastosFijos: GastoFijoCatalogo[];
  total?: number;
}

export async function listGastosFijosCatalogo(): Promise<GastosFijosCatalogoResponse> {
  const response = await api.get("/gastos-fijos");
  const data = response?.data;

  return {
    gastosFijos: Array.isArray(data?.gastosFijos)
      ? data.gastosFijos
      : Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
          ? data
          : [],
    total: Number(data?.total || 0),
  };
}

export async function searchGastosFijosCatalogo(nombre: string): Promise<GastoFijoCatalogo[]> {
  const response = await api.get(`/gastos-fijos/buscar?nombre=${encodeURIComponent(nombre)}`);
  const data = response?.data;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.gastosFijos)) return data.gastosFijos;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function createGastoFijoCatalogo(payload: Partial<GastoFijoCatalogo>): Promise<GastoFijoCatalogo> {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.post("/gastos-fijos", data);
  return response.data;
}