import { useState } from 'react';
import { X, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import {
  reconcilePaymentOrder,
  type ReconcileResult,
  extractErrorMessage,
} from '../services/backofficeApi';

interface Props {
  orderId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const fieldCls = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 transition-all';

function Label({ text, required }: { text: string; required?: boolean }) {
  return (
    <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">
      {text}{required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

export default function ReconcilePaymentOrderModal({ orderId, onClose, onSuccess }: Props) {
  const [providerPaymentId, setProviderPaymentId] = useState('');
  const [reason, setReason] = useState('Reconciliación manual Mercado Pago Sandbox');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [result, setResult]     = useState<ReconcileResult | null>(null);

  const validate = (): string => {
    if (!providerPaymentId.trim()) return 'El ID de pago es requerido.';
    if (!reason.trim() || reason.trim().length < 5) return 'La razón debe tener al menos 5 caracteres.';
    return '';
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true);
    setError('');
    try {
      const res = await reconcilePaymentOrder(orderId, {
        providerPaymentId: providerPaymentId.trim(),
        reason: reason.trim(),
      });
      setResult(res);
      onSuccess();
    } catch (e: unknown) {
      const status = (e as any)?.response?.status;
      if (status === 409) {
        setError('Mismatch: el external_reference, monto o moneda no coinciden con el pago de Mercado Pago.');
      } else if (status === 503) {
        setError('Mercado Pago no disponible. Intenta más tarde.');
      } else if (status === 400) {
        setError(extractErrorMessage(e) || 'La orden no es elegible para reconciliación en este estado.');
      } else if (status === 404) {
        setError('Orden no encontrada.');
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
      onClick={(e) => { if (e.target === e.currentTarget && !loading && !result) onClose(); }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100">
              <svg className="h-3.5 w-3.5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </span>
            <h2 className="text-base font-bold text-gray-900">Reconciliación manual</h2>
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
            <div className="space-y-3 text-center py-2">
              <CheckCircle2 size={36} className="mx-auto text-green-500" />
              <p className="text-sm font-semibold text-gray-800">
                {result.idempotent
                  ? 'La orden ya estaba conciliada (idempotente).'
                  : 'Reconciliación exitosa. La orden ahora está pagada.'}
              </p>
              {result.message && (
                <p className="text-xs text-gray-400">{result.message}</p>
              )}
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 flex items-start gap-2">
                <AlertTriangle size={14} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Usa el <strong>payment_id</strong> exacto de Mercado Pago correspondiente a esta orden.
                  Un ID de otra orden devolverá error 409.
                </p>
              </div>

              <div>
                <Label text="ID de pago Mercado Pago" required />
                <input
                  type="text"
                  className={fieldCls}
                  placeholder="ej. 168886539083"
                  value={providerPaymentId}
                  onChange={(e) => setProviderPaymentId(e.target.value)}
                  autoFocus
                />
                <p className="mt-1 text-[11px] text-gray-400">
                  Número de pago (payment_id) obtenido del panel Sandbox de Mercado Pago.
                </p>
              </div>

              <div>
                <Label text="Razón" required />
                <textarea
                  rows={2}
                  className={`${fieldCls} resize-none`}
                  placeholder="ej. Reconciliación manual Mercado Pago Sandbox"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
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
                className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Reconciliar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
