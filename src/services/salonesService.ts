import { api } from "../lib/api";

const SALON_TIPO = "Salón de eventos";

function extractNegociosCollection(payload: any): any[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload?.negocios)) {
    return payload.negocios;
  }

  if (Array.isArray(payload?.data?.negocios)) {
    return payload.data.negocios;
  }

  if (Array.isArray(payload?.data)) {
    return payload.data;
  }

  if (Array.isArray(payload?.docs)) {
    return payload.docs;
  }

  return [];
}

function isSalonRecord(value: any): boolean {
  return String(value?.tipo || "").trim().toLowerCase() === SALON_TIPO.toLowerCase();
}

export interface Salon {
  _id: string;
  nombre: string;
  descripcion?: string;
  ubicacion?: string;
  capacidad?: number;
  telefono?: string;
  email?: string;
  notas?: string;
  activo: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export const listSalones = async (): Promise<Salon[]> => {
  const response = await api.get("/negocios");
  return extractNegociosCollection(response.data).filter(isSalonRecord);
};

export const getSalon = async (id: string): Promise<Salon> => {
  const response = await api.get(`/negocios/${id}`);
  return response.data;
};

export const createSalon = async (payload: any): Promise<Salon> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.post("/negocios", {
    ...data,
    tipo: SALON_TIPO,
  });
  return response.data;
};

export const updateSalon = async (id: string, payload: any): Promise<Salon> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.put(`/negocios/${id}`, {
    ...data,
    tipo: SALON_TIPO,
  });
  return response.data;
};

export const deleteSalon = async (id: string): Promise<void> => {
  await api.delete(`/negocios/${id}`);
};

export const removeSalon = deleteSalon;
