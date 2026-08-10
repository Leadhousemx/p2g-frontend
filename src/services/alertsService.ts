import { api } from "../lib/api";

export const getAlerts = async () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const params = timezone ? { timezone } : {};
  const response = await api.get("/alertas", { params });
  return response.data;
};
