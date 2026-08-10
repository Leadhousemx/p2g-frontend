import { api } from "../lib/api";

export interface Evento {
  _id: string;
  id?: string;
  nombre: string;
  descripcion?: string;
  fecha?: string;
  lugar?: string;
  activo?: boolean;
  estado?: string;
  status?: string;
  contratado?: boolean;
  isContratado?: boolean;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

interface ListEventosOptions {
  onlyContratados?: boolean;
  includeClosed?: boolean;
}

const normalizeStatus = (value?: unknown): string =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const isEventoContratado = (evento: Evento): boolean => {
  if (evento.contratado === true || evento.isContratado === true) return true;
  const normalized = normalizeStatus(evento.estado || evento.status);
  return normalized === "contratado";
};

export const listEventos = async (options: ListEventosOptions = {}): Promise<Evento[]> => {
  const { onlyContratados = false, includeClosed = false } = options;
  const params = new URLSearchParams();

  if (onlyContratados) {
    params.set("soloContratados", "true");
  }

  if (includeClosed) {
    params.set("incluirCerrados", "true");
  }

  const queryString = params.toString();
  const response = await api.get(queryString ? `/eventos?${queryString}` : "/eventos");
  const raw = response?.data;

  const source = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
      ? raw.data
      : Array.isArray(raw?.eventos)
        ? raw.eventos
        : Array.isArray(raw?.items)
          ? raw.items
          : [];

  const normalized = source
    .filter((evento: any) => evento && typeof evento === "object")
    .map((evento: any) => ({
      ...evento,
      _id: evento._id || evento.id,
      id: evento.id || evento._id,
      nombre: evento.nombre || evento.titulo || evento.evento || "Sin nombre",
      fecha: evento.fecha || evento.fechaEvento,
      activo: typeof evento.activo === "boolean" ? evento.activo : true,
    }))
    .filter((evento: Evento) => Boolean(evento._id));

  const activos = normalized.filter((evento) => evento.activo !== false);

  if (!onlyContratados) {
    return activos;
  }

  const contratados = activos.filter(isEventoContratado);
  if (contratados.length > 0) {
    return contratados;
  }

  const hasExplicitContractStatus = activos.some((evento) => {
    const normalized = normalizeStatus(evento.estado || evento.status);
    return (
      typeof evento.contratado === "boolean" ||
      typeof evento.isContratado === "boolean" ||
      normalized.length > 0
    );
  });

  if (!hasExplicitContractStatus) {
    return activos;
  }

  return [];
};

export const getEvento = async (id: string): Promise<Evento> => {
  const response = await api.get(`/eventos/${id}`);
  return response.data;
};

export const createEvento = async (payload: any): Promise<Evento> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.post("/eventos", data);
  return response.data;
};

export const updateEvento = async (id: string, payload: any): Promise<Evento> => {
  const { _id, empresaId, createdAt, updatedAt, ...data } = payload || {};
  const response = await api.put(`/eventos/${id}`, data);
  return response.data;
};

export const deleteEvento = async (id: string): Promise<void> => {
  await api.delete(`/eventos/${id}`);
};
