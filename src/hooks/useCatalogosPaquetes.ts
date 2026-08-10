import { useEffect, useState, useCallback } from "react";
import { listCatalogo } from "../services/catalogoService";
import type { CatalogoItem } from "../services/catalogoService";
import { logger } from "../lib/logger";
export function useCatalogosPaquetes() {
  const [platillos, setPlatillos] = useState<CatalogoItem[]>([]);
  const [bebidas, setBebidas] = useState<CatalogoItem[]>([]);
  const [mobiliario, setMobiliario] = useState<CatalogoItem[]>([]);
  const [personal, setPersonal] = useState<CatalogoItem[]>([]);
  const [adicionales, setAdicionales] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [plat, beb, mob, pers, adic] = await Promise.all([
        listCatalogo("platillos"),
        listCatalogo("bebidas"),
        listCatalogo("mobiliario"),
        listCatalogo("personal"),
        listCatalogo("otros"),
      ]);

      setPlatillos(Array.isArray(plat?.items) ? plat.items : []);
      setBebidas(Array.isArray(beb?.items) ? beb.items : []);
      setMobiliario(Array.isArray(mob?.items) ? mob.items : []);
      setPersonal(Array.isArray(pers?.items) ? pers.items : []);
      setAdicionales(Array.isArray(adic?.items) ? adic.items : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading catalogos";
      setError(message);
      logger.error("Error loading catalogos:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refetch = fetch;

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { platillos, bebidas, mobiliario, personal, adicionales, loading, error, refetch };
}
