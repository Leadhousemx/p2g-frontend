import { useState, useEffect, useCallback, Fragment } from 'react';
import { Plus, RefreshCw, Loader2, X, Copy, ExternalLink, Check, AlertTriangle } from 'lucide-react';
import {
  getCompanyPaymentOrders,
  cancelPaymentOrder,
  createMercadoPagoCheckout,
  type PaymentOrder,
  extractErrorMessage,
} from '../services/backofficeApi';
import ApplyCommercialPaymentModal from './ApplyCommercialPaymentModal';
import { PaymentOrderStatusBadge, formatProvider, formatOrderType } from './PaymentOrderStatusBadge';
import { formatCurrency, formatUsd } from '../utils/formatCurrency';
import { fmtDate } from '../utils/formatBackofficeDate';
import CreatePaymentOrderModal from './CreatePaymentOrderModal';
import ReconcilePaymentOrderModal from './ReconcilePaymentOrderModal';
import LoadingState from './LoadingState';
import ErrorState from './ErrorState';

interface Props {
  companyId: string;
}

const fieldCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all';

function abbrev(str: string | null | undefined, len = 28): string {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

function hasMpRow(o: PaymentOrder): boolean {
  return !!(
    o.checkoutUrl ||
    o.providerPaymentId ||
    o.lastProviderStatus ||
    o.externalReference ||
    o.metadata?.reconciliationSource
  );
}

function hasCommercialRow(o: PaymentOrder): boolean {
  return o.commercialApplicationStatus === 'applied' && !!(o.commercialAppliedAt || o.commercialAppliedPeriodStart);
}

function periodDaysLeft(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const end = new Date(dateStr);
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function CompanyPaymentOrdersSection({ companyId }: Props) {
  const [orders, setOrders]       = useState<PaymentOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [showModal, setShowModal] = useState(false);

  // Cancel state
  const [cancelId, setCancelId]           = useState<string | null>(null);
  const [cancelReason, setCancelReason]   = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError]     = useState('');

  // Generate checkout state
  const [genId, setGenId]         = useState<string | null>(null);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError]   = useState('');

  // Reconcile state
  const [reconcileId, setReconcileId] = useState<string | null>(null);

  // Apply commercial state
  const [applyId, setApplyId] = useState<string | null>(null);

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getCompanyPaymentOrders(companyId);
      setOrders(data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => { load(); }, [load]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const openCancel = (id: string) => { setCancelId(id); setCancelReason(''); setCancelError(''); };
  const closeCancel = () => { setCancelId(null); setCancelError(''); };

  const confirmCancel = async () => {
    if (!cancelId) return;
    if (!cancelReason.trim()) { setCancelError('La razón no puede estar vacía.'); return; }
    setCancelLoading(true);
    setCancelError('');
    try {
      await cancelPaymentOrder(cancelId, cancelReason.trim());
      closeCancel();
      await load();
    } catch (err) {
      setCancelError(extractErrorMessage(err));
    } finally {
      setCancelLoading(false);
    }
  };

  const confirmGenerateCheckout = async () => {
    if (!genId) return;
    setGenLoading(true);
    setGenError('');
    try {
      await createMercadoPagoCheckout(genId);
      setGenId(null);
      await load();
    } catch (err) {
      setGenError(extractErrorMessage(err));
    } finally {
      setGenLoading(false);
    }
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch { /* silent fail */ }
  };

  // ── Table ────────────────────────────────────────────────────────────────────

  const COLS = ['Fecha', 'Plan', 'Status', 'Tipo', 'Total USD', 'Monto cobrado', 'Expira', 'Provider', 'Acciones'];
  const N = COLS.length;

  return (
    <>
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-violet-600 text-white shadow-sm">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round"
                      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </span>
            <h2 className="text-sm font-bold text-gray-900">Órdenes de pago</h2>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={load}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
              <RefreshCw size={12} />
            </button>
            <button type="button" onClick={() => setShowModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100">
              <Plus size={12} />
              Crear orden
            </button>
          </div>
        </div>

        <div className="px-5 py-4">
          {loading && <LoadingState text="Cargando órdenes..." />}
          {!loading && error && <ErrorState message={error} onRetry={load} />}
          {!loading && !error && orders.length === 0 && (
            <p className="text-sm text-gray-400">Esta empresa no tiene órdenes de pago registradas.</p>
          )}

          {!loading && !error && orders.length > 0 && (
            <div className="overflow-x-auto -mx-5 px-5">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {COLS.map((h) => (
                      <th key={h} className="pb-2 pr-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => {
                    const oid = o.id || (o as any)._id;
                    const canGenCheckout = o.status === 'pending' && !o.checkoutUrl;
                    const canReconcile   = o.provider === 'mercado_pago' && o.status === 'pending';
                    const canCancel      = o.status === 'pending';
                    const canApply       = o.status === 'paid' && o.commercialApplicationStatus !== 'applied';
                    const isApplied      = o.commercialApplicationStatus === 'applied';
                    const mpRow          = hasMpRow(o);
                    const commRow        = hasCommercialRow(o);
                    const hasAnySubRow   = mpRow || commRow;

                    return (
                      <Fragment key={oid}>
                        {/* Main row */}
                        <tr className={`border-b ${hasAnySubRow ? 'border-transparent' : 'border-gray-50 last:border-0'} hover:bg-gray-50/60`}>
                          <td className="py-2.5 pr-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.createdAt, '—')}</td>
                          <td className="py-2.5 pr-3 text-xs font-medium text-gray-700 whitespace-nowrap">
                            {o.planCode || (o.planId ? o.planId.slice(0, 8) + '…' : '—')}
                          </td>
                          <td className="py-2.5 pr-3 whitespace-nowrap"><PaymentOrderStatusBadge status={o.status} /></td>
                          <td className="py-2.5 pr-3 text-xs text-gray-600 whitespace-nowrap">{formatOrderType(o.type)}</td>
                          <td className="py-2.5 pr-3 text-xs font-medium text-gray-800 whitespace-nowrap">{formatUsd(o.totalAmountUsd)}</td>
                          <td className="py-2.5 pr-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(o.chargeAmount, o.chargeCurrency)}</td>
                          <td className="py-2.5 pr-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.expiresAt, '—')}</td>
                          <td className="py-2.5 pr-3 whitespace-nowrap">
                            <span className="text-xs text-gray-500">{formatProvider(o.provider)}</span>
                            {o.providerMode === 'sandbox' && (
                              <span className="ml-1 inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                                SB
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 whitespace-nowrap">
                            <div className="flex flex-col gap-1 items-start">
                              {canGenCheckout && (
                                <button type="button"
                                        onClick={() => { setGenId(oid); setGenError(''); }}
                                        className="text-xs text-indigo-600 hover:underline font-medium">
                                  Generar link MP
                                </button>
                              )}
                              {canReconcile && (
                                <button type="button"
                                        onClick={() => setReconcileId(oid)}
                                        className="text-xs text-violet-600 hover:underline">
                                  Reconciliar
                                </button>
                              )}
                              {canApply && (
                                <button type="button"
                                        onClick={() => setApplyId(oid)}
                                        className="text-xs text-emerald-600 hover:underline font-medium">
                                  Aplicar pago
                                </button>
                              )}
                              {isApplied && (
                                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                  Aplicado
                                </span>
                              )}
                              {canCancel && (
                                <button type="button"
                                        onClick={() => openCancel(oid)}
                                        className="text-xs text-red-600 hover:underline">
                                  Cancelar
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* ── MP detail sub-row ─────────────────────────────────── */}
                        {mpRow && (
                          <tr className={`${commRow ? 'border-b-0' : 'border-b border-gray-50 last:border-0'} bg-indigo-50/30`}>
                            <td colSpan={N} className="pb-2.5 pt-0 px-0">
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 pt-1.5 text-[11px]">

                                {/* Sandbox badge + checkout URL */}
                                {o.checkoutUrl && (
                                  <>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                      Mercado Pago Sandbox
                                    </span>
                                    <span className="font-mono text-gray-500">{abbrev(o.checkoutUrl, 42)}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyToClipboard(o.checkoutUrl!, `${oid}-url`)}
                                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:bg-gray-50 shadow-sm"
                                    >
                                      {copiedKey === `${oid}-url`
                                        ? <><Check size={10} className="text-green-600" />Copiado</>
                                        : <><Copy size={10} />Copiar link</>}
                                    </button>
                                    <a
                                      href={o.checkoutUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100"
                                    >
                                      <ExternalLink size={10} />
                                      Abrir checkout
                                    </a>
                                  </>
                                )}

                                {/* Preference ID */}
                                {o.providerPreferenceId && (
                                  <span className="text-gray-400">
                                    Pref.: <span className="font-mono text-gray-600">{abbrev(o.providerPreferenceId, 22)}</span>
                                  </span>
                                )}

                                {/* External reference */}
                                {o.externalReference && (
                                  <span className="text-gray-400">
                                    Ref.: <span className="font-mono text-gray-600">{o.externalReference}</span>
                                  </span>
                                )}

                                {/* Provider payment ID */}
                                {o.providerPaymentId && (
                                  <span className="text-gray-400">
                                    Payment ID: <span className="font-mono font-medium text-gray-700">{o.providerPaymentId}</span>
                                  </span>
                                )}

                                {/* Last provider status */}
                                {o.lastProviderStatus && (
                                  <span className="text-gray-400">
                                    Status MP: <span className="text-gray-700">{o.lastProviderStatus}</span>
                                    {o.lastProviderStatusDetail && (
                                      <span className="text-gray-400"> ({o.lastProviderStatusDetail})</span>
                                    )}
                                  </span>
                                )}

                                {/* Paid at */}
                                {o.paidAt && (
                                  <span className="text-gray-400">
                                    Pagado: <span className="text-gray-700">{fmtDate(o.paidAt, '—')}</span>
                                  </span>
                                )}

                                {/* Reconciliation badge */}
                                {o.metadata?.reconciliationSource && (
                                  <>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                      Reconciliado manualmente
                                    </span>
                                    <span className="text-gray-500">{o.metadata.reconciliationSource}</span>
                                    {o.metadata.reconciledAt && (
                                      <span className="text-gray-400">{fmtDate(o.metadata.reconciledAt as string, '—')}</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                        {/* ── Commercial applied sub-row ────────────────────── */}
                        {commRow && (() => {
                          const daysLeft = periodDaysLeft(o.commercialAppliedPeriodEnd);
                          const isExpired = daysLeft != null && daysLeft < 0;
                          const isExpiring = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
                          return (
                            <tr className="border-b border-gray-50 last:border-0 bg-emerald-50/20">
                              <td colSpan={N} className="pb-2.5 pt-0 px-0">
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-3 pt-1.5 text-[11px]">
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                    ✓ Aplicado a empresa
                                  </span>
                                  {o.commercialAppliedAt && (
                                    <span className="text-gray-400">
                                      Aplicado: <span className="text-gray-700">{fmtDate(o.commercialAppliedAt, '—')}</span>
                                    </span>
                                  )}
                                  {o.commercialAppliedPeriodStart && (
                                    <span className="text-gray-400">
                                      Periodo: <span className="text-gray-700">{fmtDate(o.commercialAppliedPeriodStart, '—')}</span>
                                      {o.commercialAppliedPeriodEnd && (
                                        <> → <span className={isExpired ? 'font-semibold text-red-600' : isExpiring ? 'font-semibold text-amber-600' : 'text-gray-700'}>
                                          {fmtDate(o.commercialAppliedPeriodEnd, '—')}
                                        </span></>
                                      )}
                                    </span>
                                  )}
                                  {o.commercialAppliedReason && (
                                    <span className="text-gray-400 italic">"{o.commercialAppliedReason}"</span>
                                  )}
                                  {isExpired && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                      <AlertTriangle size={9} />
                                      Periodo vencido
                                    </span>
                                  )}
                                  {isExpiring && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                      <AlertTriangle size={9} />
                                      Vence en {daysLeft === 0 ? 'hoy' : `${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })()}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Generate Checkout Modal ─────────────────────────────────────────── */}
      {genId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Generar link Mercado Pago</h3>
              <button type="button" onClick={() => { setGenId(null); setGenError(''); }}
                      disabled={genLoading} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500">
              Se generará un link de checkout en <strong>Mercado Pago Sandbox</strong>.
              El provider de la orden cambiará a <code className="rounded bg-gray-100 px-1 text-xs">mercado_pago</code>.
            </p>
            {genError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{genError}</p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => { setGenId(null); setGenError(''); }}
                      disabled={genLoading}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                Cancelar
              </button>
              <button type="button" onClick={confirmGenerateCheckout} disabled={genLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {genLoading && <Loader2 size={14} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ────────────────────────────────────────────────────── */}
      {cancelId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
             style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Cancelar orden</h3>
              <button type="button" onClick={closeCancel} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-gray-500">Ingresa la razón. Esta acción no se puede deshacer.</p>
            <textarea rows={3} className={fieldCls} placeholder="Razón de cancelación…"
                      value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
            {cancelError && <p className="text-xs text-red-600">{cancelError}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeCancel}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cerrar
              </button>
              <button type="button" onClick={confirmCancel} disabled={cancelLoading}
                      className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                {cancelLoading && <Loader2 size={14} className="animate-spin" />}
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reconcile Modal ─────────────────────────────────────────────────── */}
      {reconcileId && (
        <ReconcilePaymentOrderModal
          orderId={reconcileId}
          onClose={() => setReconcileId(null)}
          onSuccess={load}
        />
      )}

      {/* ── Apply Commercial Modal ──────────────────────────────────────────── */}
      {applyId && (() => {
        const applyOrder = orders.find((o) => (o.id || (o as any)._id) === applyId);
        return applyOrder ? (
          <ApplyCommercialPaymentModal
            order={applyOrder}
            onClose={() => setApplyId(null)}
            onSuccess={load}
          />
        ) : null;
      })()}

      {/* ── Create Order Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <CreatePaymentOrderModal
          companyId={companyId}
          onClose={() => setShowModal(false)}
          onSuccess={load}
        />
      )}
    </>
  );
}
