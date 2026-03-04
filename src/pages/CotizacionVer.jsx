import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getCotizacionById } from "../services/cotizacionesService";
import { updateCotizacion } from "../services/cotizacionesService";
import { ChevronRight, FileText, MoreVertical, Eye, FileEdit, Copy } from "lucide-react";
import { generateCotizacionPDF } from "../utils/generatePDF";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuPortal,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "@radix-ui/react-dropdown-menu";
import { logger } from "../lib/logger";
function toDateFormatted(d) {
  if (!d) return "-";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "-";
    return dt.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return "-";
  }
}

function toDateISO(d) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (Number.isNaN(dt.getTime())) return "";
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function clampDurationDays(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 1;
  return Math.max(1, Math.trunc(num));
}

function addDaysFromISO(startISO, daysToAdd) {
  if (!startISO) return "";
  try {
    const dt = new Date(`${startISO}T00:00:00`);
    if (Number.isNaN(dt.getTime())) return "";
    dt.setDate(dt.getDate() + Math.max(0, daysToAdd));
    return dt.toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function n(v) {
  const num = Number(v);
  return Number.isFinite(num) ? num : 0;
}

function round2(x) {
  return Math.round((n(x) + Number.EPSILON) * 100) / 100;
}

function getEstadoBadgeColor(estado) {
  switch (estado) {
    case "Contratado":
      return "bg-emerald-100 text-emerald-800 border-emerald-300";
    case "Cotizado":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "Cancelado":
      return "bg-slate-100 text-slate-800 border-slate-300";
    default:
      return "bg-slate-100 text-slate-800 border-slate-300";
  }
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
  const direct = n(source?.ivaPorcentaje ?? source?.ivaPct ?? source?.ivaRate);
  if (direct >= 0) return direct;

  const breakdownIva = Number(source?.breakdown?.ivaMonto ?? source?.ivaMonto);
  if (Number.isFinite(breakdownIva) && breakdownIva === 0 && source?.incluyeIva === false) {
    return 0;
  }

  return 16;
}

export default function CotizacionVer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cotizacion, setCotizacion] = useState(null);
  const [updating, setUpdating] = useState(false);

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

  const handleMarcarContratado = async () => {
    if (!id || updating) return;
    setUpdating(true);
    try {
      await updateCotizacion(id, { estado: "Contratado" });
      setCotizacion(prev => ({ ...prev, estado: "Contratado" }));
    } catch (err) {
      logger.error("Error marcando como contratado:", err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] p-6">
        <div className="text-center text-[#64748B]">Cargando cotización...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] p-6">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="min-h-screen bg-[#F4F6F9] p-6">
        <div className="text-center text-[#64748B]">No se encontró la cotización</div>
      </div>
    );
  }

  // Cálculos legacy/fallback
  const subtotal = (cotizacion?.items || []).reduce((acc, item) => acc + n(item.precio) * n(item.cantidad), 0);
  const descuento = n(cotizacion?.descuento);
  const base = Math.max(0, subtotal - descuento);
  const ivaPct = resolveDisplayIvaPct(cotizacion);
  const ivaRate = n(ivaPct) / 100;
  
  let iva = 0;
  let total = 0;
  if (cotizacion?.incluyeIva) {
    total = base;
    iva = ivaRate > 0 ? round2(base * ivaRate / (1 + ivaRate)) : 0;
  } else {
    iva = round2(base * ivaRate);
    total = base + iva;
  }
  
  const anticipo = n(cotizacion?.anticipo);
  const saldo = total - anticipo;
  const invitadosTotal = n(cotizacion?.invitadosAdultos) + n(cotizacion?.invitadosNinos);

  const numberOfDays = clampDurationDays(cotizacion?.eventDurationDays ?? cotizacion?.breakdown?.numberOfDays ?? 1);
  const eventStartISO = toDateISO(cotizacion?.eventStartDate || cotizacion?.fechaEvento);
  const eventEndISO = toDateISO(cotizacion?.eventEndDate) || addDaysFromISO(eventStartISO, numberOfDays - 1);
  const eventDateLabel =
    numberOfDays >= 2
      ? `del ${toDateFormatted(eventStartISO)} al ${toDateFormatted(eventEndISO)}`
      : toDateFormatted(eventStartISO || cotizacion?.fechaEvento);

  const breakdown = cotizacion?.breakdown || {};
  const subtotalOneDay = n(breakdown?.subtotalOneDay ?? subtotal);
  const subtotalByDays = n(breakdown?.subtotalByDays ?? (subtotalOneDay * numberOfDays));
  const breakdownDescuento = n(breakdown?.descuentoTotal ?? descuento);
  const breakdownIva = n(breakdown?.ivaMonto ?? iva);
  const breakdownTotal = n(breakdown?.total ?? total);
  const breakdownSaldo = Math.max(0, breakdownTotal - anticipo);

  return (
    <div className="min-h-screen bg-[#F4F6F9]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-[#64748B] mb-4">
            <button onClick={() => navigate("/cotizaciones")} className="hover:text-[#111827] transition">Cotizaciones</button>
            <ChevronRight size={16} />
            <span className="text-[#111827] font-medium">Detalle</span>
          </div>

          {/* Título y subtítulo */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-[#111827]">{cotizacion?.folio || "Cotización"}</h1>
              <p className="text-lg text-[#64748B] mt-1">{cotizacion?.nombreEvento || "Sin nombre"}</p>
            </div>

            {/* Acciones derecha */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => generateCotizacionPDF(cotizacion)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors text-sm font-medium shadow-sm whitespace-nowrap"
              >
                <FileText size={16} />
                Descargar PDF
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 rounded-lg hover:bg-slate-100 transition">
                    <MoreVertical size={20} className="text-[#64748B]" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuContent align="end" sideOffset={4} className="z-50 min-w-[180px] bg-white border border-slate-200 rounded-lg shadow-lg py-1">
                    <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold uppercase text-[#64748B]">Acciones</DropdownMenuLabel>
                    <DropdownMenuSeparator className="bg-slate-200" />
                    <DropdownMenuItem 
                      onSelect={() => navigate(`/cotizaciones/${id}`)}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm"
                    >
                      <FileEdit size={14} /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onSelect={() => {
                        getCotizacionById(id).then((cot) => {
                          navigate("/cotizaciones/nueva", { state: { duplicatedFrom: cot, isDuplicate: true } });
                        });
                      }}
                      className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-50 text-sm"
                    >
                      <Copy size={14} /> Duplicar
                    </DropdownMenuItem>
                    {cotizacion?.estado !== "Contratado" && (
                      <>
                        <DropdownMenuSeparator className="bg-slate-200" />
                        <DropdownMenuItem 
                          onSelect={handleMarcarContratado}
                          disabled={updating}
                          className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-emerald-50 text-sm text-emerald-700"
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

          {/* Chips informativos */}
          <div className="flex flex-wrap items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${getEstadoBadgeColor(cotizacion?.estado)}`}>
              {cotizacion?.estado || "Cotizado"}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
              📅 {eventDateLabel}
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-700 rounded-full text-xs font-medium border border-slate-200">
              👥 {invitadosTotal} invitados
            </span>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna principal */}
          <div className="lg:col-span-2 space-y-6">
            {/* Cliente */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-6">Cliente</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-semibold text-[#111827] mb-1">{cotizacion?.cliente?.nombre || "-"}</p>
                  <div className="flex flex-col gap-1 text-sm text-[#64748B]">
                    {cotizacion?.cliente?.telefono && <p>📞 {cotizacion.cliente.telefono}</p>}
                    {cotizacion?.cliente?.email && <p>✉️ {cotizacion.cliente.email}</p>}
                  </div>
                </div>
              </div>
            </div>

            {/* Datos del evento */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-6">Evento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Tipo de evento</p>
                  <p className="text-sm text-[#111827] font-medium">{extractTipoEvento(cotizacion?.tipoEvento) || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Fecha del evento</p>
                  <p className="text-sm text-[#111827] font-medium">{eventDateLabel}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Duración</p>
                  <p className="text-sm text-[#111827] font-medium">{numberOfDays} día{numberOfDays === 1 ? "" : "s"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Horario</p>
                  <p className="text-sm text-[#111827] font-medium">{cotizacion?.horaInicio || "-"} - {cotizacion?.horaFin || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Invitados</p>
                  <p className="text-sm text-[#111827] font-medium">{invitadosTotal}</p>
                </div>
                {cotizacion?.direccion && (
                  <div className="md:col-span-2">
                    <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Dirección</p>
                    <p className="text-sm text-[#111827] font-medium">{cotizacion.direccion}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Servicios */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-[#111827] mb-6">Servicios</h2>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[#64748B] w-2/5">Concepto</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748B] w-1/5">Precio</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-[#64748B] w-1/5">Cantidad</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-[#64748B] w-1/5">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(cotizacion?.items || []).length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-[#64748B] py-8 text-sm">No hay servicios agregados</td>
                      </tr>
                    )}
                    {(cotizacion?.items || []).map((item, idx) => {
                      const precio = n(item.precio);
                      const cantidad = n(item.cantidad);
                      const totalItem = precio * cantidad;
                      
                      return (
                        <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-xs font-medium">{getDisplayTipoLabel(item?.tipo)}</span>
                              <span className="text-sm font-semibold text-[#111827]">{item?.nombre || "-"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-[#111827] font-medium">
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
            </div>

            {/* Notas */}
            {(cotizacion?.notas || cotizacion?.observaciones) && (
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-[#111827] mb-4">Notas y Observaciones</h2>
                {cotizacion?.notas && (
                  <div className="mb-4">
                    <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Notas Internas</p>
                    <p className="text-sm text-[#111827] whitespace-pre-wrap">{cotizacion.notas}</p>
                  </div>
                )}
                {cotizacion?.observaciones && (
                  <div>
                    <p className="text-xs text-[#64748B] uppercase font-semibold mb-2">Observaciones para el Cliente</p>
                    <p className="text-sm text-[#111827] whitespace-pre-wrap">{cotizacion.observaciones}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar derecho - Resumen */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 space-y-6">
              {/* Resumen Financiero */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-[#111827] mb-6">Resumen Financiero</h2>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">Subtotal</span>
                    <span className="font-medium text-[#111827]">${subtotalOneDay.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {numberOfDays >= 2 && (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">Número de días</span>
                        <span className="font-medium text-[#111827]">{numberOfDays}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-[#64748B]">Subtotal × {numberOfDays}</span>
                        <span className="font-medium text-[#111827]">${subtotalByDays.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}
                  {breakdownDescuento > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[#64748B]">Descuento</span>
                      <span className="font-medium text-red-600">-${breakdownDescuento.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm pb-3">
                    <span className="text-[#64748B]">IVA ({ivaPct}%)</span>
                    <span className="font-medium text-[#111827]">${breakdownIva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {cotizacion?.incluyeIva && (
                    <p className="text-xs text-[#64748B] italic pb-2">* Precios ya incluyen IVA</p>
                  )}
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-[#111827]">Total</span>
                      <span className="text-2xl font-bold text-[#2563EB]">${breakdownTotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Cobros */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-[#111827] mb-6">Cobros</h2>
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[#64748B]">Anticipo Recibido</span>
                    <span className={`font-medium ${anticipo > 0 ? "text-green-600" : "text-[#64748B]"}`}>
                      ${anticipo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-[#111827]">Saldo Pendiente</span>
                      <span className="text-lg font-bold text-[#111827]">${breakdownSaldo.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {cotizacion?.estado === "Cotizado" && breakdownSaldo > 0 && (
                  <button className="w-full mt-4 px-4 py-2.5 border border-[#2563EB] text-[#2563EB] rounded-lg hover:bg-[#2563EB]/5 transition text-sm font-medium">
                    + Registrar Pago
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
