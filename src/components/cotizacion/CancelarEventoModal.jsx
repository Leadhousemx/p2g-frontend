import { Fragment, useState, useEffect } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { AlertTriangle } from "lucide-react";

export default function CancelarEventoModal({ open, onClose, onConfirm, loading, error }) {
  const [motivoCancelacion, setMotivoCancelacion] = useState("");
  const [generoReembolso, setGeneroReembolso] = useState(false);
  const [montoReembolso, setMontoReembolso] = useState("");
  const [generoGastoCancelacion, setGeneroGastoCancelacion] = useState(false);
  const [montoGastoCancelacion, setMontoGastoCancelacion] = useState("");
  const [observacionesCancelacion, setObservacionesCancelacion] = useState("");
  const [validationError, setValidationError] = useState("");

  // Reset form each time the modal opens
  useEffect(() => {
    if (!open) return;
    setMotivoCancelacion("");
    setGeneroReembolso(false);
    setMontoReembolso("");
    setGeneroGastoCancelacion(false);
    setMontoGastoCancelacion("");
    setObservacionesCancelacion("");
    setValidationError("");
  }, [open]);

  const handleClose = () => {
    if (loading) return;
    onClose();
  };

  const handleSubmit = () => {
    if (!motivoCancelacion.trim()) {
      setValidationError("El motivo de cancelación es obligatorio.");
      return;
    }
    if (generoReembolso && Number(montoReembolso) <= 0) {
      setValidationError("El monto del reembolso debe ser mayor a 0.");
      return;
    }
    if (generoGastoCancelacion && Number(montoGastoCancelacion) <= 0) {
      setValidationError("El monto del gasto por cancelación debe ser mayor a 0.");
      return;
    }
    setValidationError("");
    onConfirm({
      motivoCancelacion: motivoCancelacion.trim(),
      generoReembolso,
      montoReembolso: generoReembolso ? Number(montoReembolso) : 0,
      generoGastoCancelacion,
      montoGastoCancelacion: generoGastoCancelacion ? Number(montoGastoCancelacion) : 0,
      observacionesCancelacion: observacionesCancelacion.trim() || "",
    });
  };

  const displayError = validationError || error;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/40" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-5">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <AlertTriangle size={20} className="text-orange-600" />
                </div>
                <div>
                  <Dialog.Title className="text-lg font-semibold text-gray-900">
                    Cancelar evento
                  </Dialog.Title>
                  <p className="text-sm text-gray-500 mt-1">
                    Esta acción cambiará la cotización a estado{" "}
                    <strong className="text-gray-700">Cancelado</strong>. No se
                    eliminarán pagos, gastos ni compras existentes.
                  </p>
                </div>
              </div>

              {displayError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {displayError}
                </div>
              )}

              <div className="space-y-4">
                {/* Motivo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo de cancelación{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={motivoCancelacion}
                    onChange={(e) => setMotivoCancelacion(e.target.value)}
                    placeholder="Describe el motivo de la cancelación..."
                    rows={3}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>

                {/* Reembolso */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={generoReembolso}
                      onChange={(e) => {
                        setGeneroReembolso(e.target.checked);
                        if (!e.target.checked) setMontoReembolso("");
                      }}
                      disabled={loading}
                      className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      ¿Generó reembolso al cliente?
                    </span>
                  </label>
                  {generoReembolso && (
                    <div className="mt-2 ml-6">
                      <label className="block text-sm text-gray-600 mb-1">
                        Monto del reembolso
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={montoReembolso}
                        onChange={(e) => setMontoReembolso(e.target.value)}
                        placeholder="0.00"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                      />
                    </div>
                  )}
                </div>

                {/* Gasto por cancelación */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={generoGastoCancelacion}
                      onChange={(e) => {
                        setGeneroGastoCancelacion(e.target.checked);
                        if (!e.target.checked) setMontoGastoCancelacion("");
                      }}
                      disabled={loading}
                      className="w-4 h-4 text-orange-600 rounded border-gray-300 focus:ring-orange-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      ¿Generó gasto por cancelación?
                    </span>
                  </label>
                  {generoGastoCancelacion && (
                    <div className="mt-2 ml-6">
                      <label className="block text-sm text-gray-600 mb-1">
                        Monto del gasto por cancelación
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={montoGastoCancelacion}
                        onChange={(e) => setMontoGastoCancelacion(e.target.value)}
                        placeholder="0.00"
                        disabled={loading}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50"
                      />
                    </div>
                  )}
                </div>

                {/* Observaciones */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones{" "}
                    <span className="text-gray-400 text-xs font-normal">
                      (opcional)
                    </span>
                  </label>
                  <textarea
                    value={observacionesCancelacion}
                    onChange={(e) => setObservacionesCancelacion(e.target.value)}
                    placeholder="Observaciones adicionales..."
                    rows={2}
                    disabled={loading}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-white bg-orange-600 rounded-lg hover:bg-orange-700 disabled:opacity-50 transition"
                >
                  {loading ? "Cancelando evento..." : "Confirmar cancelación"}
                </button>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}
