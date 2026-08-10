import { useState, useEffect, useCallback, useRef } from "react";
import { listSalones as fetchSalones, deleteSalon } from "../services/salonesService";
import type { Salon } from "../services/salonesService";
import { logger } from "../lib/logger";

type RefreshAfterMutationOptions = {
  salonId?: string;
  salonName?: string;
  focusInSearch?: boolean;
  retries?: number;
  delayMs?: number;
  preservePreview?: boolean;
};

type MutationPreviewOptions = {
  salon?: Partial<Salon> | null;
  salonName?: string;
  focusInSearch?: boolean;
};

const PREVIEW_TTL_MS = 10000;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function useSalones() {
  const [data, setData] = useState<Salon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [pendingPreview, setPendingPreview] = useState<{ salon: Salon; expiresAt: number } | null>(null);
  const pendingPreviewRef = useRef<{ salon: Salon; expiresAt: number } | null>(null);

  useEffect(() => {
    pendingPreviewRef.current = pendingPreview;
  }, [pendingPreview]);

  const syncPendingPreview = useCallback((preview: { salon: Salon; expiresAt: number } | null) => {
    pendingPreviewRef.current = preview;
    setPendingPreview(preview);
  }, []);

  const applyDataset = useCallback((salonesArray: Salon[], nextSearch: string, nextPage: number) => {
    const filtered = salonesArray.filter((salon) =>
      salon.nombre.toLowerCase().includes(nextSearch.toLowerCase())
    );

    setTotal(filtered.length);
    setData(filtered.slice((nextPage - 1) * pageSize, nextPage * pageSize));
  }, [pageSize]);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const salonesData = await fetchSalones();
      const salonesArray = Array.isArray(salonesData) ? salonesData : [];

      const activePreview = pendingPreviewRef.current;
      if (activePreview) {
        const previewFound = salonesArray.some(
          (salon) => salon._id === activePreview.salon._id || salon.nombre === activePreview.salon.nombre
        );
        const previewStillProtected = Date.now() < activePreview.expiresAt;

        if (!previewFound && previewStillProtected) {
          return;
        }

        syncPendingPreview(null);
      }

      applyDataset(salonesArray, search, page);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error loading salones";
      setError(message);
      logger.error("Error loading salones:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [applyDataset, page, search, syncPendingPreview]);

  const refetch = fetch;

  const applyMutationPreview = useCallback(({
    salon,
    salonName,
    focusInSearch = false,
  }: MutationPreviewOptions = {}) => {
    if (!salon && !salonName) {
      return;
    }

    const previewSalon = salon
      ? ({
          activo: true,
          telefono: "",
          ...salon,
          _id: salon._id || "preview-salon",
          nombre: salon.nombre || salonName || "Salón actualizado",
        } as Salon)
      : null;

    if (focusInSearch && previewSalon?.nombre && previewSalon.nombre !== search) {
      setSearch(previewSalon.nombre);
    }

    if (page !== 1) {
      setPage(1);
    }

    if (!previewSalon) {
      return;
    }

    syncPendingPreview({ salon: previewSalon, expiresAt: Date.now() + PREVIEW_TTL_MS });

    if (focusInSearch) {
      setTotal(1);
      setData([previewSalon]);
      return;
    }

    setData((current) => {
      const withoutPreview = current.filter((item) => item._id !== previewSalon._id);
      return [previewSalon, ...withoutPreview].slice(0, pageSize);
    });
    setTotal((currentTotal) => Math.max(currentTotal, 1));
  }, [page, pageSize, search, syncPendingPreview]);

  const refreshAfterMutation = useCallback(async ({
    salonId,
    salonName,
    focusInSearch = false,
    retries = 10,
    delayMs = 700,
    preservePreview = false,
  }: RefreshAfterMutationOptions = {}) => {
    const nextSearch = focusInSearch && salonName ? salonName : search;
    const nextPage = 1;

    if (focusInSearch && salonName && salonName !== search) {
      setSearch(salonName);
    }
    if (page !== nextPage) {
      setPage(nextPage);
    }

    let attempt = 0;
    let lastDataset: Salon[] = [];

    while (attempt < retries) {
      try {
        setLoading(true);
        setError(null);

        const salonesData = await fetchSalones();
        lastDataset = Array.isArray(salonesData) ? salonesData : [];
        applyDataset(lastDataset, nextSearch, nextPage);

        const found = salonId
          ? lastDataset.some((salon) => salon._id === salonId)
          : salonName
            ? lastDataset.some((salon) => salon.nombre === salonName)
            : true;

        if (found) {
          syncPendingPreview(null);
          applyDataset(lastDataset, nextSearch, nextPage);
          return true;
        }

        if (!preservePreview) {
          applyDataset(lastDataset, nextSearch, nextPage);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Error loading salones";
        setError(message);
        logger.error("Error refreshing salones after mutation:", err);
      } finally {
        setLoading(false);
      }

      attempt += 1;
      if (attempt < retries) {
        await wait(delayMs);
      }
    }

    if (lastDataset.length > 0 && !preservePreview) {
      applyDataset(lastDataset, nextSearch, nextPage);
    }

    return false;
  }, [applyDataset, page, search, syncPendingPreview]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const remove = async (id: string) => {
    try {
      await deleteSalon(id);
      setData(d => d.filter(s => s._id !== id));
      setTotal(t => t - 1);
      return true;
    } catch (err) {
      logger.error("Error deleting salon:", err);
      return false;
    }
  };

  return {
    data,
    total,
    loading,
    error,
    search,
    setSearch,
    page,
    setPage,
    pageSize,
    remove,
    refetch,
    applyMutationPreview,
    refreshAfterMutation,
  };
}
