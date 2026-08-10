import { api } from "../lib/api";

export const getDashboardKPIs = async () => {
  const response = await api.get("/kpis/dashboard");
  return response.data;
};
