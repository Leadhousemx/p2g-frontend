import { useEffect, useState } from "react";

export type Paquete = {
  id: string;
  nombre: string;
  codigo: string;
  activo: boolean;
};

const MOCK_PAQUETES: Paquete[] = Array.from({ length: 13 }).map((_, i) => ({
  id: String(i + 1),
  nombre: `Paquete ${String.fromCharCode(65 + i)}`,
  codigo: `PKT-${1000 + i}`,
  activo: i % 3 !== 0,
}));

export function usePaquetes({ searchNombre = "", page = 1, pageSize = 10 }) {
  const [paquetes, setPaquetes] = useState<Paquete[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(MOCK_PAQUETES.length);

  useEffect(() => {
    setLoading(true);
    let data = [...MOCK_PAQUETES];
    if (searchNombre) {
      data = data.filter(p => p.nombre.toLowerCase().includes(searchNombre.toLowerCase()));
    }
    setTotal(data.length);
    const start = (page - 1) * pageSize;
    setPaquetes(data.slice(start, start + pageSize));
    setTimeout(() => setLoading(false), 400);
  }, [searchNombre, page, pageSize]);

  // Para eliminar (mock)
  useEffect(() => {
    // @ts-ignore
    window.__removePaquete = (id: string) => {
      const idx = MOCK_PAQUETES.findIndex(p => p.id === id);
      if (idx !== -1) MOCK_PAQUETES.splice(idx, 1);
      setPaquetes(p => p.filter(x => x.id !== id));
      setTotal(MOCK_PAQUETES.length);
      return Promise.resolve();
    };
  }, []);

  // TODO: fetch real
  // useEffect(() => {
  //   setLoading(true);
  //   fetch(`/api/paquetes?...`)
  //     .then(r => r.json())
  //     .then(data => { setPaquetes(data.items); setTotal(data.total); })
  //     .finally(() => setLoading(false));
  // }, [searchNombre, page, pageSize]);

  return { paquetes, total, loading };
}
