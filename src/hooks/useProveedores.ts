import { useCallback, useEffect, useRef, useState } from "react";

export type Proveedor = {
  id: string;
  nombre: string;
  razonSocial?: string;
  telefono?: string;
  email?: string;
};

const MOCK_PROVEEDORES: Proveedor[] = Array.from({ length: 18 }).map((_, i) => ({
  id: (i + 1).toString(),
  nombre: `Proveedor ${i + 1}`,
  razonSocial: `Razón Social ${i + 1}`,
  telefono: `555-000-${String(i + 1).padStart(2, "0")}`,
  email: `proveedor${i + 1}@correo.com`,
}));

export function useProveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Para simular backend y paginación
  const list = useCallback(async ({ searchNombre = "", page = 1, pageSize = 10 } = {}) => {
    setLoading(true);
    setError(null);
    try {
      // Simula fetch
      await new Promise((res) => setTimeout(res, 600));
      let data = [...MOCK_PROVEEDORES];
      if (searchNombre) {
        data = data.filter((p) => p.nombre.toLowerCase().includes(searchNombre.toLowerCase()));
      }
      setTotal(data.length);
      setProveedores(data.slice((page - 1) * pageSize, page * pageSize));
    } catch (e) {
      setError("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      // Simula DELETE
      await new Promise((res) => setTimeout(res, 500));
      // Aquí iría: await fetch(`/api/proveedores/${id}`, { method: "DELETE" })
      const idx = MOCK_PROVEEDORES.findIndex((p) => p.id === id);
      if (idx !== -1) {
        MOCK_PROVEEDORES.splice(idx, 1);
      }
      // Refresca lista
      await list();
      return true;
    } catch (e) {
      setError("No se pudo eliminar el proveedor");
      return false;
    } finally {
      setLoading(false);
    }
  }, [list]);

  return { proveedores, total, loading, error, list, remove };
}
