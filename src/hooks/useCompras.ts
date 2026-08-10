import { useEffect, useState, useCallback } from "react";
import { listCompras as fetchCompras, deleteCompra, Compra } from "../services/comprasService";
import { logger } from "../lib/logger";
export type ComprasFilters = {
  desde?: string;
  hasta?: string;
  proveedorId?: string;
  tipoCompra?: "general" | "evento";
  eventoId?: string;
  page?: number;
  pageSize?: number;
};

export function useCompras(filters?: ComprasFilters) {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (newFilters?: ComprasFilters) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCompras(newFilters || filters);
      setCompras(response.compras || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar compras";
      setError(message);
      logger.error("Error loading compras:", err);
      setCompras([]);
      setTotal(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const remove = useCallback(async (id: string) => {
    try {
      await deleteCompra(id);
      setCompras((prev) => prev.filter((c) => c._id !== id));
      setTotal((prev) => prev - 1);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar compra";
      setError(message);
      logger.error("Error deleting compra:", err);
      return false;
    }
  }, []);

  useEffect(() => {
    list();
  }, [list]);

  return {
    compras,
    total,
    totalPages,
    loading,
    error,
    list,
    remove,
  };
}
