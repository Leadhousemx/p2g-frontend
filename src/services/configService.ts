import { api } from "../lib/api";

export interface Configuracion {
  _id?: string;
  empresaId: string;
  razonSocial: string;
  nombreComercial: string;
  direccion: string;
  rfc?: string;
  email?: string;
  telefono: string;
  sitioWeb: string;
  aviso: string;
  logoUrl?: string;
  firmaUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

const mapCompanyResponseToConfig = (payload: any): Configuracion => {
  const company = payload?.company || payload?.empresa || payload || {};

  return {
    _id: company?._id || company?.id,
    empresaId: String(company?.empresaId || company?._id || company?.id || ""),
    razonSocial: company?.razonSocial || "",
    nombreComercial: company?.nombreComercial || company?.nombre || "",
    direccion: company?.direccion || "",
    rfc: company?.rfc || "",
    email: company?.email || "",
    telefono: company?.telefono || "",
    sitioWeb: company?.sitioWeb || "",
    aviso: company?.aviso || "",
    logoUrl: company?.logoUrl || company?.logo || "",
    firmaUrl: company?.firmaUrl || "",
    createdAt: company?.createdAt,
    updatedAt: company?.updatedAt,
  };
};

export const getConfig = async (): Promise<Configuracion> => {
  try {
    const companyResponse = await api.get("/company");
    return mapCompanyResponseToConfig(companyResponse.data);
  } catch (companyError: any) {
    const status = Number(companyError?.response?.status || 0);

    if (status === 403) {
      throw companyError;
    }

    const fallbackResponse = await api.get("/empresa/config");
    return mapCompanyResponseToConfig(fallbackResponse.data);
  }
};

export const updateConfig = async (payload: any): Promise<Configuracion> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.put("/empresa/config", data);
  return response.data;
};
