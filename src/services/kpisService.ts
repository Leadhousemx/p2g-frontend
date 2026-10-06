import { api } from "../lib/api";

export type KpisPeriodo = { mes: number; año: number };

// Sin periodo: comportamiento histórico (mes actual). Con periodo: ?mes=&año=.
// `signal` permite cancelar la petición cuando el usuario cambia de mes antes de que responda.
export const getDashboardKPIs = async (periodo?: KpisPeriodo | null, options?: { signal?: AbortSignal }) => {
  const params = periodo ? { mes: periodo.mes, año: periodo.año } : undefined;
  const response = await api.get("/kpis/dashboard", { params, signal: options?.signal });
  return response.data;
};
