import { useEffect, useState } from "react";

export type ProveedorLite = {
  id: string;
  nombre: string;
};

const MOCK_PROVEEDORES: ProveedorLite[] = [
  { id: "prov-1", nombre: "Proveedor Uno" },
  { id: "prov-2", nombre: "Proveedor Dos" },
  { id: "prov-3", nombre: "Proveedor Tres" },
  { id: "prov-4", nombre: "Proveedor Cuatro" },
  { id: "prov-5", nombre: "Proveedor Cinco" },
];

export function useProveedoresLite(search: string = "") {
  const [proveedores, setProveedores] = useState<ProveedorLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      if (search) {
        setProveedores(
          MOCK_PROVEEDORES.filter(p => p.nombre.toLowerCase().includes(search.toLowerCase()))
        );
      } else {
        setProveedores(MOCK_PROVEEDORES);
      }
      setLoading(false);
    }, 300);
  }, [search]);

  return { proveedores, loading };
}
