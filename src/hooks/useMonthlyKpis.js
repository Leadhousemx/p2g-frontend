import { useEffect, useRef, useState } from "react";
import { getDashboardKPIs } from "../services/kpisService";
import { createLatestKpisLoader } from "../utils/latestKpisLoader";

// KPIs del mes seleccionado + comparación con el mes actual. La garantía de "gana la última petición"
// vive en createLatestKpisLoader; este hook solo la conecta al ciclo de vida del componente.
export function useMonthlyKpis(periodo) {
  const [state, setState] = useState({ status: "loading", periodo, kpis: null, comparacion: null, acumulado: null, error: null });
  const loaderRef = useRef(null);

  useEffect(() => {
    const loader = createLatestKpisLoader({
      fetchKpis: (p, signal) => getDashboardKPIs(p, { signal }),
      onState: setState,
    });
    loaderRef.current = loader;
    return () => {
      loader.dispose();
      loaderRef.current = null;
    };
  }, []);

  const { mes, año } = periodo;
  useEffect(() => {
    if (loaderRef.current) void loaderRef.current.load({ mes, año });
  }, [mes, año]);

  return state;
}
