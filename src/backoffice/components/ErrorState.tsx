import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export default function ErrorState({
  message = 'No se pudo cargar la información.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
      <div className="text-red-400">
        <AlertCircle size={40} strokeWidth={1.5} />
      </div>
      <div>
        <p className="text-base font-semibold text-gray-700">Algo salió mal</p>
        <p className="mt-1 text-sm text-gray-400 max-w-sm">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition"
        >
          <RefreshCw size={14} />
          Reintentar
        </button>
      )}
    </div>
  );
}
