import { useState, useCallback } from "react";
import { Configuracion, getConfig, updateConfig } from "../services/configService";

export const useConfiguracion = () => {
  const [config, setConfig] = useState<Configuracion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setErrorCode(null);
    try {
      const data = await getConfig();
      setConfig(data);
      return data;
    } catch (err: any) {
      const message = err?.response?.data?.message || "Error al cargar configuración";
      const status = Number(err?.response?.status || 0) || null;
      const code = err?.response?.data?.error?.code || err?.response?.data?.code || null;
      setError(message);
      setErrorStatus(status);
      setErrorCode(code);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (payload: any) => {
    setLoading(true);
    setError(null);
    setErrorStatus(null);
    setErrorCode(null);
    try {
      const updated = await updateConfig(payload);
      setConfig(updated);
      return updated;
    } catch (err: any) {
      const message = err?.response?.data?.message || "Error al actualizar configuración";
      const status = Number(err?.response?.status || 0) || null;
      const code = err?.response?.data?.error?.code || err?.response?.data?.code || null;
      setError(message);
      setErrorStatus(status);
      setErrorCode(code);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    config,
    loading,
    error,
    errorStatus,
    errorCode,
    load,
    update,
  };
};
