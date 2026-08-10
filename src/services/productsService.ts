import { api } from "../lib/api";

export interface Producto {
  _id: string;
  nombre: string;
  precioUnitario: number;
  descripcion?: string;
  activo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductosResponse {
  productos: Producto[];
  total: number;
  page: number;
  totalPages: number;
}

export interface ProductosFilters {
  search?: string;
  page?: number;
  limit?: number;
  activos?: boolean;
}

export const listProductos = async (filters?: ProductosFilters): Promise<ProductosResponse> => {
  const params = new URLSearchParams();
  if (filters?.search) params.append("search", filters.search);
  if (filters?.page) params.append("page", String(filters.page));
  if (filters?.limit) params.append("limit", String(filters.limit));
  if (filters?.activos !== undefined) params.append("activos", String(filters.activos));
  const queryString = params.toString();
  const url = queryString ? `/productos?${queryString}` : "/productos";
  const response = await api.get(url);
  return response.data;
};

export const searchProductos = async (search: string): Promise<Producto[]> => {
  try {
    const response = await api.get(`/productos/buscar?nombre=${encodeURIComponent(search)}`);
    const data = response?.data;

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.productos)) return data.productos;
    if (Array.isArray(data?.items)) return data.items;
    return [];
  } catch {
    const response = await api.get(`/productos?search=${encodeURIComponent(search)}&limit=10`);
    return response.data.productos || [];
  }
};

export const getProducto = async (id: string): Promise<Producto> => {
  const response = await api.get(`/productos/${id}`);
  return response.data;
};

export const createProducto = async (payload: any): Promise<Producto> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.post("/productos", data);
  return response.data;
};

export const updateProducto = async (id: string, payload: any): Promise<Producto> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.put(`/productos/${id}`, data);
  return response.data;
};

export const deleteProducto = async (id: string): Promise<{ message: string; producto: Producto }> => {
  const response = await api.delete(`/productos/${id}`);
  return response.data;
};
