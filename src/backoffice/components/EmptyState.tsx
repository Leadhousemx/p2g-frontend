import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export default function EmptyState({
  title = 'Sin resultados',
  description = 'No hay datos que mostrar con los filtros actuales.',
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="mb-4 text-gray-300">
        {icon ?? <Inbox size={48} strokeWidth={1.5} />}
      </div>
      <p className="text-base font-semibold text-gray-500">{title}</p>
      <p className="mt-1 text-sm text-gray-400 max-w-sm">{description}</p>
    </div>
  );
}
