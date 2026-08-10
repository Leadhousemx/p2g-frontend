import { useState, useEffect, useCallback } from "react";
import {
  listCotizacionesPage,
  deleteCotizacion,
  type Cotizacion,
  type ListCotizacionesPageParams,
} from "../services/cotizacionesService";
import { logger } from "../lib/logger";

interface UseCotizacionesOptions extends ListCotizacionesPageParams {}

export function useCotizaciones({
  page = 1,
  pageSize = 10,
  q,
  estado,
  clienteId,
  negocioId,
  fechaInicio,
  fechaFin,
  sortBy,
  sortOrder,
  folio,
}: UseCotizacionesOptions = {}) {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const fetch = useCallback(async () => {
    const requestedPage = Math.max(1, Number(page) || 1);
    const requestedPageSize = Math.max(1, Number(pageSize) || 10);

    try {
      setLoading(true);
      setError(null);
      const response = await listCotizacionesPage({
        page: requestedPage,
        pageSize: requestedPageSize,
        q,
        estado,
        clienteId,
        negocioId,
        fechaInicio,
        fechaFin,
        sortBy,
        sortOrder,
        folio,
      });
      setCotizaciones(Array.isArray(response?.cotizaciones) ? response.cotizaciones : []);
      setTotal(Math.max(0, Number(response?.total || 0)));
      setTotalPages(Math.max(1, Number(response?.totalPages || 1)));
      setHasNextPage(Boolean(response?.hasNextPage));
      setHasPrevPage(Boolean(response?.hasPrevPage));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading cotizaciones";
      setError(message);
      logger.error("Error loading cotizaciones:", err);
      setCotizaciones([]);
      setTotal(0);
      setTotalPages(1);
      setHasNextPage(false);
      setHasPrevPage(requestedPage > 1);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, q, estado, clienteId, negocioId, fechaInicio, fechaFin, sortBy, sortOrder, folio, reloadKey]);

  const refetch = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = useCallback(
    async (id: string) => {
      try {
        await deleteCotizacion(id);
        setCotizaciones((prev) => prev.filter((c) => c._id !== id));
      } catch (err) {
        logger.error("Error deleting cotizacion:", err);
        throw err;
      }
    },
    []
  );

  return {
    cotizaciones,
    loading,
    error,
    total,
    totalPages,
    page,
    pageSize,
    hasNextPage,
    hasPrevPage,
    refetch,
    remove,
  };
}
