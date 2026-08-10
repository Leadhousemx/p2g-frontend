import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  applyCommercialPaymentOrder,
  type PaymentOrder,
  type ApplyCommercialResult,
  extractErrorMessage,
} from '../services/backofficeApi';
import { fmtDate } from '../utils/formatBackofficeDate';
import { formatCurrency, formatUsd } from '../utils/formatCurrency';

interface Props {
  order: PaymentOrder;
  companyName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const fieldCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 ' +
  'focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all';

function SummaryRow({
  label,
  value,
  mono = false,
  highlight = '',
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={`${mono ? 'font-mono' : ''} text-gray-700 ${highlight}`}>{value}</span>
    </div>
  );
}

export default function ApplyCommercialPaymentModal({
  order,
  companyName,
  onClose,
  onSuccess,
}: Props) {
  const [reason, setReason]     = useState('Aplicación manual de pago confirmado');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState<ApplyCommercialResult | null>(null);

  const orderId = order.id || (order as any)._id;

  const validate = (): string => {
    if (!reason.trim()) return 'La razón es requerida.';
    if (reason.trim().length < 5) return 'La razón debe tener al menos 5 caracteres.';
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const res = await applyCommercialPaymentOrder(orderId, { reason: reason.trim() });
      setResult(res);
      onSuccess();
    } catch (e: unknown) {
      const status = (e as any)?.response?.status;
      const code: string = (e as any)?.response?.data?.error?.code || '';
      if (status === 409 && code === 'PAYMENT_ORDER_NOT_PAID') {
        setError('Esta orden todavía no está pagada.');
      } else if (status === 409) {
        setError(extractErrorMessage(e) || 'Conflicto al aplicar la orden.');
      } else if (status === 404) {
        setError(extractErrorMessage(e) || 'Orden o empresa no encontrada.');
      } else if (status === 400) {
        setError(extractErrorMessage(e) || 'La razón es requerida.');
      } else if (status === 403) {
        setError('Error de sesión o seguridad (CSRF). Recarga la página e intenta de nuevo.');
      } else {
        setError(extractErrorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading && !result) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100">
              <svg
                className="h-3.5 w-3.5 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </span>
            <h2 className="text-base font-bold text-gray-900">Aplicar pago a empresa</h2>
          </div>
          {!loading && (
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {result ? (
            /* ── Success state ── */
            <div className="space-y-3 py-2">
              <div className="flex flex-col items-center text-center gap-2">
                <CheckCircle2 size={36} className="text-emerald-500" />
                <p className="text-sm font-semibold text-gray-800">
                  {result.idempotent
                    ? 'Esta orden ya había sido aplicada. No se extendió nuevamente el periodo.'
                    : 'Pago aplicado correctamente. El periodo comercial está activo.'}
                </p>
                {result.message && (
                  <p className="text-xs text-gray-400">{result.message}</p>
                )}
              </div>
              {(result.currentPlanCode || result.periodStart || result.periodEnd || result.commercialStatus) && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 space-y-1.5">
                  {result.currentPlanCode && (
                    <SummaryRow label="Plan activo" value={result.currentPlanCode} mono />
                  )}
                  {result.periodStart && (
                    <SummaryRow label="Inicio periodo" value={fmtDate(result.periodStart, '—')} />
                  )}
                  {result.periodEnd && (
                    <SummaryRow label="Fin periodo" value={fmtDate(result.periodEnd, '—')} />
                  )}
                  {result.commercialStatus && (
                    <SummaryRow
                      label="Estado comercial"
                      value={result.commercialStatus === 'active' ? 'Activa' : result.commercialStatus}
                      highlight="font-semibold text-emerald-700"
                    />
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Form state ── */
            <>
              {/* Warning */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Esta acción activará o renovará manualmente el periodo comercial de la empresa con base en esta
                  orden pagada. No depende del webhook de Mercado Pago.
                </p>
              </div>

              {/* Order summary */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-1.5">
                {companyName && <SummaryRow label="Empresa" value={companyName} />}
                <SummaryRow label="Orden" value={`#${String(orderId).slice(-8).toUpperCase()}`} mono />
                <SummaryRow label="Plan" value={order.planCode || order.planName || '—'} />
                <SummaryRow label="Monto USD" value={formatUsd(order.totalAmountUsd)} />
                <SummaryRow label="Monto cobrado" value={formatCurrency(order.chargeAmount, order.chargeCurrency)} />
                <SummaryRow label="Status" value="Pagada" highlight="font-semibold text-emerald-700" />
                {order.externalReference && (
                  <SummaryRow label="Referencia" value={order.externalReference} mono />
                )}
                {order.providerPaymentId && (
                  <SummaryRow label="Payment ID" value={order.providerPaymentId} mono />
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Razón <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  className={`${fieldCls} resize-none`}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Aplicación manual de pago confirmado"
                />
              </div>

              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          {result ? (
            <button
              type="button"
              onClick={() => { onSuccess(); onClose(); }}
              className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Cerrar
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Aplicar pago
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
