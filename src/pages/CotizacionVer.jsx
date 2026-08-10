import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Copy, FileEdit, FileText, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@radix-ui/react-dropdown-menu";
import QuotationTotals from "../components/cotizacion/QuotationTotals";
import AppConfirmDialog from "../components/common/AppConfirmDialog";
import ResponsiveFinancialSummary from "../components/common/ResponsiveFinancialSummary";
import FieldGrid from "../components/common/forms/FieldGrid";
import FormSection from "../components/common/forms/FormSection";
import { useAuth } from "../context/auth-context";
import { getQuotationStatusConfig, normalizeQuotationStatus } from "../constants/quotationStatus";
import { logger } from "../lib/logger";
import { listCompras } from "../services/comprasService";
import { cerrarEventoCotizacion, getCotizacionById, updateCotizacion } from "../services/cotizacionesService";
import { addDaysToDateOnly, extractDateOnly, formatDateOnly } from "../utils/dateOnly";
import { formatCurrency } from "../utils/formatCurrency";
import { displayQuotationTotals } from "../utils/frontend-quotation-helpers";
import { generateCotizacionPDF } from "../utils/generatePDF";
import { isAdminRole } from "../utils/rolePermissions";

function toDateFormatted(d) {
  return formatDateOnly(d, "es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function toDateISO(d) {
  return extractDateOnly(d);
}

function clampDurationDays(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, Math.trunc(num));
}

function addDaysFromISO(startISO, daysToAdd) {
  return addDaysToDateOnly(startISO, daysToAdd);
}

function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function optionalNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function calculateIncomePercentage(value, income) {
  const amount = Number(value);
  const base = Number(income);

  if (!Number.isFinite(amount) || !Number.isFinite(base) || base <= 0) {
    return undefined;
  }

  return (amount / base) * 100;
}

function formatPercentage(value) {
  if (!Number.isFinite(Number(value))) {
    return "—";
  }

  return `${new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(Number(value))}%`;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getEstadoBadgeColor(estado) {
  return getQuotationStatusConfig(estado).badgeClass;
}

function getDisplayTipoLabel(tipo) {
  const t = String(tipo || "").toLowerCase();
  if (t === "platillo" || t === "platillos") return "Catering";
  return tipo || "Extra";
}

function extractTipoEvento(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    if (typeof value.nombre === "string") return value.nombre;
    if (typeof value.label === "string") return value.label;
    if (typeof value.value === "string") return value.value;
  }
  return "";
}

function resolveDisplayIvaPct(source) {
  const rawDirect = source?.ivaPorcentaje ?? source?.ivaPct ?? source?.ivaRate;
  const direct = Number(rawDirect);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  const breakdownIva = Number(source?.breakdown?.ivaMonto ?? source?.ivaMonto);
  if (Number.isFinite(breakdownIva) && breakdownIva === 0) {
    return 0;
  }

  return 16;
}

function resolveCotizacionEventIds(cotizacion) {
  return [
    cotizacion?.eventoId,
    cotizacion?.evento?._id,
    cotizacion?.evento?.id,
    cotizacion?.evento?.eventoId,
    cotizacion?.contrato?.eventoId,
    cotizacion?.detalleEvento?.eventoId,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
}

function resolveCotizacionEventNames(cotizacion) {
  return [cotizacion?.nombreEvento, cotizacion?.evento?.nombre, cotizacion?.eventoNombre]
    .map((value) => normalizeText(value))
    .filter(Boolean);
}

function resolveCompraTotal(compra) {
  if (Number.isFinite(Number(compra?.total))) {
    return Number(compra.total);
  }

  if (Number.isFinite(Number(compra?.monto))) {
    return Number(compra.monto);
  }

  if (Array.isArray(compra?.items)) {
    return compra.items.reduce((sum, item) => {
      const subtotal = Number(item?.subtotal);
      if (Number.isFinite(subtotal)) {
        return sum + subtotal;
      }

      return sum + n(item?.precioUnitario) * n(item?.cantidad);
    }, 0);
  }

  return 0;
}

function isCompraRelacionadaConEvento(compra, eventIds, eventNames) {
  const compraEventId = String(compra?.eventoId || "").trim();
  const compraEventName = normalizeText(compra?.eventoNombre);

  if (eventIds.length > 0 && compraEventId && eventIds.includes(compraEventId)) {
    return true;
  }

  if (eventNames.length > 0 && compraEventName && eventNames.includes(compraEventName)) {
    return true;
  }

  return false;
}

function DetailField({ label, value, className = "" }) {
  return (
    <div className={className}>
      <p className="mb-2 text-xs font-semibold uppercase text-[#64748B]">{label}</p>
      <p className="break-words text-sm font-medium text-[#111827]">{value || "-"}</p>
    </div>
  );
}

export default function CotizacionVer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth() || {};
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cotizacion, setCotizacion] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [closingEvento, setClosingEvento] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [comprasRelacionadas, setComprasRelacionadas] = useState([]);
  const [loadingComprasRelacionadas, setLoadingComprasRelacionadas] = useState(false);

  useEffect(() => {
    const loadCotizacion = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await getCotizacionById(id);
        setCotizacion(data);
      } catch (err) {
        logger.error("Error cargando cotización:", err);
        const msg = err?.response?.data?.msg || err?.message || "No se pudo cargar la cotización";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    if (id) loadCotizacion();
  }, [id]);

  useEffect(() => {
    if (!cotizacion) {
      setComprasRelacionadas([]);
      setLoadingComprasRelacionadas(false);
      return;
    }

    let cancelled = false;

    const loadComprasRelacionadas = async () => {
      setLoadingComprasRelacionadas(true);

      try {
        const response = await listCompras({
          tipoCompra: "evento",
          page: 1,
          pageSize: 500,
        });

        if (cancelled) {
          return;
        }

        const eventIds = resolveCotizacionEventIds(cotizacion);
        const eventNames = resolveCotizacionEventNames(cotizacion);
        const relacionadas = (response?.compras || []).filter((compra) =>
          isCompraRelacionadaConEvento(compra, eventIds, eventNames)
        );

        setComprasRelacionadas(relacionadas);
      } catch (err) {
        logger.error("Error cargando compras relacionadas del evento:", err);
        if (!cancelled) {
          setComprasRelacionadas([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingComprasRelacionadas(false);
        }
      }
    };

    loadComprasRelacionadas();

    return () => {
      cancelled = true;
    };
  }, [cotizacion]);

  const handleMarcarContratado = async () => {
    if (!id || updating) return;
    setUpdating(true);
    try {
      await updateCotizacion(id, { estado: "Contratado" });
      setCotizacion((prev) => ({ ...prev, estado: "Contratado" }));
    } catch (err) {
      logger.error("Error marcando como contratado:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] px-4 py-6 sm:px-6">
        <div className="text-center text-[#64748B]">Cargando cotización...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] px-4 py-6 sm:px-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] px-4 py-6 sm:px-6">
        <div className="text-center text-[#64748B]">No se encontró la cotización</div>
      </div>
    );
  }

  const subtotal = n(
    cotizacion?.subtotal ?? (cotizacion?.items || []).reduce((acc, item) => acc + n(item.precio) * n(item.cantidad), 0)
  );
  const descuento = n(cotizacion?.descuentoTotal ?? cotizacion?.descuento);
  const ivaPct = resolveDisplayIvaPct(cotizacion);
  const iva = n(cotizacion?.ivaMonto ?? 0);
  const total = n(cotizacion?.total ?? 0);
  const anticipo = n(cotizacion?.anticipo);
  const invitadosTotal = n(cotizacion?.invitadosAdultos) + n(cotizacion?.invitadosNinos);

  const numberOfDays = clampDurationDays(cotizacion?.eventDurationDays ?? cotizacion?.breakdown?.numberOfDays ?? 1);
  const eventStartISO = toDateISO(cotizacion?.eventStartDate || cotizacion?.fechaEvento);
  const eventEndISO = toDateISO(cotizacion?.eventEndDate) || addDaysFromISO(eventStartISO, numberOfDays - 1);
  const eventDateLabel =
    numberOfDays >= 2
      ? `del ${toDateFormatted(eventStartISO)} al ${toDateFormatted(eventEndISO)}`
      : toDateFormatted(eventStartISO || cotizacion?.fechaEvento);

  const breakdown = cotizacion?.breakdown || {};
  const isAdmin = isAdminRole(user);
  const eventoCerrado = cotizacion?.eventoCerrado === true;
  const saldoPendiente = n(cotizacion?.saldoPendiente ?? cotizacion?.saldo ?? 0);
  const porcentajePagado = optionalNumber(cotizacion?.porcentajePagado);
  const estaPagadaAl100 = cotizacion?.estaPagadaAl100 === true || saldoPendiente <= 0;
  const puedeCerrarEvento = cotizacion?.puedeCerrarEvento === true && estaPagadaAl100 && saldoPendiente <= 0;
  const cierreBloqueadoMotivo = String(
    cotizacion?.motivoNoPuedeCerrarEvento ||
      (saldoPendiente > 0 ? "Para cerrar el evento, la cotización debe estar pagada al 100%." : "")
  ).trim();
  const cierreDisponible = isAdmin && normalizeQuotationStatus(cotizacion?.estado) === "Contratado" && !eventoCerrado;
  const cierreBadgeText = eventoCerrado ? "Evento cerrado" : cotizacion?.estadoOperativoEvento || "Evento activo";
  const fechaCierreEventoLabel = cotizacion?.fechaCierreEvento ? toDateFormatted(cotizacion.fechaCierreEvento) : "";
  const cerradoPorRaw = cotizacion?.cerradoPor;
  const cerradoPorLabel = typeof cerradoPorRaw === "object" && cerradoPorRaw
    ? String(cerradoPorRaw?.nombre || cerradoPorRaw?.email || "").trim()
    : "";
  const totalsDisplay = displayQuotationTotals(cotizacion);
  if (totalsDisplay?.hasErrors) {
    logger.warn("[CotizacionVer] Quotation totals validation failed", {
      folio: cotizacion?.folio,
      id: cotizacion?._id,
      errors: totalsDisplay.errors,
    });
  }

  const subtotalOneDay = n(breakdown?.subtotalOneDay ?? subtotal);
  const subtotalByDays = n(breakdown?.subtotalByDays ?? subtotalOneDay * numberOfDays);
  const breakdownDescuento = n(cotizacion?.descuentoTotal ?? breakdown?.descuentoTotal ?? descuento);
  const breakdownIva = n(cotizacion?.ivaMonto ?? breakdown?.ivaMonto ?? iva);
  const breakdownTotal = n(cotizacion?.total ?? breakdown?.total ?? total);
  const breakdownSaldo = Math.max(0, breakdownTotal - anticipo);
  const comprasEventoFallback = comprasRelacionadas.reduce((sum, compra) => sum + resolveCompraTotal(compra), 0);
  const comprasEventoBackend = optionalNumber(cotizacion?.totalComprasEvento);
  const gastosOperativosEvento = optionalNumber(cotizacion?.totalGastosOperativosEvento);
  const egresosTotalesEvento = optionalNumber(cotizacion?.egresosTotalesEvento);
  const comprasEventoTotal = comprasEventoBackend ?? comprasEventoFallback;
  const utilidadEventoBackend = optionalNumber(cotizacion?.utilidadEvento);
  const utilidadEventoCompat = optionalNumber(cotizacion?.utilidadEventoReal);
  const utilidadEventoFallback = breakdownTotal - comprasEventoTotal;
  const utilidadEvento = utilidadEventoBackend ?? utilidadEventoCompat ?? utilidadEventoFallback;
  const egresosTotalesDisplay = egresosTotalesEvento ?? (
    gastosOperativosEvento !== undefined ? comprasEventoTotal + gastosOperativosEvento : undefined
  );
  const comprasEventoHelper = loadingComprasRelacionadas
    ? "Actualizando compras relacionadas..."
    : comprasEventoTotal > 0
      ? `${comprasRelacionadas.length} registro${comprasRelacionadas.length === 1 ? "" : "s"} relacionado${comprasRelacionadas.length === 1 ? "" : "s"}`
      : "Sin compras registradas";
  const ingresosPercentageLabel = breakdownTotal > 0 ? "100.0% del total cotizado" : "—";
  const porcentajeCompras = calculateIncomePercentage(comprasEventoTotal, breakdownTotal);
  const porcentajeGastosOperativos = calculateIncomePercentage(gastosOperativosEvento, breakdownTotal);
  const porcentajeEgresos = calculateIncomePercentage(egresosTotalesDisplay, breakdownTotal);
  const porcentajeUtilidad = calculateIncomePercentage(utilidadEvento, breakdownTotal);
  const gastosOperativosLabel = gastosOperativosEvento !== undefined
    ? formatCurrency(gastosOperativosEvento)
    : "No disponible";
  const egresosTotalesLabel = egresosTotalesDisplay !== undefined
    ? formatCurrency(egresosTotalesDisplay)
    : "No disponible";
  const utilidadToneClasses = utilidadEvento >= 0
    ? {
        surface: "border-emerald-200 bg-emerald-50/90",
        label: "text-emerald-700",
        value: "text-emerald-800",
      }
    : {
        surface: "border-red-200 bg-red-50/90",
        label: "text-red-700",
        value: "text-red-800",
      };
  const hasEgresosBreakdown = egresosTotalesDisplay !== undefined || gastosOperativosEvento !== undefined || comprasEventoTotal > 0;

  const handleCloseEvento = async () => {
    if (!id || closingEvento || !cierreDisponible || !puedeCerrarEvento) {
      return;
    }

    try {
      setClosingEvento(true);
      setError("");
      const updatedCotizacion = await cerrarEventoCotizacion(id);
      setCotizacion(updatedCotizacion);
      setCloseDialogOpen(false);
    } catch (err) {
      logger.error("Error closing event:", err);
      const status = Number(err?.response?.status || 0);
      if (status === 403) {
        setError("No tienes permisos para cerrar este evento.");
      } else if (status === 404) {
        setError("No se encontró la cotización o ya no está disponible.");
      } else if (status === 400) {
        setError(err?.response?.data?.msg || err?.response?.data?.message || "No se pudo cerrar el evento.");
      } else {
        setError(err?.response?.data?.msg || err?.response?.data?.message || "No se pudo cerrar el evento. Intenta de nuevo.");
      }
    } finally {
      setClosingEvento(false);
    }
  };

  return (
    <div className="min-h-screen min-w-0 bg-[#F4F6F9]">
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#64748B]">
            <button onClick={() => navigate("/cotizaciones")} className="transition hover:text-[#111827]">
              Cotizaciones
            </button>
            <ChevronRight size={16} />
            <span className="font-medium text-[#111827]">Detalle</span>
          </div>

          <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-2xl font-bold text-[#111827] sm:text-3xl">
                {cotizacion?.folio || "Cotización"}
              </h1>
              <p className="mt-1 break-words text-base text-[#64748B] sm:text-lg">
                {cotizacion?.nombreEvento || "Sin nombre"}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold ${eventoCerrado ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
                  {cierreBadgeText}
                </span>
                {eventoCerrado && fechaCierreEventoLabel ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                    Cerrado el: {fechaCierreEventoLabel}
                  </span>
                ) : null}
                {eventoCerrado && cerradoPorLabel ? (
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700">
                    Cerrado por: {cerradoPorLabel}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end lg:w-auto lg:max-w-[22rem] lg:flex-nowrap">
              {cierreDisponible ? (
                puedeCerrarEvento ? (
                  <button
                    type="button"
                    onClick={() => setCloseDialogOpen(true)}
                    disabled={closingEvento}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition-colors hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:whitespace-nowrap"
                  >
                    {closingEvento ? "Cerrando..." : "Cerrar evento"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={cierreBloqueadoMotivo || "No es posible cerrar este evento por ahora."}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-500 shadow-sm sm:w-auto sm:whitespace-nowrap"
                  >
                    Cerrar evento
                  </button>
                )
              ) : null}
              <button
                onClick={() => generateCotizacionPDF(cotizacion)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8] sm:w-auto sm:whitespace-nowrap"
              >
                <FileText size={16} />
                Descargar PDF
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex w-full items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-[#111827] transition hover:bg-slate-100 sm:w-auto sm:px-3">
                    <span className="sm:hidden">Más acciones</span>
                    <MoreVertical size={20} className="text-[#64748B]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={4}
                    className="z-50 min-w-[180px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold uppercase text-[#64748B]">
                      Acciones
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-200" />
                    <DropdownMenuItem
                      onSelect={() => navigate(`/cotizaciones/${id}`)}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <FileEdit size={14} /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        getCotizacionById(id).then((cot) => {
                          navigate("/cotizaciones/nueva", { state: { duplicatedFrom: cot, isDuplicate: true } });
                        });
                      }}
                      className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50"
                    >
                      <Copy size={14} /> Duplicar
                    </DropdownMenuItem>
                    {cotizacion?.estado !== "Contratado" && (
                      <>
                        <DropdownMenuSeparator className="bg-slate-200" />
                        <DropdownMenuItem
                          onSelect={handleMarcarContratado}
                          disabled={updating}
                          className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                        >
                          ✓ Marcar como contratado
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenuPortal>
              </DropdownMenu>
            </div>
          </div>

          {!eventoCerrado && cierreDisponible && !puedeCerrarEvento && cierreBloqueadoMotivo ? (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {cierreBloqueadoMotivo}
            </div>
          ) : null}

          {eventoCerrado ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Este evento ya fue cerrado. No se pueden registrar nuevos movimientos financieros.
            </div>
          ) : null}

          <div className="flex flex-wrap items-start gap-2 sm:items-center sm:gap-3">
            <span className={`max-w-full break-words rounded-full border px-3 py-1.5 text-xs font-semibold ${getEstadoBadgeColor(cotizacion?.estado)}`}>
              {normalizeQuotationStatus(cotizacion?.estado) || "Cotizado"}
            </span>
            <span className="flex max-w-full items-center gap-1.5 break-words rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              📅 {eventDateLabel}
            </span>
            <span className="flex max-w-full items-center gap-1.5 break-words rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
              👥 {invitadosTotal} invitados
            </span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:py-8">
        <div className="grid grid-cols-1 gap-4 lg:gap-6 xl:grid-cols-12 xl:items-start">
          <div className="min-w-0 space-y-4 sm:space-y-6 xl:col-span-8 2xl:col-span-9">
            <FormSection title="Cliente" contentClassName="space-y-4">
              <FieldGrid columns={2}>
                <DetailField label="Nombre" value={cotizacion?.cliente?.nombre || "-"} />
                <DetailField label="Teléfono" value={cotizacion?.cliente?.telefono || "-"} />
                <DetailField label="Email" value={cotizacion?.cliente?.email || "-"} className="md:col-span-2" />
              </FieldGrid>
            </FormSection>

            <FormSection title="Evento">
              <FieldGrid columns={2}>
                <DetailField label="Tipo de evento" value={extractTipoEvento(cotizacion?.tipoEvento) || "-"} />
                <DetailField label="Fecha del evento" value={eventDateLabel} />
                <DetailField label="Duración" value={`${numberOfDays} día${numberOfDays === 1 ? "" : "s"}`} />
                <DetailField label="Horario" value={`${cotizacion?.horaInicio || "-"} - ${cotizacion?.horaFin || "-"}`} />
                <DetailField label="Invitados" value={invitadosTotal} />
                {cotizacion?.direccion ? (
                  <DetailField label="Dirección" value={cotizacion.direccion} className="md:col-span-2" />
                ) : null}
              </FieldGrid>
            </FormSection>

            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-5 sm:px-6">
                <h2 className="text-lg font-semibold text-[#111827]">Resumen financiero del evento</h2>
                <p className="mt-1 text-sm text-[#64748B]">
                  Resumen de ingresos, egresos y utilidad estimada del evento.
                </p>
              </div>

              <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Ingresos</p>
                    <p className="mt-2 text-2xl font-bold text-[#111827] sm:text-3xl">{formatCurrency(breakdownTotal)}</p>
                    <p className="mt-1 text-xs text-[#64748B]">Total cotizado del evento</p>
                    <p className="mt-2 text-xs font-medium text-[#475569]">{ingresosPercentageLabel}</p>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Egresos</p>
                    <p className="mt-2 text-2xl font-bold text-amber-800 sm:text-3xl">{egresosTotalesLabel}</p>
                    <p className="mt-1 text-xs text-amber-700">Compras y gastos operativos del evento</p>
                    <p className="mt-2 text-xs font-medium text-amber-700">{formatPercentage(porcentajeEgresos)} de los ingresos</p>
                  </div>

                  <div className={`rounded-2xl border px-4 py-4 sm:px-5 ${utilidadToneClasses.surface}`}>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${utilidadToneClasses.label}`}>Utilidad del evento</p>
                    <p className={`mt-2 text-3xl font-bold sm:text-4xl ${utilidadToneClasses.value}`}>{formatCurrency(utilidadEvento)}</p>
                    <p className={`mt-1 text-sm ${utilidadToneClasses.label}`}>Ingresos menos egresos del evento</p>
                    <p className={`mt-2 text-xs font-semibold ${utilidadToneClasses.label}`}>{formatPercentage(porcentajeUtilidad)} del total cotizado</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(18rem,0.9fr)] lg:items-start">
                  <div className="rounded-2xl border border-slate-200 bg-white">
                    <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
                      <h3 className="text-sm font-semibold text-[#111827]">Desglose de egresos</h3>
                    </div>

                    <div className="space-y-3 px-4 py-4 sm:px-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-sm text-[#475569]">Compras del evento</p>
                          <p className="mt-1 text-xs text-[#94A3B8]">{comprasEventoHelper}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-semibold text-[#111827]">{formatCurrency(comprasEventoTotal)}</p>
                          <p className="mt-1 text-xs text-[#64748B]">{formatPercentage(porcentajeCompras)} de los ingresos</p>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4 border-t border-slate-100 pt-3">
                        <div className="min-w-0">
                          <p className="text-sm text-[#475569]">Gastos operativos</p>
                          <p className="mt-1 text-xs text-[#94A3B8]">
                            {gastosOperativosEvento !== undefined ? "Gastos operativos registrados para este evento" : "Aun no hay un desglose disponible"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-base font-semibold text-[#111827]">{gastosOperativosLabel}</p>
                          <p className="mt-1 text-xs text-[#64748B]">{formatPercentage(porcentajeGastosOperativos)} de los ingresos</p>
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-4 border-t border-slate-200 pt-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#111827]">Egresos totales</p>
                          <p className="mt-1 text-xs text-[#94A3B8]">Compras del evento más gastos operativos</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-lg font-bold text-[#111827]">{egresosTotalesLabel}</p>
                          <p className="mt-1 text-xs font-medium text-[#475569]">{formatPercentage(porcentajeEgresos)} de los ingresos</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:px-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Lectura rápida</p>
                    <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#475569]">
                      <span>Ingresos</span>
                      <span className="font-semibold text-[#111827]">{formatCurrency(breakdownTotal)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm text-[#475569]">
                      <span>Egresos</span>
                      <span className="font-semibold text-[#111827]">{egresosTotalesLabel}</span>
                    </div>
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[#111827]">Resultado estimado</span>
                        <span className={`text-lg font-bold ${utilidadToneClasses.value}`}>{formatCurrency(utilidadEvento)}</span>
                      </div>
                      <p className="mt-2 text-xs font-medium text-[#475569]">{formatPercentage(porcentajeUtilidad)} del total cotizado</p>
                      <p className="mt-2 text-xs text-[#64748B]">La utilidad refleja el comportamiento financiero actual del evento.</p>
                    </div>
                  </div>
                </div>

                {!hasEgresosBreakdown ? (
                  <p className="text-xs text-[#64748B]">Aun no hay egresos registrados para este evento.</p>
                ) : null}
              </div>
            </section>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-lg font-semibold text-[#111827]">Servicios</h2>
              {(cotizacion?.items || []).length === 0 ? (
                <div className="rounded-xl border border-slate-200 px-4 py-8 text-center text-sm text-[#64748B]">
                  No hay servicios agregados
                </div>
              ) : (
                <>
                  <div className="space-y-4 lg:hidden">
                    {(cotizacion?.items || []).map((item, idx) => {
                      const precio = n(item.precio);
                      const cantidad = n(item.cantidad);
                      const totalItem = precio * cantidad;

                      return (
                        <article key={idx} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
                                  {getDisplayTipoLabel(item?.tipo)}
                                </span>
                                <h3 className="break-words text-sm font-semibold text-[#111827]">
                                  {item?.nombre || "-"}
                                </h3>
                              </div>
                            </div>
                            <div className="min-w-[5.5rem] shrink-0 text-right">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Total</p>
                              <p className="mt-1 text-lg font-bold text-[#111827]">
                                ${totalItem.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Precio</p>
                              <p className="mt-1 text-sm font-medium text-[#111827]">
                                ${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Cantidad</p>
                              <p className="mt-1 text-sm font-medium text-[#111827]">{cantidad}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Importe</p>
                              <p className="mt-1 text-sm font-medium text-[#111827]">
                                ${totalItem.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>

                  <div className="hidden overflow-x-auto rounded-xl border border-slate-200 lg:block">
                    <table className="min-w-full text-sm">
                      <thead className="border-b border-slate-200 bg-slate-50">
                        <tr>
                          <th className="w-2/5 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            Concepto
                          </th>
                          <th className="w-1/5 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            Precio
                          </th>
                          <th className="w-1/5 px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            Cantidad
                          </th>
                          <th className="w-1/5 px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748B]">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(cotizacion?.items || []).map((item, idx) => {
                          const precio = n(item.precio);
                          const cantidad = n(item.cantidad);
                          const totalItem = precio * cantidad;

                          return (
                            <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <span className="inline-block rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                                    {getDisplayTipoLabel(item?.tipo)}
                                  </span>
                                  <span className="text-sm font-semibold text-[#111827]">{item?.nombre || "-"}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-right text-sm font-medium text-[#111827]">
                                ${precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </td>
                              <td className="px-4 py-4 text-center text-sm text-[#111827]">{cantidad}</td>
                              <td className="px-4 py-4 text-right text-sm font-bold text-[#111827]">
                                ${totalItem.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            {(cotizacion?.notas || cotizacion?.observaciones) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-[#111827]">Notas y Observaciones</h2>
                {cotizacion?.notas && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase text-[#64748B]">Notas Internas</p>
                    <p className="break-words whitespace-pre-wrap text-sm text-[#111827]">{cotizacion.notas}</p>
                  </div>
                )}
                {cotizacion?.observaciones && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-[#64748B]">Observaciones para el Cliente</p>
                    <p className="break-words whitespace-pre-wrap text-sm text-[#111827]">{cotizacion.observaciones}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 xl:col-span-4 2xl:col-span-3">
            <div className="space-y-4 sm:space-y-6 xl:sticky xl:top-28">
              <ResponsiveFinancialSummary
                title="Resumen Financiero"
                variant="stacked"
                className="min-w-0"
                primaryLabel="Total"
                primaryValue={
                  <span className="text-[#2563EB]">
                    ${breakdownTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </span>
                }
                lines={[
                  {
                    key: "subtotal-one-day",
                    label: "Subtotal",
                    value: `$${subtotalOneDay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                  },
                  ...(numberOfDays >= 2
                    ? [
                        {
                          key: "number-of-days",
                          label: "Número de días",
                          value: numberOfDays,
                        },
                        {
                          key: "subtotal-by-days",
                          label: `Subtotal × ${numberOfDays}`,
                          value: `$${subtotalByDays.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                        },
                      ]
                    : []),
                  ...(breakdownDescuento > 0
                    ? [
                        {
                          key: "breakdown-descuento",
                          label: "Descuento",
                          value: `-$${breakdownDescuento.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                          tone: "danger",
                        },
                      ]
                    : []),
                  {
                    key: "breakdown-iva",
                    label: `IVA (${ivaPct}%)`,
                    value: `$${breakdownIva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                    helperText: cotizacion?.incluyeIva ? "* Precios ya incluyen IVA" : undefined,
                  },
                ]}
              />

              <ResponsiveFinancialSummary
                title="Cobros"
                variant="stacked"
                className="min-w-0"
                primaryLabel="Saldo Pendiente"
                primaryValue={`$${breakdownSaldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                lines={[
                  {
                    key: "anticipo-recibido",
                    label: "Anticipo Recibido",
                    value: `$${anticipo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`,
                    tone: anticipo > 0 ? "success" : undefined,
                  },
                ]}
                actions={
                  cotizacion?.estado === "Cotizado" && breakdownSaldo > 0 && !eventoCerrado
                    ? [
                        {
                          key: "registrar-pago",
                          label: "+ Registrar Pago",
                          className: "border-blue-200 text-blue-700 hover:bg-blue-50",
                        },
                      ]
                    : []
                }
              />

              {totalsDisplay?.hasErrors && (
                <div className="rounded-2xl border border-red-200 bg-white p-4 shadow-sm">
                  <QuotationTotals quotation={cotizacion} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <AppConfirmDialog
        open={closeDialogOpen}
        onOpenChange={setCloseDialogOpen}
        title="Cerrar evento"
        message="Al cerrar este evento ya no se podrán registrar nuevos pagos, compras ni gastos operativos relacionados. El evento seguirá visible en reportes e historial."
        confirmLabel="Sí, cerrar evento"
        cancelLabel="Cancelar"
        onConfirm={handleCloseEvento}
        loading={closingEvento}
        confirmButtonClassName="bg-emerald-600 hover:bg-emerald-700"
      />
    </div>
  );
}
