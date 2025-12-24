import { useEffect, useState } from "react";

export type Categoria = { id: string; nombre: string; descripcion?: string };
export type Proveedor = { id: string; nombre: string; rfc?: string; telefono?: string; email?: string };
export type GastoFijo = { id: string; nombre: string };
export type Evento = { id: string; folio: string; nombreCliente: string; salon: string; hora: string };

export function useCatalogosGastos() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [gastosFijos, setGastosFijos] = useState<GastoFijo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simula fetch
    setTimeout(() => {
      setCategorias([
        { id: "1", nombre: "Renta salón" },
        { id: "2", nombre: "Banquete" },
        { id: "3", nombre: "Decoración" },
      ]);
      setProveedores([
        { id: "1", nombre: "Proveedor A" },
        { id: "2", nombre: "Proveedor B" },
      ]);
      setGastosFijos([
        { id: "1", nombre: "Renta mensual" },
        { id: "2", nombre: "Luz" },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  // Métodos para crear
  const crearCategoria = async (nombre: string, descripcion?: string) => {
    const nueva = { id: String(Date.now()), nombre, descripcion };
    setCategorias((prev) => [...prev, nueva]);
    return nueva;
  };
  const crearProveedor = async (nombre: string, rfc?: string, telefono?: string, email?: string) => {
    const nuevo = { id: String(Date.now()), nombre, rfc, telefono, email };
    setProveedores((prev) => [...prev, nuevo]);
    return nuevo;
  };

  return { categorias, proveedores, gastosFijos, loading, crearCategoria, crearProveedor };
}
