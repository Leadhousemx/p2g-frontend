import { useEffect, useState } from "react";
import type { Gasto } from "../components/gastos/GastosTable";

const MOCK_GASTOS: Gasto[] = Array.from({ length: 28 }).map((_, i) => {
  const fecha = new Date(2025, 7, 1 + (i % 28));
  return {
    id: String(i + 1),
    folio: `G-${1000 + i}`,
    fecha: fecha.toISOString().slice(0, 10),
    concepto: ["Renta salón", "Decoración", "Banquete", "Música", "Fotografía"][i % 5],
    evento: i % 3 === 0 ? `EVT-${200 + i}` : undefined,
    total: 1500 + (i % 7) * 500,
  };
});

export function useGastos({ folio = "", desde = "", hasta = "", page = 1, pageSize = 10, sortBy = "fecha", sortDir = "desc" }) {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(MOCK_GASTOS.reduce((acc, g) => acc + g.total, 0));
  const [totalFiltrado, setTotalFiltrado] = useState(0);

  useEffect(() => {
    setLoading(true);
    let data = [...MOCK_GASTOS];
    if (folio) data = data.filter(g => g.folio.toLowerCase().includes(folio.toLowerCase()));
    if (desde && hasta) data = data.filter(g => g.fecha >= desde && g.fecha <= hasta);
    else if (desde) data = data.filter(g => g.fecha === desde);
    // Orden
    data.sort((a, b) => {
      let vA = a[sortBy as keyof Gasto];
      let vB = b[sortBy as keyof Gasto];
      if (sortBy === "fecha") {
        return sortDir === "asc" ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
      }
      if (sortBy === "folio") {
        return sortDir === "asc" ? String(vA).localeCompare(String(vB)) : String(vB).localeCompare(String(vA));
      }
      return 0;
    });
    setTotalFiltrado(data.reduce((acc, g) => acc + g.total, 0));
    // Paginación
    const start = (page - 1) * pageSize;
    setGastos(data.slice(start, start + pageSize));
    setTimeout(() => setLoading(false), 400); // Simula carga
  }, [folio, desde, hasta, page, pageSize, sortBy, sortDir]);

  // Para eliminar (mock)
  useEffect(() => {
    // @ts-ignore
    window.__removeGasto = (id: string) => {
      const idx = MOCK_GASTOS.findIndex(g => g.id === id);
      if (idx !== -1) {
        MOCK_GASTOS.splice(idx, 1);
      }
      setGastos(g => g.filter(x => x.id !== id));
      setTotal(MOCK_GASTOS.reduce((acc, g) => acc + g.total, 0));
      setTotalFiltrado(MOCK_GASTOS.reduce((acc, g) => acc + g.total, 0));
      return Promise.resolve();
    };
  }, []);

  // TODO: fetch real
  // useEffect(() => {
  //   setLoading(true);
  //   fetch(`/api/gastos?...`)
  //     .then(r => r.json())
  //     .then(data => { setGastos(data.items); setTotal(data.total); setTotalFiltrado(data.totalFiltrado); })
  //     .finally(() => setLoading(false));
  // }, [folio, desde, hasta, page, pageSize, sortBy, sortDir]);

  return { gastos, loading, total, totalFiltrado };
}
