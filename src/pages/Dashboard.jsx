import { logger } from "../lib/logger";
// src/pages/Dashboard.jsx

import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import esLocale from "@fullcalendar/core/locales/es";
import { listCotizacionesPage } from "../services/cotizacionesService";
import { getDashboardKPIs } from "../services/kpisService";
import { addDaysToDateOnly, extractDateOnly, toLocalDateOnly } from "../utils/dateOnly";
import { Calendar, TrendingUp, CheckCircle, FileText, Loader } from "lucide-react";
import { getQuotationStatusConfig, normalizeQuotationStatus } from "../constants/quotationStatus";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getViewportSize() {
  if (typeof window === "undefined") {
    return { width: 1280, height: 900 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function getInitialCalendarRange() {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  return {
    fechaInicio: toLocalDateOnly(start),
    fechaFin: toLocalDateOnly(end),
  };
}

function normalizeTimeHHMM(value) {
  if (!value) return "";

  const raw = String(value).trim();
  if (!raw) return "";

  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  const isoTimeMatch = raw.match(/T(\d{2}):(\d{2})/);
  if (isoTimeMatch) {
    return `${isoTimeMatch[1]}:${isoTimeMatch[2]}`;
  }

  return "";
}

function buildCalendarDateTime(dateOnly, time) {
  if (!dateOnly) return "";
  const normalizedTime = normalizeTimeHHMM(time);
  return normalizedTime ? `${dateOnly}T${normalizedTime}:00` : dateOnly;
}

function buildDashboardCalendarEvent(cotizacion) {
  const durationDays = Math.max(
    1,
    Number(cotizacion?.eventDurationDays ?? cotizacion?.duracionDias ?? cotizacion?.duracion ?? 1) || 1
  );
  const startYmd = extractDateOnly(cotizacion?.eventStartDate || cotizacion?.fechaEvento);
  if (!startYmd) {
    return null;
  }

  const endYmd = cotizacion?.eventEndDate
    ? extractDateOnly(cotizacion.eventEndDate) || startYmd
    : addDaysToDateOnly(startYmd, durationDays - 1) || startYmd;
  const horaInicio = normalizeTimeHHMM(cotizacion?.horaInicio) || normalizeTimeHHMM(cotizacion?.eventStartDate) || "09:00";
  const horaFin = normalizeTimeHHMM(cotizacion?.horaFin) || normalizeTimeHHMM(cotizacion?.eventEndDate) || "10:00";
  const start = buildCalendarDateTime(startYmd, horaInicio);
  const end = buildCalendarDateTime(endYmd || startYmd, horaFin);

  if (!start || !end) {
    return null;
  }

  const numPersonas = Number(cotizacion?.invitadosAdultos || 0) + Number(cotizacion?.invitadosNinos || 0);
  const nombreCliente = cotizacion?.cliente?.nombre || cotizacion?.clienteId?.nombre || cotizacion?.clienteId || "Cliente desconocido";
  const normalizedEstado = normalizeQuotationStatus(cotizacion?.estado);
  const statusConfig = getQuotationStatusConfig(normalizedEstado);
  const eventoCerrado = cotizacion?.eventoCerrado === true;
  const estadoOperativoEvento = cotizacion?.estadoOperativoEvento || (eventoCerrado ? "Evento cerrado" : "Evento activo");

  return {
    id: cotizacion?._id,
    title: cotizacion?.nombreEvento || "Evento sin nombre",
    start,
    end,
    allDay: false,
    backgroundColor: eventoCerrado ? "#334155" : statusConfig.calendarBackgroundColor,
    borderColor: eventoCerrado ? "#1e293b" : statusConfig.calendarBorderColor,
    textColor: "#ffffff",
    extendedProps: {
      folio: cotizacion?.folio,
      cliente: nombreCliente,
      estado: normalizedEstado,
      eventoCerrado,
      estadoOperativoEvento,
      numPersonas,
      horaInicio: cotizacion?.horaInicio || horaInicio,
      durationDays,
      eventEndDate: endYmd,
    },
  };
}

async function listCalendarCotizaciones(fechaInicio, fechaFin) {
  const collected = [];
  let currentPage = 1;
  let totalPages = 1;

  do {
    const response = await listCotizacionesPage({
      page: currentPage,
      pageSize: 100,
      fechaInicio,
      fechaFin,
      sortBy: "fechaEvento",
      sortOrder: "asc",
    });

    const pageItems = Array.isArray(response?.cotizaciones) ? response.cotizaciones : [];
    collected.push(...pageItems);
    totalPages = Math.max(1, Number(response?.totalPages || 1));
    currentPage += 1;
  } while (currentPage <= totalPages);

  return collected;
}

export default function Dashboard() {
  const [calendarFilter, setCalendarFilter] = useState("todos");
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [calendarRange, setCalendarRange] = useState(() => getInitialCalendarRange());
  const [tooltip, setTooltip] = useState(null);
  const [viewportSize, setViewportSize] = useState(() => getViewportSize());

  // KPIs
  const [kpis, setKpis] = useState({
    eventosContratadosMes: 0,
    eventosCerradosMes: 0,
    ingresos: 0,
    eventosConfirmadosAño: 0,
    cotizacionesPendientes: 0,
  });
  const [loadingKpis, setLoadingKpis] = useState(false);

  const normalizeNumber = useCallback((value) => {
    if (value === null || value === undefined) return 0;
    if (typeof value === "number") return value;
    if (typeof value === "string") {
      const cleaned = value.replace(/[^0-9.-]/g, "");
      const parsed = Number(cleaned);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  }, []);

  // Cargar KPIs
  const loadKpis = useCallback(async () => {
    setLoadingKpis(true);
    try {
      const data = await getDashboardKPIs();
      const resolved = data?.kpis || data?.data || data?.result || data || {};
      setKpis({
        eventosContratadosMes: normalizeNumber(
          resolved.eventosContratadosMes ?? resolved.eventosContratadosMesActual
        ),
        eventosCerradosMes: normalizeNumber(
          resolved.eventosCerradosMes ?? resolved.eventosCerradosMesActual
        ),
        ingresos: normalizeNumber(resolved.ingresos ?? resolved.ingresosMesActual),
        eventosConfirmadosAño: normalizeNumber(
          resolved.eventosConfirmadosAño ?? resolved.eventosConfirmadosAno
        ),
        cotizacionesPendientes: normalizeNumber(
          resolved.cotizacionesPendientes ?? resolved.cotizacionesPendientesAprobacion
        ),
      });
    } catch (err) {
      logger.error("[ERROR Dashboard] No se pudieron cargar los KPIs:", err);
    } finally {
      setLoadingKpis(false);
    }
  }, [normalizeNumber]);

  // Cargar cotizaciones para calendario
  const loadContratadoEvents = useCallback(async () => {
    const { fechaInicio, fechaFin } = calendarRange;

    try {
      setCalendarLoading(true);
      setCalendarError("");

      const cotizaciones = await listCalendarCotizaciones(fechaInicio, fechaFin);

      const calendarEvents = (cotizaciones || [])
        .filter((c) => normalizeQuotationStatus(c?.estado) !== "No aceptada")
        .map((cotizacion) => buildDashboardCalendarEvent(cotizacion))
        .filter(Boolean);

      if ((cotizaciones || []).length > 0 && calendarEvents.length === 0) {
        const message = "Se recibieron cotizaciones para el calendario, pero ninguna produjo fechas válidas para renderizar.";
        logger.error("[Dashboard] Calendar mapping produced zero renderable events", {
          fechaInicio,
          fechaFin,
          sample: cotizaciones.slice(0, 3).map((item) => ({
            id: item?._id,
            folio: item?.folio,
            estado: item?.estado,
            fechaEvento: item?.fechaEvento,
            eventStartDate: item?.eventStartDate,
            eventEndDate: item?.eventEndDate,
            horaInicio: item?.horaInicio,
            horaFin: item?.horaFin,
          })),
        });
        setCalendarError(message);
      }

      setEvents(calendarEvents);
    } catch (err) {
      logger.error("[ERROR Dashboard] No se pudieron cargar eventos contratados:", err);
      const message = err instanceof Error ? err.message : "No se pudieron cargar los eventos del calendario.";
      setCalendarError(message);
      setEvents([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarRange]);

  useEffect(() => {
    void loadContratadoEvents();
  }, [loadContratadoEvents]);

  useEffect(() => {
    void loadKpis();
  }, [loadKpis]);

  useEffect(() => {
    const handleResize = () => {
      setViewportSize(getViewportSize());
    };

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const isMobile = viewportSize.width < 640;
  const isTablet = viewportSize.width < 1024;

  const calendarHeight = useMemo(() => {
    if (isMobile) {
      return clamp(Math.round(viewportSize.height * 0.68), 520, 640);
    }

    if (isTablet) {
      return clamp(Math.round(viewportSize.height * 0.7), 620, 760);
    }

    return clamp(Math.round(viewportSize.height * 0.72), 680, 860);
  }, [isMobile, isTablet, viewportSize.height]);

  const calendarHeaderToolbar = useMemo(() => {
    if (isMobile) {
      return {
        left: "prev,next",
        center: "title",
        right: "today",
      };
    }

    if (isTablet) {
      return {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek",
      };
    }

    return {
      left: "prev,next today",
      center: "title",
      right: "dayGridMonth,timeGridWeek,timeGridDay",
    };
  }, [isMobile, isTablet]);

  const calendarButtonText = useMemo(() => {
    if (isMobile) {
      return {
        today: "Hoy",
        month: "Mes",
        week: "Sem",
        day: "Día",
      };
    }

    return {
      today: "Hoy",
      month: "Mes",
      week: "Semana",
      day: "Día",
    };
  }, [isMobile]);

  const calendarTitleFormat = useMemo(() => {
    if (isMobile) {
      return { year: "numeric", month: "short" };
    }

    return { year: "numeric", month: "long" };
  }, [isMobile]);

  const calendarDayHeaderFormat = useMemo(() => {
    if (isMobile) {
      return { weekday: "narrow" };
    }

    if (isTablet) {
      return { weekday: "short" };
    }

    return { weekday: "long" };
  }, [isMobile, isTablet]);

  const handleEventClick = (info) => {
    const cotizacionId = info.event.id;
    if (cotizacionId) {
      navigate(`/cotizaciones/${cotizacionId}/ver`);
    }
  };

  const handleEventMouseEnter = (info) => {
    const event = info.event;
    const rect = info.el.getBoundingClientRect();
    const viewportPadding = 12;
    const availableWidth = Math.max(180, viewportSize.width - viewportPadding * 2);
    const tooltipWidth = isMobile ? availableWidth : Math.min(256, availableWidth);
    const preferredLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
    const clampedLeft = clamp(
      preferredLeft,
      viewportPadding,
      Math.max(viewportPadding, viewportSize.width - tooltipWidth - viewportPadding)
    );
    const shouldPlaceBelow = rect.top < 180;
    const arrowOffset = clamp(rect.left + rect.width / 2 - clampedLeft, 20, tooltipWidth - 20);

    setTooltip({
      evento: event.title,
      cliente: event.extendedProps.cliente,
      estadoOperativoEvento: event.extendedProps.estadoOperativoEvento,
      horaInicio: event.extendedProps.horaInicio,
      numPersonas: event.extendedProps.numPersonas,
      x: clampedLeft,
      y: shouldPlaceBelow ? rect.bottom + 12 : rect.top - 12,
      width: tooltipWidth,
      placement: shouldPlaceBelow ? "bottom" : "top",
      arrowOffset,
    });
  };

  const handleEventMouseLeave = () => {
    setTooltip(null);
  };

  const handleCalendarMouseLeave = () => {
    setTooltip(null);
  };

  const handleDatesSet = useCallback((arg) => {
    const nextStart = extractDateOnly(arg?.startStr || arg?.start);
    const nextEnd = extractDateOnly(arg?.endStr || arg?.end);

    if (!nextStart || !nextEnd) {
      return;
    }

    setCalendarRange((current) => {
      if (current.fechaInicio === nextStart && current.fechaFin === nextEnd) {
        return current;
      }

      return {
        fechaInicio: nextStart,
        fechaFin: nextEnd,
      };
    });
  }, []);

  const filteredEvents = useMemo(() => {
    if (calendarFilter === "todos") return events;

    if (calendarFilter === "contratados") {
      return (events || []).filter((event) => event?.extendedProps?.estado === "Contratado");
    }

    return (events || []).filter((event) => {
      const estado = String(event?.extendedProps?.estado || "");
      return estado !== "Contratado" && estado !== "No aceptada" && estado !== "Cancelado";
    });
  }, [events, calendarFilter]);

  return (
    <div className="w-full min-w-0">
      {/* CSS personalizado para el calendario */}
      <style>{`
        .today-cell {
          position: relative;
          background-color: #eff6ff !important;
        }
        .today-cell .fc-daygrid-day-number {
          background: #3b82f6;
          color: white;
          border-radius: 9999px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
        }
        .event-pill .fc-event {
          border-radius: 9999px !important;
          border: none !important;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }
        .fc-daygrid-event {
          border-radius: 9999px !important;
          padding: 2px 8px !important;
        }
        .fc .fc-daygrid-day {
          border: 1px solid #f3f4f6 !important;
        }
        .fc .fc-col-header-cell {
          border: 1px solid #f3f4f6 !important;
          background-color: #f9fafb;
          font-weight: 600;
          text-transform: capitalize;
        }
        .fc .fc-button-primary {
          background-color: #3b82f6 !important;
          border: none !important;
          border-radius: 0.5rem !important;
        }
        .fc .fc-button-primary:hover {
          background-color: #2563eb !important;
        }
        .fc .fc-toolbar.fc-header-toolbar {
          margin-bottom: 0.75rem !important;
        }
        @media (max-width: 1023px) {
          .fc .fc-toolbar {
            gap: 0.5rem;
          }
          .fc .fc-toolbar-chunk {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 0.5rem;
          }
        }
        @media (max-width: 639px) {
          .fc .fc-toolbar {
            flex-direction: column;
            align-items: stretch !important;
          }
          .fc .fc-toolbar-chunk {
            justify-content: center;
          }
          .fc .fc-toolbar-title {
            font-size: 1rem !important;
            text-align: center;
          }
          .fc .fc-button {
            font-size: 0.75rem !important;
            padding: 0.35rem 0.55rem !important;
          }
          .fc .fc-col-header-cell-cushion,
          .fc .fc-daygrid-day-number {
            font-size: 0.75rem;
          }
        }
      `}</style>
      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-gray-900 text-white rounded-lg shadow-lg p-3 text-sm pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
            width: `${tooltip.width}px`,
            maxWidth: `calc(100vw - 24px)`,
            transform: tooltip.placement === "top" ? "translateY(-100%)" : "none"
          }}
        >
          <div className="font-semibold text-green-300 mb-2">{tooltip.evento}</div>
          <div className="space-y-1 text-gray-300">
            <div><span className="text-gray-400">Estado:</span> {tooltip.estadoOperativoEvento}</div>
            <div><span className="text-gray-400">Cliente:</span> {tooltip.cliente}</div>
            <div><span className="text-gray-400">Hora:</span> {tooltip.horaInicio}</div>
            <div><span className="text-gray-400">Personas:</span> {tooltip.numPersonas}</div>
          </div>
          {/* Flecha del tooltip */}
          <div
            className={`absolute w-2 h-2 bg-gray-900 rotate-45 ${tooltip.placement === "top" ? "-bottom-1" : "-top-1"}`}
            style={{ left: `${tooltip.arrowOffset}px`, transform: "translateX(-50%)" }}
          />
        </div>
      )}

      <main className="p-2 flex min-w-0 flex-col gap-2" onMouseLeave={handleCalendarMouseLeave}>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          {/* Card 1: Eventos Contratados en el Mes */}
          <div className="bg-white rounded-lg shadow p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Eventos Contratados</p>
                <p className="text-gray-600 text-xs mb-2">(Mes Actual)</p>
                {loadingKpis ? (
                  <Loader className="w-4 h-4 animate-spin text-blue-600" />
                ) : (
                  <p className="text-2xl font-bold text-blue-600">{kpis.eventosContratadosMes}</p>
                )}
              </div>
              <Calendar className="w-8 h-8 text-blue-200" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Eventos Cerrados</p>
                <p className="text-gray-600 text-xs mb-2">(Mes Actual)</p>
                {loadingKpis ? (
                  <Loader className="w-4 h-4 animate-spin text-slate-600" />
                ) : (
                  <p className="text-2xl font-bold text-slate-700">{kpis.eventosCerradosMes}</p>
                )}
              </div>
              <CheckCircle className="w-8 h-8 text-slate-300" />
            </div>
          </div>

          {/* Card 2: Ingresos Generados */}
          <div className="bg-white rounded-lg shadow p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Ingresos</p>
                <p className="text-gray-600 text-xs mb-2">(Mes Actual)</p>
                {loadingKpis ? (
                  <Loader className="w-4 h-4 animate-spin text-green-600" />
                ) : (
                  <p className="text-2xl font-bold text-green-600">
                    ${kpis.ingresos?.toLocaleString('es-MX') || 0}
                  </p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </div>

          {/* Card 3: Eventos Confirmados Año */}
          <div className="bg-white rounded-lg shadow p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Eventos Confirmados</p>
                <p className="text-gray-600 text-xs mb-2">(Año Actual)</p>
                {loadingKpis ? (
                  <Loader className="w-4 h-4 animate-spin text-purple-600" />
                ) : (
                  <p className="text-2xl font-bold text-purple-600">{kpis.eventosConfirmadosAño}</p>
                )}
              </div>
              <CheckCircle className="w-8 h-8 text-purple-200" />
            </div>
          </div>

          {/* Card 4: Cotizaciones Pendientes */}
          <div className="bg-white rounded-lg shadow p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Cotizaciones</p>
                <p className="text-gray-600 text-xs mb-2">(Pendientes)</p>
                {loadingKpis ? (
                  <Loader className="w-4 h-4 animate-spin text-orange-600" />
                ) : (
                  <p className="text-2xl font-bold text-orange-600">{kpis.cotizacionesPendientes}</p>
                )}
              </div>
              <FileText className="w-8 h-8 text-orange-200" />
            </div>
          </div>
        </div>

        {/* Calendario */}
        <div className="bg-white rounded-2xl shadow-lg p-2 flex min-w-0 flex-col">
          <div className="px-2 pt-1 pb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1 p-1 bg-slate-50 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setCalendarFilter("todos")}
                className={`h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                  calendarFilter === "todos"
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#64748B] hover:text-[#111827]"
                }`}
              >
                Todos
              </button>
              <button
                type="button"
                onClick={() => setCalendarFilter("contratados")}
                className={`h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                  calendarFilter === "contratados"
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#64748B] hover:text-[#111827]"
                }`}
              >
                Solo contratados
              </button>
              <button
                type="button"
                onClick={() => setCalendarFilter("activas")}
                className={`h-9 px-3 rounded-lg text-sm font-medium transition-all ${
                  calendarFilter === "activas"
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#64748B] hover:text-[#111827]"
                }`}
              >
                Cotizaciones activas
              </button>
            </div>

            <div className="flex items-center gap-4 text-xs text-[#64748B]">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                Evento contratado
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                Cotización
              </span>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden rounded-xl border border-slate-100">
            {calendarError ? (
              <div className="border-b border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {calendarError}
              </div>
            ) : null}
            {calendarLoading ? (
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-[#64748B]">
                Cargando eventos del calendario...
              </div>
            ) : null}
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={calendarHeaderToolbar}
              buttonText={calendarButtonText}
              height={calendarHeight}
              nowIndicator={true}
              dayMaxEvents={3}
              selectable={true}
              dayCellClassNames={(arg) =>
                arg.isToday ? "today-cell" : ""
              }
              datesSet={handleDatesSet}
              events={filteredEvents}
              eventClick={handleEventClick}
              eventMouseEnter={handleEventMouseEnter}
              eventMouseLeave={handleEventMouseLeave}
              eventDisplay="block"
              eventClassNames="event-pill"
              eventContent={(arg) => {
                const eventoCerrado = arg.event.extendedProps?.eventoCerrado === true;

                return (
                  <div className="truncate px-2 py-0.5 text-xs font-medium text-white">
                    <span className="truncate">{arg.event.title}</span>
                    {eventoCerrado ? <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold">Cerrado</span> : null}
                  </div>
                );
              }}
              locale={esLocale}
              titleFormat={calendarTitleFormat}
              dayHeaderFormat={calendarDayHeaderFormat}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

// TODO: variables reservadas para futura implementación
// import { useLocation } from "react-router-dom";
// const _logo = /* ... */;
// const [_menuItems, _setMenuItems] = useState(/* ... */);
// const [_usuario, _setUsuario] = useState(null);
// const [_menuOpen, _setMenuOpen] = useState(false);
// const _azul = "#2563eb";
// const _azulHover = "#1d4ed8";
