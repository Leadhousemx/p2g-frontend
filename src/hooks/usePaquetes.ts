import { useEffect, useState, useCallback } from "react";
import { listPaquetes as fetchPaquetes, deletePaquete } from "../services/paquetesService";
import type { Paquete } from "../services/paquetesService";
import { logger } from "../lib/logger";
interface UsePaquetesOptions {
  searchNombre?: string;
  page?: number;
  pageSize?: number;
  activo?: boolean;
}

export function usePaquetes(options: UsePaquetesOptions = {}) {
  const { searchNombre = "", page = 1, pageSize = 10, activo } = options;
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchPaquetes({
        nombre: searchNombre || undefined,
        page,
        pageSize,
        activo,
      });

      setPaquetes(result.paquetes || []);
      setTotal(result.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading paquetes";
      setError(message);
      logger.error("Error loading paquetes:", err);
      setPaquetes([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [searchNombre, page, pageSize, activo]);

  const refetch = fetch;

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await deletePaquete(id);
        setPaquetes((prev) => prev.filter((p) => p._id !== id));
      } catch (err) {
        logger.error("Error deleting paquete:", err);
        throw err;
      }
    },
    []
  );

  return { paquetes, total, loading, error, refetch, remove };
}
