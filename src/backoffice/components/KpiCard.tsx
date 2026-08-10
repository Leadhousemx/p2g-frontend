interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent?: 'violet' | 'green' | 'amber' | 'red' | 'sky' | 'slate';
}

const ACCENT: Record<string, { bg: string; icon: string; border: string }> = {
  violet: { bg: 'bg-violet-50',  icon: 'text-violet-600',  border: 'border-violet-100' },
  green:  { bg: 'bg-green-50',   icon: 'text-green-600',   border: 'border-green-100'  },
  amber:  { bg: 'bg-amber-50',   icon: 'text-amber-600',   border: 'border-amber-100'  },
  red:    { bg: 'bg-red-50',     icon: 'text-red-600',     border: 'border-red-100'    },
  sky:    { bg: 'bg-sky-50',     icon: 'text-sky-600',     border: 'border-sky-100'    },
  slate:  { bg: 'bg-slate-50',   icon: 'text-slate-600',   border: 'border-slate-100'  },
};

export default function KpiCard({
  title,
  value,
  subtitle,
  icon,
  accent = 'slate',
}: KpiCardProps) {
  const a = ACCENT[accent];
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        <span className={`${a.bg} ${a.border} border rounded-xl p-2 ${a.icon}`}>
          {icon}
        </span>
      </div>
      <div>
        <span className="text-3xl font-extrabold text-gray-900 tabular-nums">
          {value ?? '—'}
        </span>
        {subtitle && (
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
