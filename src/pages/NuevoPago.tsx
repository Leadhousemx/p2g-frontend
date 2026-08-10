import { useState, useEffect } from "react";
import { removeToken } from "../utils/tokenManager";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, FileText, Save, XCircle } from "lucide-react";
import { ValidationErrorModal } from "../components/common/ValidationErrorModal";
import { useValidationError } from "../hooks/useValidationError";
import { createPago, FormaDePago, type Pago } from "../services/pagosService";
import { listCotizacionesContratadas, getCotizacion, type Cotizacion } from "../services/cotizacionesService";
import FormPageShell from "../components/common/forms/FormPageShell";
import FormSection from "../components/common/forms/FormSection";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormActionsBar from "../components/common/forms/FormActionsBar";
import { Button, Input, Label } from "@/components/ui";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { toLocalDateOnly } from "../utils/dateOnly";
import { generatePagoRecibo, isPagoEligibleForRecibo } from "../utils/pagoRecibo";

interface PagoCreadoContext {
  pago: Pago;
  cotizacionId: string;
}

const NuevoPagoSchema = z.object({
  cotizacionId: z.string().min(1, "Cotización es obligatoria"),
  fecha: z.string().optional(),
  monto: z.number().min(0.01, "Monto debe ser mayor a 0"),
  formaDePago: z.enum(["transferencia", "efectivo", "tarjeta", "cheque", "otro"]),
  cuenta: z.string().optional().or(z.literal("")),
  referencia: z.string().optional().or(z.literal("")),
  notas: z.string().optional().or(z.literal("")),
});

type NuevoPagoType = z.infer<typeof NuevoPagoSchema>;


const FORMAS_PAGO: Array<{ value: FormaDePago; label: string }> = [
  { value: "transferencia", label: "Transferencia" },
  { value: "efectivo", label: "Efectivo" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
  { value: "otro", label: "Otro" },
];

function getCotizacionPagoLabel(cotizacion: Cotizacion | undefined | null): string {
  if (!cotizacion) return "Cotización sin información";
  if (cotizacion.displayLabel) return cotizacion.displayLabel;

  const folio = cotizacion.folio || "Sin folio";
  const evento = cotizacion.nombreEvento || "";
  const cliente = cotizacion.clienteNombre || "";
  const pendiente =
    typeof cotizacion.saldoPendiente === "number"
      ? `($${cotizacion.saldoPendiente.toFixed(2)} por pagar)`
      : typeof cotizacion.saldo === "number"
      ? `($${cotizacion.saldo.toFixed(2)} por pagar)`
      : "";

  return [folio, evento, cliente, pendiente].filter(Boolean).join(" - ");
}

export default function NuevoPago() {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([]);
  const [preselectedCotizacionCerrada, setPreselectedCotizacionCerrada] = useState<Cotizacion | null>(null);
  const [loadingCotizaciones, setLoadingCotizaciones] = useState(true);
  const [returnTo, setReturnTo] = useState("/pagos");
  const [createdPagoContext, setCreatedPagoContext] = useState<PagoCreadoContext | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);
  const { showModal, validationFields, errorMessage, handleError, closeModal } = useValidationError();

  // Detectar si viene desde una cotización específica
  const preselectedCotizacionId = (location.state as any)?.cotizacionId || "";

  const form = useForm<NuevoPagoType>({
    resolver: zodResolver(NuevoPagoSchema),
    defaultValues: {
      cotizacionId: preselectedCotizacionId || "",
      fecha: toLocalDateOnly(new Date()),
      monto: 0,
      formaDePago: "transferencia",
      cuenta: "",
      referencia: "",
      notas: "",
    },
  });

  // Cargar cotizaciones — todas las páginas (pageSize=100, Promise.all para páginas restantes)
  useEffect(() => {
    const loadCotizaciones = async () => {
      try {
        setLoadingCotizaciones(true);

        // includeClosed:false — no cargar histórico cerrado; se añade fallback puntual si hay preseleccionada
        // Sort client-side por fechaEvento ASC (listCotizacionesContratadas no reenvía sortBy al backend)
        const todas = (await listCotizacionesContratadas({ includeClosed: false }))
          .sort((a, b) => a.fechaEvento.localeCompare(b.fechaEvento));

        // Doble guarda local: excluir cerradas (por si acaso) y sin saldo pendiente
        const elegibles = todas.filter(
          (c) => !c.eventoCerrado && (typeof c.saldoPendiente !== "number" || c.saldoPendiente > 0)
        );

        let cotizacionCerradaPreseleccionada: Cotizacion | null = null;

        if (preselectedCotizacionId) {
          const enElegibles = elegibles.find((c) => c._id === preselectedCotizacionId);

          if (!enElegibles) {
            // Puede estar en 'todas' pero filtrada localmente por saldo=0
            const enTodas = todas.find((c) => c._id === preselectedCotizacionId);
            if (enTodas) {
              // Está en la lista pero sin saldo pendiente
              cotizacionCerradaPreseleccionada = enTodas;
            } else {
              // No está en la lista (eventoCerrado o estado distinto de Contratado);
              // fetch puntual para obtener contexto y mostrar el aviso correcto
              try {
                const raw = await getCotizacion(preselectedCotizacionId);
                if (
                  raw.eventoCerrado ||
                  (typeof raw.saldoPendiente === "number" && raw.saldoPendiente <= 0)
                ) {
                  cotizacionCerradaPreseleccionada = raw;
                }
              } catch {
                // Cotización no encontrada o no accesible — no mostrar aviso
              }
            }
          }

          setReturnTo(`/cotizaciones/${preselectedCotizacionId}/pagos`);
        }

        setPreselectedCotizacionCerrada(cotizacionCerradaPreseleccionada);
        setCotizaciones(elegibles);
      } catch (err) {
        setError("Error al cargar cotizaciones");
      } finally {
        setLoadingCotizaciones(false);
      }
    };
    loadCotizaciones();
  }, [preselectedCotizacionId]);

  const onSubmit = async (data: NuevoPagoType) => {
    setError(null);
    const cotizacionSeleccionada = cotizaciones.find((cotizacion) => cotizacion._id === data.cotizacionId);

    if (preselectedCotizacionCerrada && preselectedCotizacionCerrada._id === data.cotizacionId) {
      setError("Esta cotización pertenece a un evento cerrado y ya no admite nuevos pagos.");
      return;
    }

    if (cotizacionSeleccionada?.eventoCerrado) {
      setError("Esta cotización pertenece a un evento cerrado y ya no admite nuevos pagos.");
      return;
    }

    try {
      const payload = {
        cotizacionId: data.cotizacionId,
        monto: data.monto,
        formaDePago: data.formaDePago,
        ...(data.fecha && { fecha: data.fecha }),
        ...(data.cuenta && { cuenta: data.cuenta }),
        ...(data.referencia && { referencia: data.referencia }),
        ...(data.notas && { notas: data.notas }),
      };
      const result = await createPago(payload);
      const pagoCreado = result?.pago;

      if (!pagoCreado?._id) {
        navigate(returnTo);
        return;
      }

      setCreatedPagoContext({
        pago: pagoCreado,
        cotizacionId: data.cotizacionId,
      });
    } catch (err: any) {
      const status = Number(err?.response?.status || 0);
      if (status === 401) {
        removeToken();
        sessionStorage.removeItem("authUser");
        sessionStorage.removeItem("authCompany");
        localStorage.removeItem("user");
        setError("Tu sesión expiró. Inicia sesión nuevamente.");
        navigate("/login", { replace: true });
        return;
      }
      handleError(err);
      if (!errorMessage) {
        setError("Error al crear pago");
      }
    }
  };

  const handleGoToHistory = () => {
    navigate(returnTo, {
      state: createdPagoContext?.pago?._id ? { createdPagoId: createdPagoContext.pago._id } : undefined,
    });
  };

  const handleGenerateRecibo = async () => {
    if (!createdPagoContext?.pago?._id || !isPagoEligibleForRecibo(createdPagoContext.pago)) {
      setError("No se encontró información suficiente para emitir el recibo.");
      return;
    }

    try {
      setError(null);
      setReceiptLoading(true);
      await generatePagoRecibo({
        pagoId: createdPagoContext.pago._id,
        pago: createdPagoContext.pago,
        verificationUrl: `${window.location.origin}/cotizaciones/${createdPagoContext.cotizacionId}/ver`,
      });
    } catch (err: any) {
      setError(err?.message || "No se pudo emitir el recibo");
    } finally {
      setReceiptLoading(false);
    }
  };

  const handleRegisterAnother = () => {
    const selectedCotizacionId = createdPagoContext?.cotizacionId || preselectedCotizacionId || form.getValues("cotizacionId");

    setCreatedPagoContext(null);
    setError(null);
    form.reset({
      cotizacionId: selectedCotizacionId || "",
      fecha: toLocalDateOnly(new Date()),
      monto: 0,
      formaDePago: "transferencia",
      cuenta: "",
      referencia: "",
      notas: "",
    });
  };

  return (
    <>
      <FormPageShell
        title=""
        description=""
        actions={
          <Link to={returnTo}>
            <Button variant="outline" type="button" className="w-full sm:w-auto">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </Link>
        }
      >
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <h3 className="font-semibold text-red-900">Error al registrar pago</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {preselectedCotizacionCerrada && (
          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <div>
              <h3 className="font-semibold text-slate-900">Evento cerrado</h3>
              <p>
                {preselectedCotizacionCerrada.eventoCerrado
                  ? `La cotización preseleccionada ya fue cerrada${preselectedCotizacionCerrada.fechaCierreEvento ? ` el ${new Date(preselectedCotizacionCerrada.fechaCierreEvento).toLocaleDateString("es-MX")}` : ""}. No puedes registrar nuevos pagos sobre ella.`
                  : "Esta cotización no tiene saldo pendiente. No es posible registrar nuevos pagos."}
              </p>
            </div>
          </div>
        )}

        {createdPagoContext && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold text-green-900">Pago registrado correctamente</h3>
                <p className="text-sm text-green-800">
                  Puedes emitir el recibo ahora o volver al historial para reutilizarlo más tarde.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleGenerateRecibo}
                  disabled={receiptLoading}
                  className="w-full gap-2 sm:w-auto"
                >
                  <FileText className="h-4 w-4" />
                  {receiptLoading ? "Generando recibo..." : "Emitir recibo"}
                </Button>
                <Button type="button" variant="outline" onClick={handleGoToHistory} className="w-full sm:w-auto">
                  Ver historial de pagos
                </Button>
                <Button type="button" variant="ghost" onClick={handleRegisterAnother} className="w-full sm:w-auto">
                  Registrar otro pago
                </Button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormSection
            title="Pago y cotización"
            description="Selecciona la cotización contratada y captura los datos principales del movimiento para registrarlo en el sistema."
          >
            <FieldGrid>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="cotizacionId">Cotización *</Label>
                <Select
                  value={form.watch("cotizacionId") || "__empty__"}
                  onValueChange={(value: string) => {
                    form.setValue("cotizacionId", value === "__empty__" ? "" : value, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                  disabled={loadingCotizaciones}
                >
                  <SelectTrigger id="cotizacionId">
                    <SelectValue
                      placeholder={loadingCotizaciones ? "Cargando cotizaciones..." : "Selecciona una cotización"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__" disabled>
                      {loadingCotizaciones ? "Cargando cotizaciones..." : "Selecciona una cotización"}
                    </SelectItem>
                    {cotizaciones.map((cot) => (
                      <SelectItem key={cot._id} value={cot._id}>
                        {getCotizacionPagoLabel(cot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.cotizacionId && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.cotizacionId.message}</p>
                )}
                {!loadingCotizaciones && cotizaciones.length === 0 && !preselectedCotizacionCerrada && (
                  <p className="mt-1 text-xs text-[#64748B]">No hay cotizaciones contratadas disponibles para registrar pagos nuevos.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha</Label>
                <Input
                  id="fecha"
                  {...form.register("fecha")}
                  type="date"
                />
                <p className="text-xs text-[#64748B]">Opcional. Si no se modifica, se conserva la fecha actual.</p>
                {form.formState.errors.fecha && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.fecha.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="monto">Monto *</Label>
                <Input
                  id="monto"
                  {...form.register("monto", { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                />
                {form.formState.errors.monto && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.monto.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="formaDePago">Forma de pago *</Label>
                <Select
                  value={form.watch("formaDePago")}
                  onValueChange={(value: string) => {
                    form.setValue("formaDePago", value as FormaDePago, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }}
                >
                  <SelectTrigger id="formaDePago">
                    <SelectValue placeholder="Selecciona una forma de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGO.map((forma) => (
                      <SelectItem key={forma.value} value={forma.value}>
                        {forma.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.formaDePago && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.formaDePago.message}</p>
                )}
              </div>
            </FieldGrid>
          </FormSection>

          <FormSection
            title="Datos de conciliación"
            description="Agrega referencias opcionales para identificar el pago más adelante en reportes o conciliaciones."
          >
            <FieldGrid>
              <div className="space-y-2">
                <Label htmlFor="cuenta">Cuenta</Label>
                <Input
                  id="cuenta"
                  {...form.register("cuenta")}
                  type="text"
                  placeholder="Ej: Cuenta bancaria o número de transacción"
                />
                {form.formState.errors.cuenta && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.cuenta.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="referencia">Referencia</Label>
                <Input
                  id="referencia"
                  {...form.register("referencia")}
                  type="text"
                  placeholder="Referencia del pago"
                />
                {form.formState.errors.referencia && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.referencia.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notas">Notas</Label>
                <Textarea
                  id="notas"
                  {...form.register("notas")}
                  rows={4}
                  placeholder="Observaciones o detalles del pago..."
                />
                {form.formState.errors.notas && (
                  <p className="mt-1 text-xs text-red-600">{form.formState.errors.notas.message}</p>
                )}
              </div>
            </FieldGrid>
          </FormSection>

          <FormSection contentClassName="pt-5">
            <FormActionsBar className="border-t-0 pt-0">
              <Link to={returnTo}>
                <Button type="button" variant="outline" className="w-full sm:w-auto">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={form.formState.isSubmitting} className="w-full gap-2 sm:w-auto">
                <Save className="h-4 w-4" />
                {form.formState.isSubmitting ? "Registrando..." : createdPagoContext ? "Registrar otro pago" : "Registrar Pago"}
              </Button>
            </FormActionsBar>
          </FormSection>
        </form>

        <ValidationErrorModal
          isOpen={showModal}
          onClose={closeModal}
          fields={validationFields}
          title="Datos incompletos"
        />
      </FormPageShell>
    </>
  );
}
