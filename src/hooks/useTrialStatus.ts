import { useState, useEffect, useCallback } from 'react';
import { getTrialStatus, type TrialStatus, type EffectiveStatus } from '../services/trialApi';

export interface UseTrialStatusResult {
  loading: boolean;
  networkError: boolean;
  trialStatus: TrialStatus | null;
  refresh: () => void;
}

const BLOCKED_DEFAULTS: Record<string, { effectiveStatus: EffectiveStatus; message: string }> = {
  TRIAL_EXPIRED: {
    effectiveStatus: 'trial_expired',
    message: 'Tu prueba gratuita ha finalizado. Contacta a Brentrix para reactivar tu cuenta.',
  },
  ACCOUNT_SUSPENDED: {
    effectiveStatus: 'suspended',
    message: 'Tu cuenta está suspendida. Contacta a Brentrix para más información.',
  },
};

export function useTrialStatus(): UseTrialStatusResult {
  const [loading, setLoading] = useState(true);
  const [networkError, setNetworkError] = useState(false);
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNetworkError(false);
    try {
      const data = await getTrialStatus();
      setTrialStatus(data);
    } catch (err: any) {
      const httpStatus = Number(err?.response?.status || 0);
      if (httpStatus === 404) {
        // Endpoint not deployed — legacy company, no restrictions
        setTrialStatus(null);
      } else if (httpStatus === 401) {
        // Session expired — let existing auth machinery handle it
        setTrialStatus(null);
      } else if (!httpStatus) {
        // Network failure — fail open, show retry option
        setNetworkError(true);
      } else {
        // Any other server error — fail open to avoid locking users out
        setTrialStatus(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();

    // Listen for 402/403 trial-block events fired by the axios interceptor
    const handleTrialBlocked = (event: Event) => {
      const ce = event as CustomEvent;
      const code: string = ce.detail?.code || '';
      const defaults = BLOCKED_DEFAULTS[code];
      if (!defaults) return;

      const apiMessage: string =
        ce.detail?.data?.error?.message ||
        ce.detail?.data?.message ||
        '';

      setTrialStatus((prev) => ({
        status: prev?.status ?? 'trial',
        plan: prev?.plan ?? null,
        trialStartDate: prev?.trialStartDate ?? null,
        trialEndDate: prev?.trialEndDate ?? null,
        trialGraceEndDate: prev?.trialGraceEndDate ?? null,
        daysRemaining: null,
        graceDaysRemaining: null,
        effectiveStatus: defaults.effectiveStatus,
        accessAllowed: false,
        message: apiMessage || defaults.message,
      }));
    };

    window.addEventListener('brentrix:trial-blocked', handleTrialBlocked);
    return () => window.removeEventListener('brentrix:trial-blocked', handleTrialBlocked);
  }, [load]);

  return { loading, networkError, trialStatus, refresh: load };
}
