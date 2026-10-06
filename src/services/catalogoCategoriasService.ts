import { api } from "../lib/api";

export interface CatalogoCategoria {
  _id: string;
  nombre: string;
  descripcion: string;
  slug: string;
  empresaId: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCatalogoCategoriaPayload {
  nombre: string;
  descripcion?: string;
}

export const listCatalogoCategorias = async (): Promise<CatalogoCategoria[]> => {
  const response = await api.get("/catalogo-categorias");
  return Array.isArray(response.data) ? response.data : [];
};

export const createCatalogoCategoria = async (
  payload: CreateCatalogoCategoriaPayload
): Promise<CatalogoCategoria> => {
  const response = await api.post("/catalogo-categorias", payload);
  return response.data;
};
