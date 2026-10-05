import { api } from "../lib/api";

export const getDashboardKPIs = async (mes?: number, año?: number) => {
  const params = mes != null && año != null ? { mes, año } : undefined;
  const response = await api.get("/kpis/dashboard", params ? { params } : undefined);
  return response.data;
};
