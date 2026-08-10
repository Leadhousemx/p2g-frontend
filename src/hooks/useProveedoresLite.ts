import { useEffect, useState, useCallback } from "react";
import { listProveedores } from "../services/proveedoresService";
import { logger } from "../lib/logger";

type ProveedorLite = { id: string; nombre: string };

export function useProveedoresLite(search: string = "") {
  const [proveedores, setProveedores] = useState<ProveedorLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await listProveedores({ page: 1, pageSize: 500 });
      const dataArray = Array.isArray(response?.proveedores) ? response.proveedores : [];

      let filtered = dataArray;
      if (search) {
        filtered = filtered.filter((p) =>
          String(p?.nombreComercial || p?.razonSocial || "")
            .toLowerCase()
            .includes(search.toLowerCase())
        );
      }

      setProveedores(
        filtered.map((p) => ({
          id: String(p?._id || ""),
          nombre: String(p?.nombreComercial || p?.razonSocial || ""),
        }))
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading proveedores";
      setError(message);
      logger.error("Error loading proveedores:", err);
      setProveedores([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { proveedores, loading, error };
}
