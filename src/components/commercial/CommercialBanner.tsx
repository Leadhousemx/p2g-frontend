import { useState } from 'react';
import { X, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { CommercialStatusResponse } from '../../services/commercialApi';

interface CommercialBannerProps {
  status: CommercialStatusResponse;
}

type Variant = 'warning' | 'critical';

const VARIANTS: Record<Variant, { wrap: string; icon: string; badge: string; close: string }> = {
  warning: {
    wrap:  'bg-amber-50 border-amber-200 text-amber-800',
    icon:  'text-amber-500',
    badge: 'bg-amber-100 border-amber-200 text-amber-700',
    close: 'text-amber-400 hover:text-amber-700',
  },
  critical: {
    wrap:  'bg-orange-50 border-orange-200 text-orange-800',
    icon:  'text-orange-500',
    badge: 'bg-orange-100 border-orange-200 text-orange-700',
    close: 'text-orange-400 hover:text-orange-700',
  },
};

export default function CommercialBanner({ status }: CommercialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { effectiveStatus, message, daysRemaining } = status;

  const isGrace  = effectiveStatus === 'commercial_grace';
  const isWarning = effectiveStatus === 'commercial_active' && daysRemaining != null && daysRemaining <= 7;

  if (dismissed || (!isGrace && !isWarning)) return null;

  const variant: Variant = isGrace ? 'critical' : 'warning';
  const v = VARIANTS[variant];

  let daysLabel = '';
  if (daysRemaining != null) {
    if (daysRemaining <= 0) daysLabel = 'vence hoy';
    else daysLabel = `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`;
  }

  const defaultMessage = isGrace
    ? 'Tu plan comercial está en periodo de gracia.'
    : `Tu plan comercial vence pronto.`;

  return (
    <div className={`flex items-start gap-3 border-b px-4 py-2.5 sm:px-6 ${v.wrap}`} role="alert">
      {isGrace
        ? <AlertOctagon size={15} className={`mt-0.5 shrink-0 ${v.icon}`} />
        : <AlertTriangle size={15} className={`mt-0.5 shrink-0 ${v.icon}`} />
      }

      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{message || defaultMessage}</span>

        {daysLabel && isWarning && (
          <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${v.badge}`}>
            {daysLabel}
          </span>
        )}

        <span className="ml-3 text-xs opacity-70">
          Contacta a Brentrix para regularizar tu cuenta.
        </span>
      </div>

      <button
        type="button"
        aria-label="Cerrar aviso comercial"
        onClick={() => setDismissed(true)}
        className={`shrink-0 rounded p-0.5 transition-colors ${v.close}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
