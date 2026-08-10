import apiClient from '../api/axiosConfig';

export type EffectiveStatus =
  | 'active'
  | 'trial_active'
  | 'trial_warning'
  | 'trial_grace'
  | 'trial_expired'
  | 'suspended';

export interface TrialStatus {
  status: string;
  plan?: string | null;
  trialStartDate?: string | null;
  trialEndDate?: string | null;
  trialGraceEndDate?: string | null;
  trialDays?: number | null;
  trialGraceDays?: number | null;
  daysRemaining?: number | null;
  graceDaysRemaining?: number | null;
  effectiveStatus: EffectiveStatus;
  accessAllowed: boolean;
  message: string;
}

export async function getTrialStatus(): Promise<TrialStatus> {
  const res = await apiClient.get<{ ok: boolean; data: TrialStatus }>('/api/trial/status');
  return res.data.data;
}
