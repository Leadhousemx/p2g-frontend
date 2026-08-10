import { useState, useCallback, useEffect } from "react";
import { Pago, PagosFilters, listPagos, deletePago } from "../services/pagosService";

export const usePagos = () => {
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [total, setTotal] = useState(0);
  const [totalFiltrado, setTotalFiltrado] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (filters?: PagosFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listPagos(filters);
      setPagos(data.pagos);
      setTotal(data.total);
      setTotalFiltrado(data.totalFiltrado);
      return data;
    } catch (err: any) {
      const message = err?.response?.data?.message || "Error al cargar pagos";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await deletePago(id);
      // Actualizar estado local
      setPagos((prev) => prev.filter((p) => p._id !== id));
      setTotal((prev) => prev - 1);
      return true;
    } catch (err) {
      setError("Error al eliminar pago");
      return false;
    }
  }, []);

  useEffect(() => {
    list({ page: 1, pageSize: 50, sortBy: "fecha", sortDir: "desc" });
  }, [list]);

  return {
    pagos,
    total,
    totalFiltrado,
    loading,
    error,
    list,
    remove,
  };
};
