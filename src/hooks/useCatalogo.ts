import { useEffect, useState, useCallback } from "react";
import { listCatalogo, deleteCatalogoItem, CatalogoTipo, CatalogoItem } from "../services/catalogoService";
import { logger } from "../lib/logger";
interface UseCatalogoOptions {
  tipo: CatalogoTipo;
  q?: string;
  activo?: boolean;
  minPrecio?: number;
  maxPrecio?: number;
  page?: number;
  pageSize?: number;
  sortBy?: "nombre" | "precio" | "activo" | "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
}

export function useCatalogo(options: UseCatalogoOptions) {
  const {
    tipo,
    q = "",
    activo,
    minPrecio,
    maxPrecio,
    page = 1,
    pageSize = 50,
    sortBy,
    sortOrder,
  } = options;

  const [items, setItems] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await listCatalogo(tipo, {
        q: q || undefined,
        page,
        pageSize,
        activo,
        minPrecio,
        maxPrecio,
        sortBy,
        sortOrder,
      });

      setItems(result.items || []);
      setTotal(result.total || 0);
      setTotalPages(result.totalPages || 1);
      setHasNextPage(Boolean(result.hasNextPage));
      setHasPrevPage(Boolean(result.hasPrevPage));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading catálogo";
      setError(message);
      logger.error("Error loading catálogo:", err);
      setItems([]);
      setTotal(0);
      setTotalPages(1);
      setHasNextPage(false);
      setHasPrevPage(page > 1);
    } finally {
      setLoading(false);
    }
  }, [tipo, q, page, pageSize, activo, minPrecio, maxPrecio, sortBy, sortOrder]);

  const refetch = fetch;

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteCatalogoItem(tipo, id);
        setItems((prev) => prev.filter((item) => item._id !== id));
      } catch (err) {
        logger.error("Error deleting catálogo item:", err);
        throw err;
      }
    },
    [tipo]
  );

  return { items, total, totalPages, hasNextPage, hasPrevPage, loading, error, refetch, remove };
}
