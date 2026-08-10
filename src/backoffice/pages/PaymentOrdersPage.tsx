import { useEffect, useState, useCallback, useMemo, Fragment } from 'react';
import { RefreshCw, Loader2, X, Copy, ExternalLink, Check, AlertTriangle } from 'lucide-react';
import {
  getPaymentOrders,
  cancelPaymentOrder,
  createMercadoPagoCheckout,
  type PaymentOrder,
  type PaymentOrderStatus,
  extractErrorMessage,
} from '../services/backofficeApi';
import { PaymentOrderStatusBadge, formatProvider, formatOrderType } from '../components/PaymentOrderStatusBadge';
import { formatCurrency, formatUsd } from '../utils/formatCurrency';
import { fmtDate } from '../utils/formatBackofficeDate';
import ReconcilePaymentOrderModal from '../components/ReconcilePaymentOrderModal';
import ApplyCommercialPaymentModal from '../components/ApplyCommercialPaymentModal';
import LoadingState from '../components/LoadingState';
import ErrorState from '../components/ErrorState';

const STATUS_FILTER_OPTIONS = [
  { value: '',          label: 'Todos los estados' },
  { value: 'pending',   label: 'Pendiente'          },
  { value: 'paid',      label: 'Pagada'             },
  { value: 'failed',    label: 'Fallida'            },
  { value: 'cancelled', label: 'Cancelada'          },
  { value: 'expired',   label: 'Expirada'           },
  { value: 'refunded',  label: 'Reembolsada'        },
];

function inputCls(extra = '') {
  return `rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all ${extra}`;
}

const fieldCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all';

const HEADERS = [
  'Empresa', 'Plan', 'Status', 'Tipo', 'Total USD', 'Monto cobrado',
  'País', 'Creado', 'Expira', 'Provider', 'Acciones',
];
const N = HEADERS.length;

function abbrev(str: string | null | undefined, len = 36): string {
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

export default function PaymentOrdersPage() {
  const [orders, setOrders]       = useState<PaymentOrder[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Cancel state
  const [cancelId, setCancelId]           = useState<string | null>(null);
  const [cancelReason, setCancelReason]   = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError]     = useState('');
  const [cancelMsg, setCancelMsg]         = useState('');

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
      const res = await getPaymentOrders();
      setOrders(res.data);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => statusFilter ? orders.filter((o) => o.status === statusFilter as PaymentOrderStatus) : orders,
    [orders, statusFilter],
  );

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
      setCancelMsg('Orden cancelada correctamente.');
      setTimeout(() => setCancelMsg(''), 3000);
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
    } catch { /* silent */ }
  };

  return (
    <div className="p-6 md:p-8 max-w-[1500px] mx-auto">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Órdenes de pago</h1>
          <p className="mt-1 text-sm text-gray-400">
            {orders.length > 0
              ? `${filtered.length} de ${orders.length} orden${orders.length !== 1 ? 'es' : ''}`
              : 'Historial global de órdenes'}
          </p>
        </div>
        <button type="button" onClick={load}
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 shadow-sm">
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* Status filter */}
      <div className="mb-5 flex items-center gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputCls()}>
          {STATUS_FILTER_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        {statusFilter && (
          <button type="button" onClick={() => setStatusFilter('')}
                  className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
            <X size={12} /> Limpiar filtro
          </button>
        )}
      </div>

      {cancelMsg && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {cancelMsg}
        </div>
      )}

      {loading && <LoadingState text="Cargando órdenes..." />}
      {!loading && error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-center">
          <p className="text-sm font-medium text-gray-500">
            {statusFilter ? 'Sin órdenes con ese estado.' : 'Sin órdenes de pago registradas.'}
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
          <table className="w-full min-w-[1200px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {HEADERS.map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-400 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
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
                    <tr className={`${hasAnySubRow ? 'border-b-0' : 'border-b border-gray-50 last:border-0'} hover:bg-gray-50/60 transition-colors`}>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {o.companyName || <span className="font-mono text-gray-400">{o.companyId.slice(0, 10)}…</span>}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                        {o.planCode || (o.planId ? o.planId.slice(0, 8) + '…' : '—')}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap"><PaymentOrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatOrderType(o.type)}</td>
                      <td className="px-4 py-3 text-xs font-medium text-gray-800 whitespace-nowrap">{formatUsd(o.totalAmountUsd)}</td>
                      <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{formatCurrency(o.chargeAmount, o.chargeCurrency)}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{o.billingCountry || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(o.createdAt, '—')}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(o.expiresAt, '—')}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-500">{formatProvider(o.provider)}</span>
                        {o.providerMode === 'sandbox' && (
                          <span className="ml-1 inline-flex items-center rounded-full bg-orange-50 border border-orange-200 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                            SB
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
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
                                    className="text-xs text-red-500 hover:underline">
                              Cancelar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── MP detail sub-row ────────────────────────────────── */}
                    {mpRow && (
                      <tr className={`${commRow ? 'border-b-0' : 'border-b border-gray-50 last:border-0'} bg-indigo-50/20`}>
                        <td colSpan={N} className="pb-3 pt-0 px-4">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-indigo-100 pt-2 text-[11px]">

                            {o.checkoutUrl && (
                              <>
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">
                                  Mercado Pago Sandbox
                                </span>
                                <span className="font-mono text-gray-500">{abbrev(o.checkoutUrl, 48)}</span>
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

                            {o.providerPreferenceId && (
                              <span className="text-gray-400">
                                Pref.: <span className="font-mono text-gray-600">{abbrev(o.providerPreferenceId, 24)}</span>
                              </span>
                            )}

                            {o.externalReference && (
                              <span className="text-gray-400">
                                Ref.: <span className="font-mono text-gray-600">{o.externalReference}</span>
                              </span>
                            )}

                            {o.providerPaymentId && (
                              <span className="text-gray-400">
                                Payment ID: <span className="font-mono font-medium text-gray-700">{o.providerPaymentId}</span>
                              </span>
                            )}

                            {o.lastProviderStatus && (
                              <span className="text-gray-400">
                                Status MP: <span className="text-gray-700">{o.lastProviderStatus}</span>
                                {o.lastProviderStatusDetail && (
                                  <span className="text-gray-400"> ({o.lastProviderStatusDetail})</span>
                                )}
                              </span>
                            )}

                            {o.paidAt && (
                              <span className="text-gray-400">
                                Pagado: <span className="text-gray-700">{fmtDate(o.paidAt, '—')}</span>
                              </span>
                            )}

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
                    {/* ── Commercial applied sub-row ───────────────────────── */}
                    {commRow && (() => {
                      const daysLeft = periodDaysLeft(o.commercialAppliedPeriodEnd);
                      const isExpired  = daysLeft != null && daysLeft < 0;
                      const isExpiring = daysLeft != null && daysLeft >= 0 && daysLeft <= 7;
                      return (
                      <tr className="border-b border-gray-50 last:border-0 bg-emerald-50/20">
                        <td colSpan={N} className="pb-3 pt-0 px-4">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-emerald-100 pt-2 text-[11px]">
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
                              <span className="text-gray-400 italic">"{abbrev(o.commercialAppliedReason, 60)}"</span>
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

      {/* ── Generate Checkout Modal ──────────────────────────────────────────── */}
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

      {/* ── Cancel Modal ─────────────────────────────────────────────────────── */}
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

      {/* ── Reconcile Modal ───────────────────────────────────────────────────── */}
      {reconcileId && (
        <ReconcilePaymentOrderModal
          orderId={reconcileId}
          onClose={() => setReconcileId(null)}
          onSuccess={load}
        />
      )}

      {/* ── Apply Commercial Modal ────────────────────────────────────────────── */}
      {applyId && (() => {
        const applyOrder = orders.find((o) => (o.id || (o as any)._id) === applyId);
        return applyOrder ? (
          <ApplyCommercialPaymentModal
            order={applyOrder}
            companyName={applyOrder.companyName}
            onClose={() => setApplyId(null)}
            onSuccess={load}
          />
        ) : null;
      })()}
    </div>
  );
}
