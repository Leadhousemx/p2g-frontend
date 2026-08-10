type CompanyStatus = 'active' | 'trial' | 'suspended' | string;
type UserStatus = boolean; // isActive
type EffectiveStatus = 'active' | 'trial_active' | 'trial_warning' | 'trial_grace' | 'trial_expired' | 'suspended' | string;

interface CompanyStatusBadgeProps {
  status: CompanyStatus;
}

interface UserStatusBadgeProps {
  isActive: UserStatus;
}

const COMPANY_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Activa',       cls: 'bg-green-50 text-green-700 border-green-200'   },
  trial:     { label: 'Trial',        cls: 'bg-amber-50 text-amber-700 border-amber-200'   },
  suspended: { label: 'Suspendida',   cls: 'bg-red-50 text-red-700 border-red-200'         },
};

export function CompanyStatusBadge({ status }: CompanyStatusBadgeProps) {
  const cfg = COMPANY_STATUS[status] ?? { label: 'Desconocido', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function UserStatusBadge({ isActive }: UserStatusBadgeProps) {
  return isActive ? (
    <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700">
      Activo
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-xs font-semibold text-gray-500">
      Inactivo
    </span>
  );
}

const EFFECTIVE_STATUS: Record<string, { label: string; cls: string }> = {
  active:         { label: 'Activa',        cls: 'bg-green-50 text-green-700 border-green-200'     },
  manual_active:  { label: 'Activa manual', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  trial_active:   { label: 'Trial activo',  cls: 'bg-sky-50 text-sky-700 border-sky-200'           },
  trial_warning:  { label: 'Por vencer',    cls: 'bg-amber-50 text-amber-700 border-amber-200'     },
  trial_grace:    { label: 'En gracia',     cls: 'bg-orange-50 text-orange-700 border-orange-200'  },
  trial_expired:  { label: 'Trial vencido', cls: 'bg-red-50 text-red-700 border-red-200'           },
  suspended:      { label: 'Suspendida',    cls: 'bg-red-50 text-red-700 border-red-200'           },
};

export function EffectiveStatusBadge({ status }: { status: EffectiveStatus }) {
  const cfg = EFFECTIVE_STATUS[status] ?? { label: status || 'Desconocido', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

const PLAN_LABELS: Record<string, string> = {
  manual_active: 'Activa manual',
  free:          'Gratis',
};

export function formatPlan(plan?: string | null): string {
  if (!plan) return '—';
  return PLAN_LABELS[plan] ?? plan;
}

const COMMERCIAL_STATUS_MAP: Record<string, { label: string; cls: string }> = {
  commercial_active:    { label: 'Plan activo',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  commercial_grace:     { label: 'Gracia',        cls: 'bg-orange-50 text-orange-700 border-orange-200'   },
  commercial_expired:   { label: 'Plan vencido',  cls: 'bg-red-50 text-red-700 border-red-200'            },
  commercial_suspended: { label: 'Suspendida',    cls: 'bg-red-50 text-red-700 border-red-200'            },
  no_commercial_plan:   { label: 'Sin plan',      cls: 'bg-gray-50 text-gray-500 border-gray-200'         },
};

export function CommercialStatusBadge({ status }: { status: string }) {
  const cfg = COMMERCIAL_STATUS_MAP[status] ?? { label: status || '—', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}
