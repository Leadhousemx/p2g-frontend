const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  commercial_active:    { label: 'Activa',        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  commercial_grace:     { label: 'Gracia',         cls: 'bg-orange-50 text-orange-700 border-orange-200'   },
  commercial_expired:   { label: 'Vencida',        cls: 'bg-red-50 text-red-700 border-red-200'            },
  commercial_suspended: { label: 'Suspendida',     cls: 'bg-red-50 text-red-700 border-red-200'            },
  no_commercial_plan:   { label: 'Sin plan',       cls: 'bg-gray-100 text-gray-500 border-gray-200'        },
  trial_active:         { label: 'Trial',          cls: 'bg-sky-50 text-sky-700 border-sky-200'            },
  trial_expired:        { label: 'Trial vencido',  cls: 'bg-red-50 text-red-700 border-red-200'            },
  legacy_active:        { label: 'Legacy activa',  cls: 'bg-slate-50 text-slate-600 border-slate-200'      },
};

export function CommercialOperationStatusBadge({ status }: { status?: string | null }) {
  const s = status || '';
  const cfg = STATUS_CFG[s] ?? { label: s || '—', cls: 'bg-gray-50 text-gray-600 border-gray-200' };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

export function AccessAllowedBadge({ allowed }: { allowed?: boolean | null }) {
  if (allowed === true)
    return (
      <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
        Acceso OK
      </span>
    );
  if (allowed === false)
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
        Bloqueado
      </span>
    );
  return <span className="text-gray-400 text-xs">—</span>;
}
