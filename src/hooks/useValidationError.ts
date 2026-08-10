import { useState } from 'react';
import {
  extractValidationErrors,
  isValidationError,
  getErrorMessage,
  ValidationErrorField,
} from '../utils/validationErrorUtils';

interface UseValidationErrorReturn {
  showModal: boolean;
  validationFields: ValidationErrorField[];
  errorMessage: string;
  handleError: (error: any) => void;
  closeModal: () => void;
}

/**
 * Hook para manejar errores de validación y mostrar modal
 * Detecta automáticamente si es un error de validación
 */
export function useValidationError(): UseValidationErrorReturn {
  const [showModal, setShowModal] = useState(false);
  const [validationFields, setValidationFields] = useState<ValidationErrorField[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleError = (error: any) => {
    if (isValidationError(error)) {
      // Es un error de validación - mostrar modal con campos
      const fields = extractValidationErrors(error);
      setValidationFields(fields);
      setShowModal(true);
    } else {
      // Es otro tipo de error - mantener comportamiento existente
      const message = getErrorMessage(error);
      setErrorMessage(message);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setValidationFields([]);
  };

  return {
    showModal,
    validationFields,
    errorMessage,
    handleError,
    closeModal,
  };
}
