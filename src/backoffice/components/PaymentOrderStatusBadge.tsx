import type { PaymentOrderStatus, PaymentProvider, PaymentOrderType } from '../services/backofficeApi';

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'Pendiente',   cls: 'bg-amber-50 text-amber-700 border-amber-200'    },
  paid:      { label: 'Pagada',      cls: 'bg-green-50 text-green-700 border-green-200'    },
  failed:    { label: 'Fallida',     cls: 'bg-red-50 text-red-700 border-red-200'          },
  cancelled: { label: 'Cancelada',   cls: 'bg-gray-100 text-gray-600 border-gray-200'      },
  expired:   { label: 'Expirada',    cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  refunded:  { label: 'Reembolsada', cls: 'bg-blue-50 text-blue-700 border-blue-200'       },
};

const PROVIDER_LABELS: Partial<Record<PaymentProvider, string>> = {
  internal:                  'Interno',
  mercado_pago:              'Mercado Pago',
  mercado_pago_cross_border: 'MP Cross Border',
  manual_usd:                'Manual USD',
  future_provider:           'Futuro',
};

const TYPE_LABELS: Partial<Record<PaymentOrderType, string>> = {
  first_payment:  'Primer pago',
  renewal:        'Renovación',
  manual_payment: 'Pago manual',
};

export function PaymentOrderStatusBadge({ status }: { status: PaymentOrderStatus | string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function formatProvider(provider: string): string {
  return (PROVIDER_LABELS as Record<string, string>)[provider] ?? provider;
}

export function formatOrderType(type: string): string {
  return (TYPE_LABELS as Record<string, string>)[type] ?? type;
}
