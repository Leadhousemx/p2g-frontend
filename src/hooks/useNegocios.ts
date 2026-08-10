import { useCallback, useEffect, useState } from "react";
import { listNegocios as fetchNegocios, deleteNegocio, Negocio, NegociosFilters } from "../services/negociosService";

export function useNegocios(filters?: NegociosFilters) {
  const [negocios, setNegocios] = useState<Negocio[]>([]);
  const [total, setTotal] = useState(0);
  const [totalActivos, setTotalActivos] = useState(0);
  const [totalInactivos, setTotalInactivos] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = filters?.search;
  const page = filters?.page;
  const limit = filters?.limit;
  const pageSize = filters?.pageSize;
  const activos = filters?.activos;
  const activo = filters?.activo;

  const list = useCallback(async (newFilters?: NegociosFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchNegocios(
        newFilters || {
          ...(search ? { search } : {}),
          ...(page !== undefined ? { page } : {}),
          ...(limit !== undefined ? { limit } : {}),
          ...(pageSize !== undefined ? { pageSize } : {}),
          ...(activos !== undefined ? { activos } : {}),
          ...(activo !== undefined ? { activo } : {}),
        }
      );
      setNegocios(response.negocios || []);
      setTotal(response.total || 0);
      setTotalActivos(response.totalActivos || 0);
      setTotalInactivos(response.totalInactivos || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar negocios");
      setNegocios([]);
      setTotal(0);
      setTotalActivos(0);
      setTotalInactivos(0);
    } finally {
      setLoading(false);
    }
  }, [search, page, limit, pageSize, activos, activo]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteNegocio(id);
      setNegocios((prev) => prev.filter((n) => n._id !== id));
      setTotal((prev) => prev - 1);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar negocio");
      return false;
    }
  }, []);

  useEffect(() => {
    list();
  }, [list]);

  return { negocios, total, totalActivos, totalInactivos, loading, error, list, remove };
}
