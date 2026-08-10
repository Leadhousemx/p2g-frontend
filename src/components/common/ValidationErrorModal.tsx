import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui';

interface ValidationErrorField {
  field: string;
  label: string;
  message?: string;
}

interface ValidationErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  fields: ValidationErrorField[];
  title?: string;
}

export function ValidationErrorModal({
  isOpen,
  onClose,
  fields,
  title = 'Campos obligatorios',
}: ValidationErrorModalProps) {
  if (!isOpen || fields.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4">
            Por favor, completa los siguientes campos antes de continuar:
          </p>

          <div className="space-y-3">
            {fields.map((field, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm break-words">
                    {field.label}
                  </p>
                  {field.message && (
                    <p className="text-xs text-gray-600 mt-1">{field.message}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <Button variant="default" onClick={onClose}>
            Entendido
          </Button>
        </div>
      </div>
    </div>
  );
}
