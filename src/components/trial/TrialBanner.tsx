import { useState } from 'react';
import { X, Clock, AlertTriangle, AlertOctagon } from 'lucide-react';
import type { TrialStatus } from '../../services/trialApi';

interface TrialBannerProps {
  status: TrialStatus;
}

type Variant = 'info' | 'warning' | 'critical';

const VARIANTS: Record<Variant, { wrap: string; icon: string; badge: string; close: string }> = {
  info: {
    wrap:  'bg-sky-50 border-sky-200 text-sky-800',
    icon:  'text-sky-500',
    badge: 'bg-sky-100 border-sky-200 text-sky-700',
    close: 'text-sky-400 hover:text-sky-700',
  },
  warning: {
    wrap:  'bg-amber-50 border-amber-200 text-amber-800',
    icon:  'text-amber-500',
    badge: 'bg-amber-100 border-amber-200 text-amber-700',
    close: 'text-amber-400 hover:text-amber-700',
  },
  critical: {
    wrap:  'bg-red-50 border-red-200 text-red-800',
    icon:  'text-red-500',
    badge: 'bg-red-100 border-red-200 text-red-700',
    close: 'text-red-400 hover:text-red-700',
  },
};

function getVariant(effectiveStatus: string): Variant {
  if (effectiveStatus === 'trial_warning') return 'warning';
  if (effectiveStatus === 'trial_grace') return 'critical';
  return 'info';
}

function getIcon(effectiveStatus: string, cls: string) {
  if (effectiveStatus === 'trial_warning') return <AlertTriangle size={15} className={cls} />;
  if (effectiveStatus === 'trial_grace') return <AlertOctagon size={15} className={cls} />;
  return <Clock size={15} className={cls} />;
}

export default function TrialBanner({ status }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const { effectiveStatus, message, daysRemaining, graceDaysRemaining } = status;

  if (
    dismissed ||
    !effectiveStatus ||
    effectiveStatus === 'active' ||
    effectiveStatus === 'trial_expired' ||
    effectiveStatus === 'suspended'
  ) {
    return null;
  }

  const variant = getVariant(effectiveStatus);
  const v = VARIANTS[variant];

  let daysLabel = '';
  if (effectiveStatus === 'trial_grace' && graceDaysRemaining != null) {
    daysLabel = `${graceDaysRemaining} día${graceDaysRemaining !== 1 ? 's' : ''} de gracia`;
  } else if (daysRemaining != null) {
    daysLabel = `${daysRemaining} día${daysRemaining !== 1 ? 's' : ''}`;
  }

  return (
    <div className={`flex items-start gap-3 border-b px-4 py-2.5 sm:px-6 ${v.wrap}`} role="alert">
      {getIcon(effectiveStatus, `mt-0.5 shrink-0 ${v.icon}`)}

      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium">{message}</span>

        {daysLabel && (
          <span className={`ml-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${v.badge}`}>
            {daysLabel}
          </span>
        )}

        {(effectiveStatus === 'trial_warning' || effectiveStatus === 'trial_grace') && (
          <span className="ml-3 text-xs opacity-70">
            Contacta a Brentrix para regularizar tu cuenta.
          </span>
        )}
      </div>

      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={() => setDismissed(true)}
        className={`shrink-0 rounded p-0.5 transition-colors ${v.close}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
