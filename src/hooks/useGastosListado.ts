import { useCallback, useEffect, useState } from "react";
import { deleteCompra } from "../services/comprasService";
import { listGastos, type GastoListadoModo, type ListGastosParams } from "../services/gastosService";
import {
  deleteGastoOperativo,
} from "../services/gastosOperativosService";
import {
  deleteRegistroGastoFijo,
} from "../services/registrosGastosFijosService";
import { logger } from "../lib/logger";
import type { GastoListadoItem } from "../types/gastosListado";
import { mapApiGastoToListadoItem } from "../utils/gastosListadoMappers";

export interface GastosListadoFilters {
  tipoRegistro?: GastoListadoModo;
  q?: string;
  folio?: string;
  proveedorId?: string;
  metodoPago?: string;
  fechaInicio?: string;
  fechaFin?: string;
  minTotal?: number;
  maxTotal?: number;
  page?: number;
  pageSize?: number;
  sortBy?: ListGastosParams["sortBy"];
  sortOrder?: "asc" | "desc";
}

function normalizeText(value?: string) {
  const trimmed = String(value || "").trim();
  return trimmed || undefined;
}

function normalizeNumber(value?: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function useGastosListado(filters?: GastosListadoFilters) {
  const [gastos, setGastos] = useState<GastoListadoItem[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(10);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (newFilters?: GastosListadoFilters) => {
    const activeFilters = newFilters || filters || {};
    const tipoRegistro = activeFilters.tipoRegistro || "todos";
    const page = Math.max(1, Number(activeFilters.page || 1));
    const pageSize = Math.max(1, Number(activeFilters.pageSize || 10));
    const sortBy = activeFilters.sortBy || "fecha";
    const sortOrder = activeFilters.sortOrder || "desc";
    const proveedorId = tipoRegistro === "todos" ? normalizeText(activeFilters.proveedorId) : undefined;

    setLoading(true);
    setError(null);

    try {
      const response = await listGastos({
        page,
        pageSize,
        tipoRegistro,
        q: normalizeText(activeFilters.q),
        folio: normalizeText(activeFilters.folio),
        proveedorId,
        metodoPago: normalizeText(activeFilters.metodoPago),
        fechaInicio: normalizeText(activeFilters.fechaInicio),
        fechaFin: normalizeText(activeFilters.fechaFin),
        minTotal: normalizeNumber(activeFilters.minTotal),
        maxTotal: normalizeNumber(activeFilters.maxTotal),
        sortBy,
        sortOrder,
      });

      setGastos((response.items || []).map(mapApiGastoToListadoItem));
      setTotal(response.total);
      setTotalPages(response.totalPages);
      setCurrentPage(response.page);
      setCurrentPageSize(response.pageSize);
      setHasNextPage(response.hasNextPage);
      setHasPrevPage(response.hasPrevPage);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cargar gastos";
      setError(message);
      logger.error("Error loading gastos list:", err);
      setGastos([]);
      setTotal(0);
      setTotalPages(0);
      setCurrentPage(page);
      setCurrentPageSize(pageSize);
      setHasNextPage(false);
      setHasPrevPage(page > 1);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const removeCompra = useCallback(async (id: string) => {
    try {
      await deleteCompra(id);
      await list();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar compra";
      setError(message);
      logger.error("Error deleting compra from gastos list:", err);
      return false;
    }
  }, [list]);

  const removeGastoOperativo = useCallback(async (id: string) => {
    try {
      await deleteGastoOperativo(id);
      await list();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar gasto operativo";
      setError(message);
      logger.error("Error deleting gasto operativo from aggregated list:", err);
      return false;
    }
  }, [list]);

  const removeRegistroGastoFijo = useCallback(async (id: string) => {
    try {
      await deleteRegistroGastoFijo(id);
      await list();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar registro de gasto fijo";
      setError(message);
      logger.error("Error deleting registro gasto fijo from aggregated list:", err);
      return false;
    }
  }, [list]);

  useEffect(() => {
    void list();
  }, [list]);

  return {
    gastos,
    total,
    totalPages,
    currentPage,
    currentPageSize,
    hasNextPage,
    hasPrevPage,
    loading,
    error,
    list,
    removeCompra,
    removeGastoOperativo,
    removeRegistroGastoFijo,
  };
}