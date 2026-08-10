import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { AlertCircle, Plus, Trash2, ArrowLeft, FileText } from "lucide-react";
import { listPagos, deletePago } from "../services/pagosService";
import { getCotizacionById } from "../services/cotizacionesService";
import PageSkeleton from "../components/common/PageSkeleton";
import AppConfirmDialog from "../components/common/AppConfirmDialog";
import ResponsiveFinancialSummary from "../components/common/ResponsiveFinancialSummary";
import ResponsiveTransactionHistory, {
  type TransactionHistoryColumn,
  type TransactionHistoryItem,
} from "../components/common/ResponsiveTransactionHistory";
import { generatePagoRecibo, isPagoEligibleForRecibo } from "../utils/pagoRecibo";

interface Cotizacion {
  _id: string;
  folio: string;
  nombreEvento: string;
  fechaEvento?: string;
  total: number;
  anticipo: number;
  saldo: number;
  saldoPendiente?: number;
  porcentajePagado?: number;
  eventoCerrado?: boolean;
  fechaCierreEvento?: string;
  estadoOperativoEvento?: string;
  lugarEvento?: string;
  direccionEvento?: string;
  ubicacion?: string;
  salonNombre?: string;
  salon?: {
    nombre?: string;
  };
  cliente?: {
    nombre?: string;
    telefono?: string;
    email?: string;
  };
  empresa?: {
    logoUrl?: string;
  };
}

interface Pago {
  _id: string;
  folio?: string;
  fecha: string;
  createdAt?: string;
  monto: number;
  formaDePago: string;
  cuenta?: string;
  referencia?: string;
  notas?: string;
  estado?: string;
  status?: string;
  deletedAt?: string | null;
  cancelado?: boolean;
  canceladoAt?: string | null;
  anulado?: boolean;
  anuladoAt?: string | null;
  activo?: boolean;
  createdBy: {
    nombre: string;
    email: string;
  };
}

interface PagosCotizacionLocationState {
  createdPagoId?: string;
}

const paymentMethodLabels: Record<string, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  deposito: "Depósito",
  tarjeta: "Tarjeta",
  cheque: "Cheque",
};

function formatCurrency(value: number) {
  return Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

function formatPaymentMethod(value: string) {
  const normalized = value?.trim().toLowerCase();
  return paymentMethodLabels[normalized] || (value ? value.charAt(0).toUpperCase() + value.slice(1) : "-");
}

export default function PagosCotizacion() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as PagosCotizacionLocationState | null) || null;
  const [cotizacion, setCotizacion] = useState<Cotizacion | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagoToDelete, setPagoToDelete] = useState<Pago | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [reciboLoadingId, setReciboLoadingId] = useState<string | null>(null);
  const [showCreatedPagoBanner, setShowCreatedPagoBanner] = useState(Boolean(locationState?.createdPagoId));
  const [receiptUnavailableIds, setReceiptUnavailableIds] = useState<string[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar cotización
        const cotData = await getCotizacionById(id!);
        setCotizacion(cotData);

        // Cargar pagos de esta cotización
        const pagosData = await listPagos({
          cotizacionId: id,
          pageSize: 100,
          sortBy: "fecha",
          sortDir: "desc",
        });
        setPagos(pagosData.pagos);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id]);

  useEffect(() => {
    setShowCreatedPagoBanner(Boolean(locationState?.createdPagoId));
  }, [locationState?.createdPagoId]);

  const eventoCerrado = cotizacion?.eventoCerrado === true;
  const saldoPendiente = Number(cotizacion?.saldoPendiente ?? cotizacion?.saldo ?? 0);
  const porcentajePagado = Number(cotizacion?.porcentajePagado);

  const handleAddPago = () => {
    if (eventoCerrado) {
      setError("Este evento ya fue cerrado y no admite nuevos pagos.");
      return;
    }

    navigate("/pagos/nuevo", { state: { cotizacionId: id } });
  };

  const handleGenerateRecibo = async (pago: Pago) => {
    if (!cotizacion || !isPagoEligibleForRecibo(pago)) {
      return;
    }

    try {
      setError(null);
      setReciboLoadingId(pago._id);
      await generatePagoRecibo({
        pagoId: pago._id,
        cotizacion,
        pago,
        verificationUrl: `${window.location.origin}/cotizaciones/${cotizacion._id}/ver`,
      });
    } catch (err: any) {
      if (err?.status === 404 || err?.shouldHideAction) {
        setReceiptUnavailableIds((prev) => (prev.includes(pago._id) ? prev : [...prev, pago._id]));
      }
      setError(err?.message || "No se pudo generar el recibo");
    } finally {
      setReciboLoadingId(null);
    }
  };

  const clearCreatedPagoBanner = () => {
    setShowCreatedPagoBanner(false);
    navigate(location.pathname, { replace: true, state: {} });
  };

  const handleDeletePago = async () => {
    if (!pagoToDelete) {
      return;
    }

    try {
      setDeleteLoading(true);
      await deletePago(pagoToDelete._id);
      setPagos((prev) => prev.filter((p) => p._id !== pagoToDelete._id));
      setPagoToDelete(null);

      // Actualizar cotización
      if (cotizacion) {
        const updated = await getCotizacionById(id!);
        setCotizacion(updated);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Error al eliminar pago");
    } finally {
      setDeleteLoading(false);
    }
  };

  const paymentItems: TransactionHistoryItem[] = pagos.map((pago) => ({
    id: pago._id,
    date: pago.fecha,
    concept: "Pago registrado",
    amount: pago.monto,
    paymentMethod: formatPaymentMethod(pago.formaDePago),
    reference: pago.referencia,
    notes: pago.notas,
    meta: [
      {
        label: "Creado por",
        value: pago.createdBy.nombre,
      },
      {
        label: "Email",
        value: pago.createdBy.email,
      },
    ],
  }));

  const paymentColumns: TransactionHistoryColumn[] = [
    { key: "date", header: "Fecha" },
    { key: "amount", header: "Monto", align: "right" },
    { key: "paymentMethod", header: "Forma de Pago" },
    { key: "reference", header: "Referencia" },
    { key: "meta", header: "Creado por" },
    { key: "notes", header: "Notas" },
    { key: "actions", header: "Acciones", align: "right" },
  ];

  const paymentPercentage = cotizacion
    ? Number.isFinite(porcentajePagado)
      ? `${porcentajePagado.toFixed(0)}%`
      : `${(cotizacion.total > 0 ? (cotizacion.anticipo / cotizacion.total) * 100 : 0).toFixed(0)}%`
    : "0%";
  const createdPago = locationState?.createdPagoId
    ? pagos.find((entry) => entry._id === locationState.createdPagoId)
    : null;
  const createdPagoHasReceipt = createdPago && !receiptUnavailableIds.includes(createdPago._id) && isPagoEligibleForRecibo(createdPago);

  if (loading) {
    return <PageSkeleton />;
  }

  if (!cotizacion) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <p className="text-yellow-800 font-semibold">Cotización no encontrada</p>
          <button
            onClick={() => navigate("/cotizaciones")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver a Cotizaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate("/cotizaciones")}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Volver"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold">Pagos - {cotizacion.folio}</h1>
          <p className="text-gray-600">{cotizacion.nombreEvento}</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {showCreatedPagoBanner && locationState?.createdPagoId && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-green-900">Pago registrado correctamente</p>
              <p className="mt-1 text-sm text-green-800">
                {createdPago
                  ? `Ya puedes emitir el recibo del pago por ${formatCurrency(createdPago.monto)} sin salir del historial.`
                  : "El pago quedó registrado y se encuentra disponible para emitir recibo desde el historial."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {createdPagoHasReceipt ? (
                <button
                  onClick={() => handleGenerateRecibo(createdPago)}
                  disabled={reciboLoadingId === createdPago._id}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FileText className="h-4 w-4" />
                  {reciboLoadingId === createdPago._id ? "Generando..." : "Emitir recibo"}
                </button>
              ) : null}
              <button
                onClick={clearCreatedPagoBanner}
                className="inline-flex items-center justify-center rounded-xl border border-green-300 px-4 py-2 text-sm font-medium text-green-800 transition-colors hover:bg-green-100"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {eventoCerrado && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Este evento está cerrado{cotizacion?.fechaCierreEvento ? ` desde ${new Date(cotizacion.fechaCierreEvento).toLocaleDateString("es-MX")}` : ""}. No se pueden registrar nuevos pagos.
        </div>
      )}

      <div className="mb-8">
        <ResponsiveFinancialSummary
          title="Resumen de cotización"
          description="Contexto financiero actual antes de registrar o eliminar pagos."
          primaryLabel="Por pagar"
          primaryValue={formatCurrency(saldoPendiente)}
          density="compact"
          showDividers={false}
          status={{
            label: saldoPendiente <= 0 ? "Pagado" : "Pendiente",
            tone: saldoPendiente <= 0 ? "success" : "warning",
          }}
          variant="inline"
          kpis={[
            {
              key: "total",
              label: "Total",
              value: formatCurrency(cotizacion.total),
              tone: "info",
              importance: "secondary",
            },
            {
              key: "paid",
              label: "Pagos Realizados",
              value: formatCurrency(cotizacion.anticipo),
              tone: "success",
              importance: "secondary",
            },
            {
              key: "percentage",
              label: "Porcentaje Pagado",
              value: paymentPercentage,
              tone: "info",
              importance: "secondary",
              helperText: "Progreso acumulado sobre el total",
            },
          ]}
          lines={[
            {
              key: "remaining",
              label: "Saldo pendiente",
              value: formatCurrency(saldoPendiente),
              importance: "primary",
              tone: saldoPendiente <= 0 ? "success" : "warning",
              helperText:
                saldoPendiente <= 0
                  ? "La cotización ya quedó cubierta por completo"
                  : "Monto restante antes de completar el pago",
            },
          ]}
          alerts={[
            {
              key: "payment-status",
              tone: saldoPendiente <= 0 ? "success" : "info",
              title: saldoPendiente <= 0 ? "Pago completo" : "Seguimiento de cobro",
              message:
                saldoPendiente <= 0
                  ? "La cotización no tiene saldo pendiente en este momento."
                  : `Aún faltan ${formatCurrency(saldoPendiente)} por cubrir.`,
            },
          ]}
        />
      </div>

      {/* Botón Nuevo Pago */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleAddPago}
          disabled={eventoCerrado}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          {eventoCerrado ? "Evento cerrado" : "Registrar Pago"}
        </button>
      </div>

      <ResponsiveTransactionHistory
        items={paymentItems}
        columns={paymentColumns}
        emptyMessage="No hay pagos registrados"
        variant="compact"
        showHeader={false}
        renderMobileTitle={() => "Pago registrado"}
        renderDesktopCell={(item, column) => {
          if (column.key === "meta") {
            return item.meta?.length ? (
              <div>
                <div className="font-medium text-[#111827]">{item.meta[0]?.value}</div>
                <div className="text-xs text-[#64748B]">{item.meta[1]?.value}</div>
              </div>
            ) : (
              "-"
            );
          }

          if (column.key === "notes") {
            return item.notes ? <span className="block max-w-xs truncate text-[#64748B]">{item.notes}</span> : "-";
          }

          return null;
        }}
        renderMobileMeta={(item) => (
          <dl className="space-y-2 text-sm">
            {item.reference ? (
              <div className="flex items-start justify-between gap-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Referencia</dt>
                <dd className="text-right text-[#111827] break-words">{item.reference}</dd>
              </div>
            ) : null}
            {item.notes ? (
              <div className="space-y-1">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Notas</dt>
                <dd className="rounded-2xl bg-slate-50 px-3 py-2 text-[#111827]">{item.notes}</dd>
              </div>
            ) : null}
            {item.meta?.map((entry) => (
              <div key={entry.label} className="flex items-start justify-between gap-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">{entry.label}</dt>
                <dd className="text-right text-[#111827]">{entry.value}</dd>
              </div>
            ))}
          </dl>
        )}
        renderActions={(item) => (
          <div className="flex items-center justify-end gap-1">
            {(() => {
              const pago = pagos.find((entry) => entry._id === item.id);
              if (!pago || receiptUnavailableIds.includes(pago._id) || !isPagoEligibleForRecibo(pago)) {
                return null;
              }

              return (
                <button
                  onClick={() => handleGenerateRecibo(pago)}
                  disabled={reciboLoadingId === pago._id}
                  className="text-blue-600 hover:text-blue-800 p-2 hover:bg-blue-50 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                  title="Emitir recibo"
                >
                  <FileText className="w-4 h-4" />
                </button>
              );
            })()}
            <button
              onClick={() => {
                const pago = pagos.find((entry) => entry._id === item.id);
                if (pago) {
                  setPagoToDelete(pago);
                }
              }}
              className="text-red-600 hover:text-red-800 p-2 hover:bg-red-50 rounded transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
        formatAmount={(amount) => formatCurrency(amount)}
      />

      {/* Nota sobre edición */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
        <p>
          <strong>Nota:</strong> Para editar un pago, elimínalo y crea uno nuevo con los datos correctos. El anticipo
          será revertido automáticamente.
        </p>
      </div>

      <AppConfirmDialog
        open={Boolean(pagoToDelete)}
        onOpenChange={(open: boolean) => {
          if (!open) {
            setPagoToDelete(null);
          }
        }}
        title="Eliminar pago"
        message={
          pagoToDelete
            ? `¿Eliminar el pago de ${formatCurrency(pagoToDelete.monto)}? El pago será revertido en la cotización.`
            : "¿Eliminar este pago?"
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        onConfirm={handleDeletePago}
        loading={deleteLoading}
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
