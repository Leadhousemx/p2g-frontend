import { useState, useEffect } from "react";

export type Salon = { id: string; nombre: string };

const MOCK_SALONES: Salon[] = [
  { id: "1", nombre: "Salón Real" },
  { id: "2", nombre: "Jardín Encantado" },
  { id: "3", nombre: "Terraza Azul" },
  { id: "4", nombre: "Salón Imperial" },
  { id: "5", nombre: "Salón Fiesta" },
  { id: "6", nombre: "Salón Dorado" },
  { id: "7", nombre: "Jardín Primavera" },
  { id: "8", nombre: "Salón Colonial" },
  { id: "9", nombre: "Salón Diamante" },
  { id: "10", nombre: "Salón Esmeralda" },
  { id: "11", nombre: "Salón Rubí" },
];

export function useSalones() {
  const [data, setData] = useState<Salon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    setLoading(true);
    // TODO: api.get("/salones", { params: { search, page, pageSize } })
    let filtered = MOCK_SALONES.filter(s =>
      s.nombre.toLowerCase().includes(search.toLowerCase())
    );
    setTotal(filtered.length);
    setData(filtered.slice((page - 1) * pageSize, page * pageSize));
    setLoading(false);
  }, [search, page]);

  const remove = async (id: string) => {
    // TODO: await api.delete(`/salones/${id}`)
    const idx = MOCK_SALONES.findIndex(s => s.id === id);
    if (idx !== -1) {
      MOCK_SALONES.splice(idx, 1);
      setData(d => d.filter(s => s.id !== id));
      setTotal(t => t - 1);
    }
  };

  return {
    data,
    total,
    loading,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    remove,
  };
}
