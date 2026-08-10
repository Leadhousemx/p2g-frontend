import { useCallback, useEffect, useRef, useState } from 'react';
import { getCommercialStatus, type CommercialStatusResponse } from '../services/commercialApi';

const BLOCKED_DEFAULTS: Record<string, Pick<CommercialStatusResponse, 'effectiveStatus' | 'accessAllowed'>> = {
  COMMERCIAL_EXPIRED:   { effectiveStatus: 'commercial_expired',   accessAllowed: false },
  COMMERCIAL_SUSPENDED: { effectiveStatus: 'commercial_suspended', accessAllowed: false },
  ACCOUNT_SUSPENDED:    { effectiveStatus: 'commercial_suspended', accessAllowed: false },
};

export function useCommercialStatus() {
  const [data, setData]               = useState<CommercialStatusResponse | null>(null);
  const [loading, setLoading]         = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const mounted = useRef(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    setNetworkError(false);
    try {
      const res = await getCommercialStatus();
      if (mounted.current) setData(res);
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      if (status === 401 || status === 404) {
        // No commercial plan or session issue — don't block
        if (mounted.current) setData({ effectiveStatus: 'no_commercial_plan', accessAllowed: true });
      } else if (status === 402 || status === 403) {
        const code = String((err as any)?.response?.data?.error?.code || '').trim().toUpperCase();
        const defaults = BLOCKED_DEFAULTS[code] ?? BLOCKED_DEFAULTS['COMMERCIAL_EXPIRED'];
        if (mounted.current) {
          setData((prev) => ({ ...(prev ?? {}), ...defaults }));
        }
      } else {
        // Network or unknown error — don't block access
        if (mounted.current) setNetworkError(true);
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    refetch();
    return () => { mounted.current = false; };
  }, [refetch]);

  // Listen for brentrix:access-blocked from axios interceptor
  useEffect(() => {
    const handler = (e: Event) => {
      const { code, data: eventData } = (e as CustomEvent).detail ?? {};
      const defaults = BLOCKED_DEFAULTS[String(code || '').trim().toUpperCase()];
      if (!defaults) return;
      setData((prev) => ({
        ...(prev ?? {}),
        ...defaults,
        message:
          eventData?.error?.message ??
          eventData?.message ??
          (prev?.message ?? null),
      }));
    };
    window.addEventListener('brentrix:access-blocked', handler);
    return () => window.removeEventListener('brentrix:access-blocked', handler);
  }, []);

  const accessAllowed = data == null ? true : (data.accessAllowed ?? true);

  return { data, loading, networkError, accessAllowed, refetch };
}
