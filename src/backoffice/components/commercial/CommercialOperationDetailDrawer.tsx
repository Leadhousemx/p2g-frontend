import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  X, ExternalLink, PlusCircle, CheckCircle2, Link2, Bell, Ban, Activity,
  type LucideIcon,
} from 'lucide-react';
import {
  getCommercialOperationsCompany,
  type CommercialOperationsCompanyDetail,
} from '../../services/backofficeApi';
import { CommercialOperationStatusBadge, AccessAllowedBadge } from './CommercialOperationStatusBadge';
import { PaymentOrderStatusBadge, formatProvider } from '../PaymentOrderStatusBadge';
import { fmtDate, fmtRelative } from '../../utils/formatBackofficeDate';
import { formatCurrency } from '../../utils/formatCurrency';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDays(days: number | null | undefined): string {
  if (days == null) return '—';
  if (days < 0) return 'Vencido';
  if (days === 0) return 'Vence hoy';
  return `${days} día${days !== 1 ? 's' : ''}`;
}

function daysClass(days: number | null | undefined): string {
  if (days == null) return 'text-gray-400';
  if (days <= 0) return 'text-red-600 font-semibold';
  if (days <= 7) return 'text-amber-600 font-semibold';
  return 'text-gray-700';
}

// ── Recommended action config ────────────────────────────────────────────────

interface ActionConfig { label: string; description: string; iconColor: string; icon: LucideIcon }

const ACTION_CFG: Record<string, ActionConfig> = {
  create_payment_order:   { label: 'Crear orden de renovación',   description: 'Generar una nueva orden de pago para renovar el plan.',            iconColor: 'text-sky-600 bg-sky-50',      icon: PlusCircle    },
  apply_paid_order:       { label: 'Aplicar pago pendiente',      description: 'Hay un pago registrado que aún no fue aplicado al periodo comercial.', iconColor: 'text-green-600 bg-green-50',  icon: CheckCircle2  },
  share_checkout_link:    { label: 'Compartir link de pago',      description: 'Existe un checkout generado que puede enviarse al cliente.',          iconColor: 'text-violet-600 bg-violet-50', icon: Link2         },
  create_checkout:        { label: 'Generar checkout',             description: 'Crear un link de pago para que el cliente pueda proceder.',           iconColor: 'text-amber-600 bg-amber-50',  icon: ExternalLink  },
  remind_customer_manual: { label: 'Recordar al cliente',         description: 'Contactar manualmente al cliente para gestionar la renovación.',       iconColor: 'text-slate-600 bg-slate-50',  icon: Bell          },
  suspend_company:        { label: 'Suspender empresa',           description: 'El plan vencido sin renovación. Considera suspender el acceso.',       iconColor: 'text-red-600 bg-red-50',      icon: Ban           },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">{children}</h3>
  );
}

function Field({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="w-36 shrink-0 text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="min-w-0 text-sm text-gray-800">{value ?? <span className="text-gray-300">—</span>}</span>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  empresaId: string | null;
  onClose: () => void;
}

export default function CommercialOperationDetailDrawer({ empresaId, onClose }: Props) {
  const [detail, setDetail] = useState<CommercialOperationsCompanyDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const load = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    setDetail(null);
    try {
      const res = await getCommercialOperationsCompany(id);
      setDetail(res);
    } catch (err: unknown) {
      const msg =
        (err as any)?.response?.data?.error?.message ||
        (err as any)?.message ||
        'Error al cargar detalle operativo.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (empresaId) {
      load(empresaId);
    } else {
      setDetail(null);
      setError('');
    }
  }, [empresaId, load]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isOpen = empresaId != null;
  const ca     = detail?.commercialAccess;
  const companyId = detail?.company?.empresaId ?? empresaId ?? '';

  // Group orders
  const orders         = Array.isArray(detail?.orders) ? detail!.orders : [];
  const pendingOrders  = orders.filter((o) => o.status === 'pending');
  const paidUnapplied  = orders.filter((o) => o.status === 'paid' && o.commercialApplicationStatus !== 'applied');
  const appliedOrders  = orders.filter((o) => o.commercialApplicationStatus === 'applied');
  const cancelledOrders = orders.filter((o) => o.status === 'cancelled' || o.status === 'expired' || o.status === 'failed');

  const transactions  = Array.isArray(detail?.transactions)   ? detail!.transactions              : [];
  const auditLogs     = Array.isArray(detail?.auditLogs)       ? detail!.auditLogs.slice(0, 20)   : [];
  const recActions    = Array.isArray(detail?.recommendedActions) ? detail!.recommendedActions    : [];

  const orderGroups = [
    { label: 'Pagos sin aplicar',       list: paidUnapplied,   accentCls: 'border-blue-100 bg-blue-50/50'   },
    { label: 'Pendientes',              list: pendingOrders,   accentCls: 'border-amber-100 bg-amber-50/50' },
    { label: 'Aplicados',               list: appliedOrders,   accentCls: 'border-green-100 bg-green-50/50' },
    { label: 'Cancelados / Expirados',  list: cancelledOrders, accentCls: 'border-gray-100 bg-gray-50'      },
  ].filter((g) => g.list.length > 0);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/25 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Detalle operativo"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-gray-900">
              {detail?.company?.nombre || 'Detalle operativo'}
            </p>
            <p className="truncate text-xs text-gray-400">{detail?.company?.email || ''}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-700 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded-xl bg-gray-100" />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Content */}
          {!loading && !error && detail && (
            <>
              {/* 1. Datos empresa */}
              <section>
                <SectionTitle>Datos empresa</SectionTitle>
                <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <Field label="Nombre"        value={detail.company?.nombre} />
                  <Field label="Email"         value={detail.company?.email} />
                  <Field label="Estado"        value={detail.company?.status} />
                  <Field label="Último acceso" value={detail.company?.lastAccessAt ? fmtRelative(detail.company.lastAccessAt) : '—'} />
                </div>
                <div className="mt-2">
                  <Link
                    to={`/admin/companies/${companyId}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all"
                  >
                    <ExternalLink size={11} />
                    Ver empresa completa
                  </Link>
                </div>
              </section>

              {/* 2. Estado comercial */}
              <section>
                <SectionTitle>Estado comercial</SectionTitle>
                <div className="space-y-2 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex items-center gap-2 pb-1">
                    <CommercialOperationStatusBadge status={ca?.effectiveCommercialStatus} />
                    <AccessAllowedBadge allowed={ca?.commercialAccessAllowed} />
                  </div>
                  <Field label="Plan activo"    value={ca?.currentPlanCode ? <span className="font-mono text-sm">{ca.currentPlanCode}</span> : '—'} />
                  <Field label="Inicio periodo" value={ca?.currentPeriodStart ? fmtDate(ca.currentPeriodStart) : '—'} />
                  <Field label="Fin periodo"    value={ca?.currentPeriodEnd ? fmtDate(ca.currentPeriodEnd) : '—'} />
                  <Field
                    label="Días restantes"
                    value={
                      ca?.commercialDaysRemaining != null
                        ? <span className={daysClass(ca.commercialDaysRemaining)}>{formatDays(ca.commercialDaysRemaining)}</span>
                        : '—'
                    }
                  />
                  <Field label="Fin gracia"    value={ca?.paymentGraceEndDate ? fmtDate(ca.paymentGraceEndDate) : '—'} />
                  <Field
                    label="Días gracia"
                    value={
                      ca?.commercialGraceDaysRemaining != null
                        ? <span className={daysClass(ca.commercialGraceDaysRemaining)}>{formatDays(ca.commercialGraceDaysRemaining)}</span>
                        : '—'
                    }
                  />
                  {ca?.commercialMessage && (
                    <Field label="Mensaje" value={<span className="italic text-gray-500">{ca.commercialMessage}</span>} />
                  )}
                </div>
              </section>

              {/* 3. Acciones recomendadas */}
              {recActions.length > 0 && (
                <section>
                  <SectionTitle>Acciones recomendadas</SectionTitle>
                  <div className="space-y-2">
                    {recActions.map((ra, idx) => {
                      const cfg: ActionConfig = ACTION_CFG[ra.action] ?? {
                        label: ra.label ?? ra.action,
                        description: '',
                        iconColor: 'text-gray-600 bg-gray-50',
                        icon: Activity,
                      };
                      const ActionIcon = cfg.icon;
                      return (
                        <div key={idx} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                          <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.iconColor}`}>
                            <ActionIcon size={14} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800">{ra.label ?? cfg.label}</p>
                            <p className="text-xs text-gray-500">{cfg.description}</p>
                          </div>
                          <Link
                            to={`/admin/companies/${companyId}`}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 transition-all"
                          >
                            <ExternalLink size={10} />
                            Ir
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 4. Órdenes agrupadas */}
              {orders.length > 0 && (
                <section>
                  <SectionTitle>Órdenes de pago ({orders.length})</SectionTitle>
                  <div className="space-y-4">
                    {orderGroups.map((group) => (
                      <div key={group.label}>
                        <p className="mb-1.5 text-xs font-semibold text-gray-500">
                          {group.label} ({group.list.length})
                        </p>
                        <div className="space-y-2">
                          {group.list.map((o) => (
                            <div key={o.id} className={`rounded-xl border px-3 py-2.5 ${group.accentCls}`}>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] text-gray-400">…{String(o.id).slice(-8)}</span>
                                  <PaymentOrderStatusBadge status={o.status} />
                                  {o.commercialApplicationStatus === 'applied' && (
                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                                      Aplicado
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-gray-700">
                                  {formatCurrency(o.chargeAmount, o.chargeCurrency)}
                                </span>
                              </div>
                              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-gray-500">
                                <span>{formatProvider(o.provider)}{o.providerMode ? ` · ${o.providerMode}` : ''}</span>
                                {o.externalReference && <span>Ref: {o.externalReference}</span>}
                                {o.paidAt && <span>Pagado: {fmtDate(o.paidAt)}</span>}
                                {o.commercialAppliedAt && <span>Aplicado: {fmtDate(o.commercialAppliedAt)}</span>}
                                {o.commercialAppliedPeriodEnd && <span>Periodo hasta: {fmtDate(o.commercialAppliedPeriodEnd)}</span>}
                              </div>
                              {o.checkoutUrl && (
                                <p className="mt-1 max-w-full truncate text-[10px] text-sky-500">
                                  Checkout: {o.checkoutUrl}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 5. Transacciones */}
              {transactions.length > 0 && (
                <section>
                  <SectionTitle>Transacciones ({transactions.length})</SectionTitle>
                  <div className="overflow-x-auto rounded-xl border border-gray-100">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100 bg-gray-50">
                          <th className="px-3 py-2 text-left font-semibold text-gray-400">Provider ID</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-400">Estado</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-400">Monto</th>
                          <th className="px-3 py-2 text-left font-semibold text-gray-400">Fecha</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((t, i) => (
                          <tr key={t.id ?? i} className="border-b border-gray-50 last:border-0">
                            <td className="px-3 py-2 font-mono text-gray-500">{t.providerPaymentId || '—'}</td>
                            <td className="px-3 py-2 text-gray-600">{t.providerStatus || '—'}</td>
                            <td className="px-3 py-2 text-gray-700">
                              {t.amount != null && t.currency ? formatCurrency(t.amount, t.currency) : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-400">{t.createdAt ? fmtDate(t.createdAt) : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* 6. Audit logs */}
              {auditLogs.length > 0 && (
                <section>
                  <SectionTitle>Auditoría (últimos {auditLogs.length})</SectionTitle>
                  <div className="space-y-1.5">
                    {auditLogs.map((log, i) => (
                      <div
                        key={i}
                        className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                          log.success
                            ? 'border-green-100 bg-green-50/50'
                            : 'border-red-100 bg-red-50/50'
                        }`}
                      >
                        <span className={`mt-0.5 font-bold ${log.success ? 'text-green-600' : 'text-red-500'}`}>
                          {log.success ? '✓' : '✗'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-700">{log.action}</p>
                          {log.reason && <p className="text-gray-500">{log.reason}</p>}
                          {(log.statusBefore || log.statusAfter) && (
                            <p className="text-gray-400">
                              {log.statusBefore || '—'} → {log.statusAfter || '—'}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-gray-400">
                          {log.createdAt ? fmtDate(log.createdAt) : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
