import { useCallback, useEffect, useState } from "react";
import { listClientes, Cliente } from "../services/clientesService";
import { logger } from "../lib/logger";

export function useClientes({
  q,
  page = 1,
  pageSize = 10,
  sortBy,
  sortOrder,
}: {
  q?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const refetchClientes = useCallback(() => {
    setReloadKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const requestedPage = Math.max(1, Number(page) || 1);
    const requestedPageSize = Math.max(1, Number(pageSize) || 10);

    setLoading(true);
    setError("");

    listClientes({
      q: q?.trim(),
      page: requestedPage,
      pageSize: requestedPageSize,
      sortBy,
      sortOrder,
    })
      .then((response) => {
        if (isCancelled) {
          return;
        }

        setClientes(Array.isArray(response?.clientes) ? response.clientes : []);
        setTotal(Number(response?.total || 0));
        setTotalPages(Math.max(1, Number(response?.totalPages || 1)));
        setHasNextPage(Boolean(response?.hasNextPage));
        setHasPrevPage(Boolean(response?.hasPrevPage));
        setLoading(false);
      })
      .catch((err) => {
        if (isCancelled) {
          return;
        }

        logger.error("Error loading clientes:", err);
        setError(err?.response?.data?.message || err?.message || "Error al cargar clientes");
        setClientes([]);
        setTotal(0);
        setTotalPages(1);
        setHasNextPage(false);
        setHasPrevPage(requestedPage > 1);
        setLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [page, pageSize, q, reloadKey, sortBy, sortOrder]);

  return {
    clientes,
    loading,
    error,
    total,
    totalPages,
    page,
    pageSize,
    hasNextPage,
    hasPrevPage,
    refetchClientes,
  };
}
