import { useCallback, useEffect, useState } from "react";
import { listProveedores as fetchProveedores, listAllProveedores, deleteProveedor } from "../services/proveedoresService";
import type { Proveedor } from "../services/proveedoresService";
import { logger } from "../lib/logger";
export type { Proveedor };
interface UseProveedoresOptions {
  q?: string;
  activo?: boolean;
  formaPago?: "contado" | "credito";
  rfcGenerico?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "updatedAt" | "nombreComercial" | "razonSocial" | "rfc" | "email" | "telefono" | "contactoNombre" | "formaPago" | "activo";
  sortOrder?: "asc" | "desc";
  /** Si es true, carga todos los proveedores sin paginación */
  loadAll?: boolean;
}

export function useProveedores(options: UseProveedoresOptions = {}) {
  const {
    q = "",
    activo,
    formaPago,
    rfcGenerico,
    page = 1,
    pageSize = 10,
    sortBy,
    sortOrder,
    loadAll = false,
  } = options;
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const list = useCallback(async () => {
    const requestedPage = Math.max(1, Number(page) || 1);
    const requestedPageSize = Math.max(1, Number(pageSize) || 10);
    setLoading(true);
    setError(null);
    try {
      let proveedoresData: Proveedor[];

      if (loadAll) {
        // Cargar todos los proveedores sin paginación
        proveedoresData = await listAllProveedores({
          q: q.trim() || undefined,
          activo,
          formaPago,
          rfcGenerico,
          sortBy,
          sortOrder,
        });
        setTotal(proveedoresData.length);
        setTotalPages(1);
        setHasNextPage(false);
        setHasPrevPage(false);
      } else {
        // Comportamiento paginado original
        const response = await fetchProveedores({
          q: q.trim() || undefined,
          activo,
          formaPago,
          rfcGenerico,
          page: requestedPage,
          pageSize: requestedPageSize,
          sortBy,
          sortOrder,
        });
        setTotal(response.total || 0);
        setTotalPages(response.totalPages || 1);
        setHasNextPage(Boolean(response.hasNextPage));
        setHasPrevPage(Boolean(response.hasPrevPage));
        proveedoresData = response.proveedores || [];
      }

      setProveedores(proveedoresData);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al cargar proveedores";
      setError(message);
      logger.error("Error loading proveedores:", e);
      setProveedores([]);
      setTotal(0);
      setTotalPages(1);
      setHasNextPage(false);
      setHasPrevPage(requestedPage > 1);
    } finally {
      setLoading(false);
    }
  }, [q, activo, formaPago, rfcGenerico, page, pageSize, sortBy, sortOrder, reloadKey, loadAll]);

  const refetch = useCallback(() => {
    setReloadKey((current) => current + 1);
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await deleteProveedor(id);
      setProveedores((prev) => prev.filter((p) => p._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));
      return true;
    } catch (e) {
      const message = e instanceof Error ? e.message : "No se pudo eliminar el proveedor";
      setError(message);
      logger.error("Error deleting proveedor:", e);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    list();
  }, [list]);

  return { proveedores, total, totalPages, hasNextPage, hasPrevPage, loading, error, list, refetch, remove };
}
