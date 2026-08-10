import apiClient from '../api/axiosConfig';

export type CommercialEffectiveStatus =
  | 'commercial_active'
  | 'commercial_grace'
  | 'commercial_expired'
  | 'commercial_suspended'
  | 'no_commercial_plan'
  | string;

export interface CommercialStatusResponse {
  effectiveStatus: CommercialEffectiveStatus;
  accessAllowed: boolean;
  planCode?: string | null;
  planName?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  daysRemaining?: number | null;
  nextPaymentDueAt?: string | null;
  message?: string | null;
}

export async function getCommercialStatus(): Promise<CommercialStatusResponse> {
  const res = await apiClient.get<{ ok: boolean; data: CommercialStatusResponse }>('/api/commercial/status');
  return (res.data as any)?.data ?? res.data;
}
