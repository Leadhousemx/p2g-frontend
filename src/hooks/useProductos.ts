import { useState, useCallback, useEffect } from "react";
import { Producto, ProductosFilters, listProductos, searchProductos } from "../services/productsService";
import { logger } from "../lib/logger";
export const useProductos = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (filters?: ProductosFilters) => {
    setLoading(true);
    setError(null);
    try {
      const data = await listProductos(filters);
      setProductos(data.productos);
      setTotal(data.total);
      return data;
    } catch (err: any) {
      const message = err?.response?.data?.message || "Error al cargar productos";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const search = useCallback(async (query: string): Promise<Producto[]> => {
    if (!query || query.length < 1) {
      return [];
    }
    try {
      return await searchProductos(query);
    } catch (err) {
      logger.error("Error searching products:", err);
      return [];
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await fetch(`/api/productos/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      // Update local state by filtering out deleted producto
      setProductos((prev) => prev.filter((p) => p._id !== id));
      setTotal((prev) => prev - 1);
      return true;
    } catch (err) {
      setError("Error al eliminar producto");
      return false;
    }
  }, []);

  useEffect(() => {
    list({ page: 1, limit: 10, activos: true });
  }, [list]);

  return {
    productos,
    total,
    loading,
    error,
    list,
    search,
    remove,
  };
};
