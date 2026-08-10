import { api } from "../lib/api";

export interface Empresa {
  _id: string;
  nombre: string;
  logo?: string;
  direccion?: string;
  telefono?: string;
  email?: string;
  rfc?: string;
  razonSocial?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export const getEmpresa = async (): Promise<Empresa> => {
  const response = await api.get("/empresa");
  return response.data;
};

export const updateEmpresa = async (payload: any): Promise<Empresa> => {
  const { _id, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.put("/empresa", data);
  return response.data;
};
