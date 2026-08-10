type ActivityStatus = 'active_today' | 'active_week' | 'inactive' | string;

interface ActivityBadgeProps {
  status: ActivityStatus;
}

const ACTIVITY: Record<string, { label: string; cls: string; dot: string }> = {
  active_today: { label: 'Activa hoy',         cls: 'bg-sky-50 text-sky-700 border-sky-200',     dot: 'bg-sky-500'   },
  active_week:  { label: 'Activa esta semana',  cls: 'bg-green-50 text-green-700 border-green-200', dot: 'bg-green-500' },
  inactive:     { label: 'Inactiva',            cls: 'bg-gray-50 text-gray-500 border-gray-200',  dot: 'bg-gray-400'  },
};

export default function ActivityBadge({ status }: ActivityBadgeProps) {
  const cfg = ACTIVITY[status] ?? ACTIVITY.inactive;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.cls}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
