import axios, { AxiosInstance } from 'axios';
import {
  clearBackofficeSession,
  getBackofficeToken,
  type BackofficeOwner,
} from './backofficeAuth';

// Same origin resolution pattern as client app
const API_ORIGIN = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'https://api.brentrix.com');

const bo: AxiosInstance = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Server requires double-submit CSRF: csrf_token cookie + X-CSRF-Token header.
// We fetch the token once and cache it; withCredentials=true lets the browser
// store the cookie automatically so subsequent requests include it.
let _csrfToken: string | null = null;
async function ensureBackofficeCsrf(): Promise<void> {
  if (_csrfToken) return;
  try {
    const res = await bo.get<{ csrfToken: string }>('/api/auth/csrf-token');
    _csrfToken = res.data?.csrfToken ?? null;
  } catch {
    // Non-fatal — request will fail with 403 if CSRF is truly required
  }
}

// ── Request: inject Bearer token + CSRF (cookie sent via withCredentials) ──
bo.interceptors.request.use(async (config) => {
  const token = getBackofficeToken();
  if (token) {
    config.headers = config.headers || {};
    (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
  }
  const method = (config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    await ensureBackofficeCsrf();
    if (_csrfToken) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>)['X-CSRF-Token'] = _csrfToken;
    }
  }
  return config;
});

// ── Response: handle 401/403 ────────────────────────────────────────────────
bo.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = Number(error?.response?.status || 0);
    const url: string = error?.config?.url || '';
    // 401 → session expired/invalid — hard redirect, but NOT on the login endpoint itself
    // (login 401 = wrong credentials → let the caller handle it as a regular error)
    if (status === 401 && !url.includes('/auth/login')) {
      clearBackofficeSession();
      window.location.href = '/admin/login';
    }
    return Promise.reject(error);
  },
);

// ── Types ────────────────────────────────────────────────────────────────────
export interface AdminDashboardData {
  companies: {
    total: number;
    active: number;
    trial: number;
    suspended: number;
    activeToday: number;
    activeLast7Days: number;
  };
  users: {
    total: number;
    activeToday: number;
  };
}

export interface AdminCompany {
  id: string;
  name: string;
  rfc: string;
  email: string;
  responsibleName: string;
  createdAt: string;
  lastAccessAt: string | null;
  status: 'active' | 'trial' | 'suspended';
  plan: string;
  trialStartDate: string | null;
  trialEndDate: string | null;
  trialGraceEndDate?: string | null;
  effectiveStatus?: string;
  daysRemaining?: number | null;
  graceDaysRemaining?: number | null;
  accessAllowed?: boolean;
  usersCount: number;
  activeUsersCount: number;
  activityStatus: 'active_today' | 'active_week' | 'inactive';
  // Commercial plan fields (Fase 3.5) — backend may send as effectiveCommercialStatus or commercialEffectiveStatus
  effectiveCommercialStatus?: string | null;
  commercialEffectiveStatus?: string | null;
  commercialAccessAllowed?: boolean | null;
  commercialPlanCode?: string | null;
  commercialPeriodStart?: string | null;
  commercialPeriodEnd?: string | null;
  commercialDaysRemaining?: number | null;
  commercialGraceDaysRemaining?: number | null;
  commercialMessage?: string | null;
  commercialStatusMessage?: string | null;
}

export interface AdminCompaniesResponse {
  data: AdminCompany[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminCompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminCompanyDetail {
  company: {
    id: string;
    name: string;
    rfc: string;
    email: string;
    phone?: string;
    responsibleName: string;
    createdAt: string;
    updatedAt: string;
    lastAccessAt: string | null;
    status: 'active' | 'trial' | 'suspended';
    plan: string;
    trialStartDate: string | null;
    trialEndDate: string | null;
    trialGraceEndDate?: string | null;
    effectiveStatus?: string;
    daysRemaining?: number | null;
    graceDaysRemaining?: number | null;
    accessAllowed?: boolean;
    // Commercial fields at company level (Fase 3.5)
    effectiveCommercialStatus?: string | null;
    commercialEffectiveStatus?: string | null;
    commercialAccessAllowed?: boolean | null;
    commercialDaysRemaining?: number | null;
    commercialGraceDaysRemaining?: number | null;
    commercialMessage?: string | null;
    commercialStatusMessage?: string | null;
  };
  commercial: {
    status: string;
    plan: string;
    trialStartDate: string | null;
    trialEndDate: string | null;
    trialGraceEndDate?: string | null;
    daysSinceCreated: number;
    daysUntilTrialEnds: number | null;
    effectiveStatus?: string;
    daysRemaining?: number | null;
    graceDaysRemaining?: number | null;
    accessAllowed?: boolean;
    message?: string;
    suspendedAt?: string | null;
    suspensionReason?: string | null;
    activatedAt?: string | null;
    activationReason?: string | null;
    trialExtendedAt?: string | null;
    trialExtensionReason?: string | null;
    // Commercial plan period (Fase 3.5) — backend may use effectiveCommercialStatus or commercialEffectiveStatus
    effectiveCommercialStatus?: string | null;
    commercialEffectiveStatus?: string | null;
    commercialAccessAllowed?: boolean | null;
    currentPlanCode?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    commercialDaysRemaining?: number | null;
    commercialGraceDaysRemaining?: number | null;
    commercialMessage?: string | null;
    commercialStatusMessage?: string | null;
    nextPaymentDueAt?: string | null;
    paymentGraceEndDate?: string | null;
  };
  users: AdminCompanyUser[];
  activity: {
    lastAccessAt: string | null;
    activeToday: boolean;
    activeLast7Days: boolean;
  };
  usage: {
    usersCount: number;
    activeUsersCount: number;
  };
}

export interface AdminTrialSummary {
  active: number;        // mapped from activeTrials
  aboutToExpire: number; // mapped from trialsExpiringSoon
  inGrace: number;       // mapped from trialsInGrace
  expired: number;       // mapped from expiredTrials
  suspended: number;     // mapped from suspendedCompanies
  total: number;
}

export interface AdminCompanyActivity {
  lastAccessAt: string | null;
  activeUsersToday: number;
  activeUsersLast7Days: number;
  companyActiveToday: boolean;
  companyActiveLast7Days: boolean;
}

export interface AdminCompaniesParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  plan?: string;
  sort?: string;
}

function extractErrorMessage(error: unknown): string {
  const data = (error as any)?.response?.data;
  return (
    data?.error?.message ||
    data?.message ||
    data?.msg ||
    'Error inesperado'
  );
}

// ── API calls ────────────────────────────────────────────────────────────────

export async function loginOwner(
  email: string,
  password: string,
): Promise<{ accessToken: string; owner: BackofficeOwner }> {
  const res = await bo.post('/api/admin/auth/login', { email, password });
  const { ok, accessToken, owner, error } = res.data;
  // ok may be absent on some backend versions — gate only on accessToken presence
  if (!accessToken || ok === false) {
    throw new Error(error?.message || 'Credenciales inválidas');
  }
  return { accessToken, owner };
}

export async function getAdminDashboard(): Promise<AdminDashboardData> {
  const res = await bo.get('/api/admin/dashboard');
  return res.data;
}

export async function getAdminCompanies(
  params: AdminCompaniesParams = {},
): Promise<AdminCompaniesResponse> {
  const res = await bo.get('/api/admin/companies', { params });
  return res.data;
}

export async function getAdminCompanyById(id: string): Promise<AdminCompanyDetail> {
  const res = await bo.get(`/api/admin/companies/${id}`);
  return res.data;
}

export async function getAdminCompanyUsers(id: string): Promise<{ data: AdminCompanyUser[] }> {
  const res = await bo.get(`/api/admin/companies/${id}/users`);
  return res.data;
}

export async function getAdminCompanyActivity(id: string): Promise<AdminCompanyActivity> {
  const res = await bo.get(`/api/admin/companies/${id}/activity`);
  return res.data;
}

export async function getAdminTrialsSummary(): Promise<AdminTrialSummary> {
  const res = await bo.get('/api/admin/trials/summary');
  // Backend returns { ok, data: { activeTrials, trialsExpiringSoon, trialsInGrace, expiredTrials, suspendedCompanies } }
  // Map to our normalised AdminTrialSummary shape
  const raw = res.data?.data ?? res.data ?? {};
  return {
    active:        raw.active        ?? raw.activeTrials        ?? 0,
    aboutToExpire: raw.aboutToExpire ?? raw.trialsExpiringSoon  ?? 0,
    inGrace:       raw.inGrace       ?? raw.trialsInGrace       ?? 0,
    expired:       raw.expired       ?? raw.expiredTrials       ?? 0,
    suspended:     raw.suspended     ?? raw.suspendedCompanies  ?? 0,
    total:         raw.total         ?? (
      (raw.active ?? raw.activeTrials ?? 0) +
      (raw.aboutToExpire ?? raw.trialsExpiringSoon ?? 0) +
      (raw.inGrace ?? raw.trialsInGrace ?? 0) +
      (raw.expired ?? raw.expiredTrials ?? 0) +
      (raw.suspended ?? raw.suspendedCompanies ?? 0)
    ),
  };
}

export async function extendCompanyTrial(
  id: string,
  payload: { days: number; reason: string },
): Promise<{ ok: boolean; message?: string }> {
  const res = await bo.post(`/api/admin/companies/${id}/trial/extend`, payload);
  return res.data;
}

export async function activateCompany(
  id: string,
  payload: { reason: string },
): Promise<{ ok: boolean; message?: string }> {
  const res = await bo.post(`/api/admin/companies/${id}/activate`, payload);
  return res.data;
}

export async function suspendCompany(
  id: string,
  payload: { reason: string },
): Promise<{ ok: boolean; message?: string }> {
  const res = await bo.post(`/api/admin/companies/${id}/suspend`, payload);
  return res.data;
}

// ── Commercial Plans ─────────────────────────────────────────────────────────

export interface CommercialPlan {
  id?: string;
  _id?: string;
  code: string;
  name: string;
  description?: string;
  baseCurrency?: string;
  basePriceUsd: number;
  paidMonths: number;
  bonusMonths: number;
  serviceMonths: number;
  includedUsers: number;
  includedBusinesses: number;
  extraUserMonthlyPriceUsd: number;
  isActive: boolean;
  isPublic?: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CommercialPlanPayload {
  code?: string;
  name?: string;
  basePriceUsd?: number;
  paidMonths?: number;
  bonusMonths?: number;
  includedUsers?: number;
  includedBusinesses?: number;
  extraUserMonthlyPriceUsd?: number;
  isActive?: boolean;
  sortOrder?: number;
}

// ── Payment Orders ────────────────────────────────────────────────────────────

export type PaymentOrderStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'expired' | 'refunded';
export type PaymentOrderType   = 'first_payment' | 'renewal' | 'manual_payment';
export type PaymentProvider    = 'internal' | 'mercado_pago' | 'mercado_pago_cross_border' | 'manual_usd' | 'future_provider';

export interface PaymentOrder {
  id: string;
  _id?: string;
  companyId: string;
  companyName?: string;
  planId: string;
  planCode?: string;
  planName?: string;
  status: PaymentOrderStatus;
  type: PaymentOrderType;
  provider: PaymentProvider;
  providerMode?: string;
  totalAmountUsd: number;
  chargeCurrency: string;
  chargeAmount: number;
  billingCountry: string;
  exchangeRate?: number;
  exchangeRateProvider?: string;
  activeUsersCount?: number;
  includedUsers?: number;
  extraUsersCount?: number;
  billingEmail?: string;
  reason?: string;
  checkoutUrl?: string | null;
  cancelReason?: string;
  createdAt: string;
  expiresAt?: string;
  updatedAt?: string;
  // Fase 3.3B — Mercado Pago fields
  providerPaymentId?: string | null;
  lastProviderStatus?: string | null;
  lastProviderStatusDetail?: string | null;
  paidAt?: string | null;
  providerPreferenceId?: string | null;
  externalReference?: string | null;
  metadata?: {
    reconciliationSource?: string;
    reconciliationReason?: string;
    reconciledAt?: string;
    [key: string]: unknown;
  };
  // Fase 3.4A — Apply commercial
  commercialApplicationStatus?: 'pending' | 'applied' | string | null;
  commercialAppliedAt?: string | null;
  commercialAppliedReason?: string | null;
  commercialAppliedPeriodStart?: string | null;
  commercialAppliedPeriodEnd?: string | null;
}

export interface CheckoutResult {
  paymentOrderId: string;
  status: string;
  provider: string;
  providerMode: string;
  providerPreferenceId: string;
  checkoutUrl: string;
  initPoint?: string;
  sandboxInitPoint?: string;
  externalReference: string;
}

export interface ReconcilePayload {
  providerPaymentId: string;
  reason: string;
}

export interface ReconcileResult {
  ok: boolean;
  idempotent?: boolean;
  message?: string;
  paymentOrder?: PaymentOrder;
}

export interface ApplyCommercialResult {
  ok: boolean;
  idempotent?: boolean;
  paymentOrderId: string;
  empresaId?: string;
  commercialApplied: boolean;
  currentPlanCode?: string;
  periodStart?: string | null;
  periodEnd?: string | null;
  nextPaymentDueAt?: string | null;
  commercialStatus?: string;
  message?: string;
}

export interface PaymentOrderPreviewInput {
  planId: string;
  type: PaymentOrderType;
  billingCountry: string;
  chargeCurrency: string;
  exchangeRate: number;
  exchangeRateProvider?: string;
  billingEmail?: string;
  reason?: string;
}

export interface PaymentOrderPreview {
  companyId?: string;
  plan?: { id: string; code: string; name: string };
  planCode?: string;
  planName?: string;
  activeUsersCount: number;
  includedUsers: number;
  extraUsersCount: number;
  basePlanAmountUsd: number;
  extraUsersAmountUsd: number;
  totalAmountUsd: number;
  chargeCurrency: string;
  exchangeRate: number;
  chargeAmount: number;
  billingCountry?: string;
  paidMonths?: number;
  bonusMonths?: number;
  serviceMonths?: number;
}

// ── Plan API calls ────────────────────────────────────────────────────────────

export async function getCommercialPlans(): Promise<CommercialPlan[]> {
  const res = await bo.get('/api/admin/commercial/plans');
  const raw = res.data?.data ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function getCommercialPlan(id: string): Promise<CommercialPlan> {
  const res = await bo.get(`/api/admin/commercial/plans/${id}`);
  return res.data?.data ?? res.data;
}

export async function createCommercialPlan(payload: CommercialPlanPayload): Promise<CommercialPlan> {
  const res = await bo.post('/api/admin/commercial/plans', payload);
  return res.data?.data ?? res.data;
}

export async function updateCommercialPlan(id: string, payload: CommercialPlanPayload): Promise<CommercialPlan> {
  const res = await bo.patch(`/api/admin/commercial/plans/${id}`, payload);
  return res.data?.data ?? res.data;
}

export async function disableCommercialPlan(id: string): Promise<{ ok: boolean }> {
  const res = await bo.patch(`/api/admin/commercial/plans/${id}/disable`);
  return res.data;
}

// ── Payment Order API calls ───────────────────────────────────────────────────

export async function getCompanyPaymentOrders(companyId: string): Promise<PaymentOrder[]> {
  const res = await bo.get(`/api/admin/companies/${companyId}/payment-orders`);
  const raw = res.data?.data ?? res.data;
  return Array.isArray(raw) ? raw : [];
}

export async function previewCompanyPaymentOrder(
  companyId: string,
  payload: PaymentOrderPreviewInput,
): Promise<PaymentOrderPreview> {
  const res = await bo.post(`/api/admin/companies/${companyId}/payment-orders/preview`, payload);
  return res.data?.data ?? res.data;
}

export async function createCompanyPaymentOrder(
  companyId: string,
  payload: PaymentOrderPreviewInput,
): Promise<PaymentOrder> {
  const res = await bo.post(`/api/admin/companies/${companyId}/payment-orders`, payload);
  return res.data?.data ?? res.data;
}

export async function getPaymentOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ data: PaymentOrder[]; pagination?: { total: number; page: number; totalPages: number; limit: number } }> {
  const res = await bo.get('/api/admin/payment-orders', { params });
  const raw = res.data?.data ?? res.data;
  if (Array.isArray(raw)) return { data: raw };
  if (Array.isArray(raw?.data)) return { data: raw.data, pagination: raw.pagination };
  return { data: [] };
}

export async function getPaymentOrder(id: string): Promise<PaymentOrder> {
  const res = await bo.get(`/api/admin/payment-orders/${id}`);
  return res.data?.data ?? res.data;
}

export async function cancelPaymentOrder(id: string, reason: string): Promise<{ ok: boolean; message?: string }> {
  const res = await bo.post(`/api/admin/payment-orders/${id}/cancel`, { reason });
  return res.data;
}

export async function createMercadoPagoCheckout(paymentOrderId: string): Promise<CheckoutResult> {
  const res = await bo.post(`/api/admin/payment-orders/${paymentOrderId}/create-checkout`);
  return res.data?.data ?? res.data;
}

export async function reconcilePaymentOrder(
  paymentOrderId: string,
  payload: ReconcilePayload,
): Promise<ReconcileResult> {
  const res = await bo.post(`/api/admin/payment-orders/${paymentOrderId}/reconcile`, payload);
  const raw = res.data;
  return {
    ok: raw?.ok ?? true,
    idempotent: raw?.data?.idempotent ?? raw?.idempotent,
    message: raw?.data?.message ?? raw?.message,
    paymentOrder: raw?.data?.paymentOrder ?? raw?.paymentOrder,
  };
}

export async function applyCommercialPaymentOrder(
  paymentOrderId: string,
  payload: { reason: string },
): Promise<ApplyCommercialResult> {
  const res = await bo.post(`/api/admin/payment-orders/${paymentOrderId}/apply-commercial`, payload);
  const raw = res.data;
  return raw?.data ?? raw;
}

// ── Commercial Operations (Fase 3.6B) ────────────────────────────────────────

export interface CommercialOperationsSummary {
  totalCompanies: number;
  commercialActive: number;
  commercialDueSoon7: number;
  commercialDueSoon15: number;
  commercialDueSoon30: number;
  commercialGrace: number;
  commercialGraceExpiring3: number;
  commercialGraceExpiring7: number;
  commercialExpired: number;
  commercialSuspended: number;
  noCommercialPlan: number;
  trialActive: number;
  trialExpired: number;
  legacyActive: number;
  companiesWithPendingOrders: number;
  companiesWithPaidUnappliedOrders: number;
  companiesWithAppliedOrders: number;
  generatedAt?: string;
}

export interface CommercialOperationsOrderSummary {
  pendingCount: number;
  paidUnappliedCount: number;
  appliedCount: number;
  cancelledCount: number;
  totalCount: number;
}

export interface CommercialOperationsFlags {
  requiresOwnerAction: boolean;
  hasPaidUnapplied: boolean;
  hasPendingCheckout: boolean;
  isGraceExpiring: boolean;
  isExpired: boolean;
  isSuspended: boolean;
}

export interface CommercialOperationsCompanyItem {
  empresaId: string;
  nombre: string;
  email: string;
  status: string;
  commercialStatus: string;
  effectiveCommercialStatus: string;
  commercialAccessAllowed: boolean;
  currentPlanCode: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  paymentGraceEndDate: string | null;
  commercialDaysRemaining: number | null;
  commercialGraceDaysRemaining: number | null;
  commercialMessage: string | null;
  lastPaymentAt: string | null;
  nextPaymentDueAt: string | null;
  lastAccessAt: string | null;
  billingCountry: string | null;
  billingPreferredCurrency: string | null;
  includedUsers: number | null;
  includedBusinesses: number | null;
  extraUsersCount: number | null;
  orders: CommercialOperationsOrderSummary;
  flags: CommercialOperationsFlags;
}

export interface CommercialOperationsCompaniesResponse {
  data: CommercialOperationsCompanyItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CommercialOperationsOrderDetail {
  id: string;
  status: string;
  type: string;
  provider: string;
  providerMode?: string;
  chargeAmount: number;
  chargeCurrency: string;
  totalAmountUsd?: number;
  externalReference?: string | null;
  checkoutUrl?: string | null;
  commercialApplicationStatus?: string | null;
  paidAt?: string | null;
  commercialAppliedAt?: string | null;
  commercialAppliedPeriodStart?: string | null;
  commercialAppliedPeriodEnd?: string | null;
  createdAt: string;
}

export interface CommercialOperationsTransaction {
  id?: string;
  providerPaymentId?: string | null;
  providerStatus?: string | null;
  amount?: number | null;
  currency?: string | null;
  createdAt?: string;
}

export interface CommercialOperationsAuditLog {
  action: string;
  success: boolean;
  reason?: string | null;
  statusBefore?: string | null;
  statusAfter?: string | null;
  createdAt: string;
}

export interface CommercialOperationsRecommendedAction {
  action: string;
  priority?: 'high' | 'medium' | 'low' | string;
  label?: string;
  description?: string;
}

export interface CommercialOperationsCompanyDetail {
  company: {
    empresaId: string;
    nombre: string;
    email: string;
    status: string;
    lastAccessAt: string | null;
  };
  commercialAccess: {
    effectiveCommercialStatus: string;
    commercialAccessAllowed: boolean;
    currentPlanCode: string | null;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    paymentGraceEndDate: string | null;
    commercialDaysRemaining: number | null;
    commercialGraceDaysRemaining: number | null;
    commercialMessage: string | null;
  };
  orders: CommercialOperationsOrderDetail[];
  transactions: CommercialOperationsTransaction[];
  auditLogs: CommercialOperationsAuditLog[];
  recommendedActions: CommercialOperationsRecommendedAction[];
}

export interface CommercialOperationsCompaniesParams {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  signal?: AbortSignal;
}

export async function getCommercialOperationsSummary(): Promise<CommercialOperationsSummary> {
  const res = await bo.get('/api/admin/commercial/operations/summary');
  return res.data?.data ?? res.data;
}

export async function getCommercialOperationsCompanies(
  params: CommercialOperationsCompaniesParams = {},
): Promise<CommercialOperationsCompaniesResponse> {
  const { signal, ...queryParams } = params;
  const res = await bo.get('/api/admin/commercial/operations/companies', { params: queryParams, signal });
  const raw = res.data?.data ?? res.data;
  // Primary shape: { items: [...], pagination: {...} }
  if (Array.isArray(raw?.items)) {
    return {
      data: raw.items,
      pagination: raw.pagination ?? {
        page: 1,
        pageSize: queryParams.pageSize ?? 25,
        total: raw.items.length,
        totalPages: 1,
      },
    };
  }
  // Fallback: raw is a direct array
  if (Array.isArray(raw)) {
    return {
      data: raw,
      pagination: { page: 1, pageSize: queryParams.pageSize ?? 25, total: raw.length, totalPages: 1 },
    };
  }
  // Fallback: { data: [...] } shape
  if (Array.isArray(raw?.data)) return raw as CommercialOperationsCompaniesResponse;
  return { data: [], pagination: { page: 1, pageSize: queryParams.pageSize ?? 25, total: 0, totalPages: 1 } };
}

export async function getCommercialOperationsCompany(
  companyId: string,
): Promise<CommercialOperationsCompanyDetail> {
  const res = await bo.get(`/api/admin/commercial/operations/company/${companyId}`);
  return res.data?.data ?? res.data;
}

export { extractErrorMessage };
