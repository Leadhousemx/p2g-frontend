import { useState, useEffect } from 'react';
import { X, Loader2, ChevronLeft, CheckCircle2 } from 'lucide-react';
import {
  getCommercialPlans,
  previewCompanyPaymentOrder,
  createCompanyPaymentOrder,
  type CommercialPlan,
  type PaymentOrderPreview,
  type PaymentOrder,
  type PaymentOrderPreviewInput,
  extractErrorMessage,
} from '../services/backofficeApi';
import { formatCurrency, formatUsd } from '../utils/formatCurrency';

const BILLING_COUNTRIES = [
  { value: 'MX', label: 'MX — México' },
  { value: 'CO', label: 'CO — Colombia' },
  { value: 'CL', label: 'CL — Chile' },
  { value: 'PE', label: 'PE — Perú' },
  { value: 'UY', label: 'UY — Uruguay' },
  { value: 'AR', label: 'AR — Argentina' },
  { value: 'BR', label: 'BR — Brasil' },
  { value: 'PA', label: 'PA — Panamá' },
  { value: 'US', label: 'US — Estados Unidos' },
  { value: 'OTHER', label: 'OTHER — Otro' },
];

const CHARGE_CURRENCIES = ['USD', 'MXN', 'COP', 'CLP', 'PEN', 'UYU', 'ARS', 'BRL'];

const ORDER_TYPES = [
  { value: 'first_payment',  label: 'Primer pago'  },
  { value: 'renewal',        label: 'Renovación'   },
  { value: 'manual_payment', label: 'Pago manual'  },
];

type Phase = 'form' | 'preview' | 'success';

interface FormState {
  planId: string;
  type: string;
  billingCountry: string;
  chargeCurrency: string;
  exchangeRate: string;
  billingEmail: string;
  reason: string;
}

const INIT: FormState = {
  planId: '', type: '', billingCountry: '',
  chargeCurrency: 'USD', exchangeRate: '1',
  billingEmail: '', reason: '',
};

interface Props {
  companyId: string;
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

function PRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between border-b border-gray-50 py-1.5 last:border-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  );
}

export default function CreatePaymentOrderModal({ companyId, onClose, onSuccess }: Props) {
  const [phase, setPhase]           = useState<Phase>('form');
  const [plans, setPlans]           = useState<CommercialPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [form, setForm]             = useState<FormState>(INIT);
  const [preview, setPreview]       = useState<PaymentOrderPreview | null>(null);
  const [created, setCreated]       = useState<PaymentOrder | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');

  useEffect(() => {
    getCommercialPlans()
      .then((data) => setPlans(data.filter((p) => p.isActive)))
      .catch(() => setPlans([]))
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    if (form.chargeCurrency === 'USD') {
      setForm((f) => ({ ...f, exchangeRate: '1' }));
    }
  }, [form.chargeCurrency]);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validate = (): string => {
    if (!form.planId) return 'Selecciona un plan.';
    if (!form.type) return 'Selecciona el tipo de orden.';
    if (!form.billingCountry) return 'Selecciona el país de facturación.';
    const rate = parseFloat(form.exchangeRate);
    if (!form.exchangeRate || isNaN(rate) || rate <= 0) return 'Ingresa un tipo de cambio válido.';
    return '';
  };

  const buildPayload = (): PaymentOrderPreviewInput => ({
    planId: form.planId,
    type: form.type as PaymentOrderPreviewInput['type'],
    billingCountry: form.billingCountry,
    chargeCurrency: form.chargeCurrency,
    exchangeRate: parseFloat(form.exchangeRate),
    exchangeRateProvider: 'manual',
    billingEmail: form.billingEmail || undefined,
    reason: form.reason || undefined,
  });

  const handlePreview = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(''); setLoading(true);
    try {
      const result = await previewCompanyPaymentOrder(companyId, buildPayload());
      setPreview(result);
      setPhase('preview');
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setError(''); setLoading(true);
    try {
      const order = await createCompanyPaymentOrder(companyId, buildPayload());
      setCreated(order);
      setPhase('success');
    } catch (e) {
      setError(extractErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const isUsd = form.chargeCurrency === 'USD';

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-10"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget && phase !== 'success') onClose(); }}
    >
      <div className="relative mb-8 w-full max-w-lg rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-2">
            {phase === 'preview' && (
              <button type="button" onClick={() => { setPhase('form'); setError(''); }}
                      className="mr-1 text-gray-400 hover:text-gray-600">
                <ChevronLeft size={16} />
              </button>
            )}
            <h2 className="text-base font-bold text-gray-900">
              {phase === 'form'    ? 'Crear orden de pago'
               : phase === 'preview' ? 'Vista previa del cálculo'
               : 'Orden creada'}
            </h2>
          </div>
          {phase !== 'success' && (
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* ─── FORM ─── */}
          {phase === 'form' && (
            <>
              <div>
                <Label text="Plan" required />
                <select className={fieldCls} value={form.planId}
                        onChange={(e) => set('planId', e.target.value)} disabled={plansLoading}>
                  <option value="">{plansLoading ? 'Cargando planes…' : '— Seleccionar plan —'}</option>
                  {plans.map((p) => {
                    const pid = p.id || (p as any)._id;
                    return (
                      <option key={pid} value={pid}>
                        {p.name} — USD ${p.basePriceUsd} / {p.serviceMonths} mes{p.serviceMonths !== 1 ? 'es' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <Label text="Tipo de orden" required />
                <select className={fieldCls} value={form.type} onChange={(e) => set('type', e.target.value)}>
                  <option value="">— Seleccionar tipo —</option>
                  {ORDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label text="País facturación" required />
                  <select className={fieldCls} value={form.billingCountry}
                          onChange={(e) => set('billingCountry', e.target.value)}>
                    <option value="">— País —</option>
                    {BILLING_COUNTRIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label text="Moneda cobro" required />
                  <select className={fieldCls} value={form.chargeCurrency}
                          onChange={(e) => set('chargeCurrency', e.target.value)}>
                    {CHARGE_CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <Label text={isUsd ? 'Tipo de cambio (USD = 1)' : 'Tipo de cambio'} required />
                <input
                  type="number" min="0.01" step="any" placeholder="Ej: 3920"
                  className={fieldCls}
                  value={form.exchangeRate}
                  onChange={(e) => set('exchangeRate', e.target.value)}
                  readOnly={isUsd}
                  style={isUsd ? { background: '#f9fafb', cursor: 'default' } : {}}
                />
              </div>

              <div>
                <Label text="Email de facturación (opcional)" />
                <input type="email" className={fieldCls} placeholder="facturacion@empresa.com"
                       value={form.billingEmail} onChange={(e) => set('billingEmail', e.target.value)} />
              </div>

              <div>
                <Label text="Razón / nota (opcional)" />
                <textarea rows={2} className={`${fieldCls} resize-none`}
                          placeholder="Ej: Activación manual por contrato firmado"
                          value={form.reason} onChange={(e) => set('reason', e.target.value)} />
              </div>
            </>
          )}

          {/* ─── PREVIEW ─── */}
          {phase === 'preview' && preview && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 space-y-0.5">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                Desglose del cálculo
              </p>
              <PRow label="Plan"               value={preview.planName || preview.planCode || '—'} />
              <PRow label="Usuarios activos"   value={preview.activeUsersCount ?? '—'} />
              <PRow label="Usuarios incluidos" value={preview.includedUsers ?? '—'} />
              <PRow label="Usuarios extra"     value={preview.extraUsersCount ?? 0} />
              <PRow label="Precio base"        value={formatUsd(preview.basePlanAmountUsd)} />
              <PRow label="Cargo usuarios extra" value={formatUsd(preview.extraUsersAmountUsd)} />
              <PRow label="Total USD"          value={<span className="text-sky-700">{formatUsd(preview.totalAmountUsd)}</span>} />
              <PRow label="Moneda de cobro"    value={preview.chargeCurrency} />
              <PRow label="Tipo de cambio"     value={preview.exchangeRate ?? '—'} />
              <PRow label="Monto final"        value={<span className="font-bold text-emerald-700">{formatCurrency(preview.chargeAmount, preview.chargeCurrency)}</span>} />
              {preview.paidMonths     != null && <PRow label="Meses pagados"      value={preview.paidMonths} />}
              {preview.bonusMonths    != null && <PRow label="Meses regalo"       value={preview.bonusMonths} />}
              {preview.serviceMonths  != null && <PRow label="Meses de servicio"  value={preview.serviceMonths} />}
            </div>
          )}

          {/* ─── SUCCESS ─── */}
          {phase === 'success' && created && (
            <div className="space-y-3 text-center">
              <CheckCircle2 size={40} className="mx-auto text-green-500" />
              <p className="text-sm font-semibold text-gray-800">Orden creada correctamente</p>
              <div className="rounded-xl bg-gray-50 px-4 py-3 text-left space-y-0.5">
                <PRow label="ID"
                      value={<span className="font-mono text-xs">{(created.id || (created as any)._id || '').slice(0, 20)}…</span>} />
                <PRow label="Status"        value="Pendiente" />
                <PRow label="Total USD"     value={formatUsd(created.totalAmountUsd)} />
                <PRow label="Monto cobrado" value={formatCurrency(created.chargeAmount, created.chargeCurrency)} />
                <PRow label="Expira"        value={created.expiresAt
                  ? new Date(created.expiresAt).toLocaleDateString('es-MX')
                  : 'Sin fecha'} />
                <PRow label="Checkout URL"  value={<span className="text-gray-400 italic">No disponible en esta fase</span>} />
              </div>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-gray-100 px-6 py-4">
          {phase === 'form' && (
            <>
              <button type="button" onClick={onClose}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="button" onClick={handlePreview} disabled={loading}
                      className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60">
                {loading && <Loader2 size={14} className="animate-spin" />}
                Calcular preview
              </button>
            </>
          )}
          {phase === 'preview' && (
            <>
              <button type="button" onClick={() => { setPhase('form'); setError(''); }}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50">
                Volver
              </button>
              <button type="button" onClick={handleCreate} disabled={loading}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60">
                {loading && <Loader2 size={14} className="animate-spin" />}
                Crear orden
              </button>
            </>
          )}
          {phase === 'success' && (
            <button type="button"
                    onClick={() => { onSuccess(); onClose(); }}
                    className="rounded-xl bg-gray-900 px-6 py-2 text-sm font-medium text-white hover:bg-gray-700">
              Cerrar y actualizar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
