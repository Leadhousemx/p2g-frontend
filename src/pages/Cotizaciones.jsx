import { useEffect, useMemo, useState, Fragment } from "react";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Dialog, Transition } from "@headlessui/react";
import { Search, Filter, FileDown, FileText, Plus, CheckCircle, CreditCard, ArrowUpDown, ArrowUp, ArrowDown, CheckCheck, Loader2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ActionsMenu from "../components/ActionsMenu";
import { useAuth } from "../context/auth-context";
import { getCotizacionById, deleteCotizacion, updateCotizacion, cerrarEventoCotizacion, cancelarEventoCotizacion } from "../services/cotizacionesService";
import CancelarEventoModal from "../components/cotizacion/CancelarEventoModal";
import { listClientes } from "../services/clientesService";
import { generateCotizacionPDF } from "../utils/generatePDF";
import { exportCotizacionesToExcel, exportCotizacionesToPDF } from "../utils/exportUtils";
import { displayQuotationTotals } from "../utils/frontend-quotation-helpers";
import { canDeleteRecords, isAdminRole } from "../utils/rolePermissions";
import { addDaysToDateOnly, extractDateOnly } from "../utils/dateOnly";
import { logger } from "../lib/logger";
import { useCotizaciones } from "../hooks/useCotizaciones";
import { useNegocios } from "../hooks/useNegocios";
import {
  ESTADOS_DROPDOWN,
  getQuotationStatusConfig,
  normalizeQuotationStatus,
  isValidQuotationStatusForSubmit,
} from "../constants/quotationStatus";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];
const SORTABLE_COLUMNS = {
  folio: "folio",
  nombreEvento: "nombreEvento",
  fechaEvento: "fechaEvento",
  total: "total",
  estado: "estado",
};

const getEstadoClass = (estado) => {
  if (estado === "Pendiente") {
    return "bg-amber-50 text-amber-700 border border-amber-200";
  }
  return `${getQuotationStatusConfig(estado).badgeClass} border`;
};

const getEstadoOperativoClass = (eventoCerrado) => {
  return eventoCerrado
    ? "bg-slate-100 text-slate-700 border-slate-200"
    : "bg-emerald-50 text-emerald-700 border-emerald-200";
};

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

function parsePositiveNumber(value, fallback) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function normalizeTextFilter(value) {
  const normalized = String(value || "").trim();
  return normalized || "";
}

function getInitialSortOrder(value) {
  return value === "asc" || value === "desc" ? value : "";
}

function getClientName(cotizacion) {
  return cotizacion?.cliente?.nombre || cotizacion?.clienteId?.nombre || "Sin cliente";
}

export default function CotizacionesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = (useAuth() || {});
  const allowDelete = canDeleteRecords(user);
  const isAdmin = isAdminRole(user);
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [page, setPage] = useState(parsePositiveNumber(searchParams.get("page"), DEFAULT_PAGE));
  const [pageSize, setPageSize] = useState(parsePositiveNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE));
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get("q") || "");
  const [estado, setEstado] = useState(searchParams.get("estado") || "");
  const [clienteId, setClienteId] = useState(searchParams.get("clienteId") || "");
  const [negocioId, setNegocioId] = useState(searchParams.get("negocioId") || "");
  const [fechaInicio, setFechaInicio] = useState(searchParams.get("fechaInicio") || "");
  const [fechaFin, setFechaFin] = useState(searchParams.get("fechaFin") || "");
  const [folio, setFolio] = useState(searchParams.get("folio") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "");
  const [sortOrder, setSortOrder] = useState(getInitialSortOrder(searchParams.get("sortOrder")));
  const [draftFilters, setDraftFilters] = useState({
    estado: searchParams.get("estado") || "",
    clienteId: searchParams.get("clienteId") || "",
    negocioId: searchParams.get("negocioId") || "",
    fechaInicio: searchParams.get("fechaInicio") || "",
    fechaFin: searchParams.get("fechaFin") || "",
    folio: searchParams.get("folio") || "",
  });
  const [clientSearch, setClientSearch] = useState("");
  const [clientOptions, setClientOptions] = useState([]);
  const [clientOptionsLoading, setClientOptionsLoading] = useState(false);
  const [closingEventoId, setClosingEventoId] = useState(null);
  const [cancelarEventoId, setCancelarEventoId] = useState(null);
  const [cancelandoEvento, setCancelandoEvento] = useState(false);
  const [cancelarEventoError, setCancelarEventoError] = useState("");

  const { negocios = [] } = useNegocios({ pageSize: 100, activo: true });
  const {
    cotizaciones,
    loading,
    error,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    refetch,
  } = useCotizaciones({
    page,
    pageSize,
    q: debouncedSearchTerm,
    estado: estado || undefined,
    clienteId: clienteId || undefined,
    negocioId: negocioId || undefined,
    fechaInicio: fechaInicio || undefined,
    fechaFin: fechaFin || undefined,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
    folio: folio || undefined,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQ = normalizeTextFilter(searchTerm);
      const didSearchChange = nextQ !== debouncedSearchTerm;
      setDebouncedSearchTerm(nextQ);
      if (didSearchChange) {
        setPage(1);
      }
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchTerm, debouncedSearchTerm]);

  useEffect(() => {
    setDraftFilters({ estado, clienteId, negocioId, fechaInicio, fechaFin, folio });
  }, [estado, clienteId, negocioId, fechaInicio, fechaFin, folio]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set("page", String(page));
    nextParams.set("pageSize", String(pageSize));
    if (debouncedSearchTerm) nextParams.set("q", debouncedSearchTerm);
    if (estado) nextParams.set("estado", estado);
    if (clienteId) nextParams.set("clienteId", clienteId);
    if (negocioId) nextParams.set("negocioId", negocioId);
    if (fechaInicio) nextParams.set("fechaInicio", fechaInicio);
    if (fechaFin) nextParams.set("fechaFin", fechaFin);
    if (folio) nextParams.set("folio", folio);
    if (sortBy) nextParams.set("sortBy", sortBy);
    if (sortOrder) nextParams.set("sortOrder", sortOrder);
    setSearchParams(nextParams, { replace: true });
  }, [page, pageSize, debouncedSearchTerm, estado, clienteId, negocioId, fechaInicio, fechaFin, folio, sortBy, sortOrder, setSearchParams]);

  useEffect(() => {
    let cancelled = false;

    const fetchClientOptions = async () => {
      setClientOptionsLoading(true);
      try {
        const response = await listClientes({
          page: 1,
          pageSize: 20,
          q: clientSearch || undefined,
        });
        if (!cancelled) {
          setClientOptions(Array.isArray(response?.clientes) ? response.clientes : []);
        }
      } catch (err) {
        logger.error("Error loading client filter options:", err);
        if (!cancelled) {
          setClientOptions([]);
        }
      } finally {
        if (!cancelled) {
          setClientOptionsLoading(false);
        }
      }
    };

    fetchClientOptions();

    return () => {
      cancelled = true;
    };
  }, [clientSearch]);

  const rows = useMemo(() => {
    return (cotizaciones || []).map((cotizacion) => {
      const clienteNombre = getClientName(cotizacion);
      const numberOfDays = clampDurationDays(cotizacion?.eventDurationDays ?? cotizacion?.breakdown?.numberOfDays ?? 1);
      const eventStartDate = toDateISO(cotizacion?.eventStartDate || cotizacion?.fechaEvento);
      const eventEndDate = toDateISO(cotizacion?.eventEndDate) || addDaysFromISO(eventStartDate, numberOfDays - 1);
      const totalsDisplay = displayQuotationTotals(cotizacion);

      if (totalsDisplay?.hasErrors) {
        logger.warn("[Cotizaciones] Quotation totals validation failed", {
          folio: cotizacion?.folio,
          id: cotizacion?._id,
          errors: totalsDisplay.errors,
        });
      }

      return {
        raw: cotizacion,
        _id: cotizacion?._id,
        folio: cotizacion?.folio || "-",
        evento: cotizacion?.nombreEvento || "-",
        cliente: clienteNombre,
        invitados: (Number(cotizacion?.invitadosAdultos || 0) + Number(cotizacion?.invitadosNinos || 0)) || 0,
        fechaEvento: eventStartDate,
        fechaEventoFin: eventEndDate,
        eventDurationDays: numberOfDays,
        horaInicio: cotizacion?.horaInicio || "",
        horaFin: cotizacion?.horaFin || "",
        fechaCotizacion: toDateISO(cotizacion?.createdAt),
        total: Number(cotizacion?.total ?? 0),
        anticipo: Number(cotizacion?.anticipo || 0),
        estado: cotizacion?.eventoCancelado === true ? "Cancelado" : normalizeQuotationStatus(cotizacion?.estado),
        eventoCerrado: cotizacion?.eventoCerrado === true,
        eventoCancelado: cotizacion?.eventoCancelado === true,
        estadoOperativoEvento: cotizacion?.estadoOperativoEvento || (cotizacion?.eventoCerrado ? "Evento cerrado" : "Evento activo"),
        fechaCierreEvento: toDateISO(cotizacion?.fechaCierreEvento),
      };
    });
  }, [cotizaciones]);

  const updateEstado = async (row, nuevoEstado) => {
    const id = row?._id;
    const estadoActual = row?.estado || "Cotizado";
    if (!id || estadoActual === nuevoEstado) return;

    if (!isValidQuotationStatusForSubmit(nuevoEstado)) {
      alert("Estado inválido. Selecciona un estado permitido.");
      return;
    }

    try {
      await updateCotizacion(id, { estado: nuevoEstado });
      refetch();
    } catch (err) {
      logger.error("Error al actualizar estado:", err);
      const msg = err?.response?.data?.msg || err?.message || "No se pudo actualizar el estado";
      alert(msg);
    }
  };

  const handleCerrarEvento = (row) => {
    const id = row?._id;
    if (!id) {
      logger.error("No se encontró _id en la cotización:", row);
      return;
    }
    if (!window.confirm("¿Estás seguro de que deseas cerrar este evento? Una vez cerrado, no se podrán registrar más pagos.")) {
      return;
    }
    setClosingEventoId(id);
    cerrarEventoCotizacion(id)
      .then(() => {
        alert("Evento cerrado exitosamente");
        refetch();
      })
      .catch((err) => {
        logger.error("Error al cerrar evento:", err);
        const msg = err?.response?.data?.msg || err?.message || "No se pudo cerrar el evento";
        alert(msg);
      })
      .finally(() => {
        setClosingEventoId(null);
      });
  };

  const handleConfirmarCancelacion = async (payload) => {
    if (!cancelarEventoId) return;

    if (!/^[a-f\d]{24}$/i.test(String(cancelarEventoId))) {
      setCancelarEventoError("ID de cotización inválido. Recarga la página e intenta nuevamente.");
      return;
    }

    setCancelandoEvento(true);
    setCancelarEventoError("");
    try {
      await cancelarEventoCotizacion(cancelarEventoId, payload);
      setCancelarEventoId(null);
      refetch();
    } catch (err) {
      logger.error("Error al cancelar evento:", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        err?.response?.data?.error ||
        err?.message ||
        "No se pudo cancelar el evento";
      setCancelarEventoError(msg);
    } finally {
      setCancelandoEvento(false);
    }
  };

  const toggleSort = (field) => {
    if (!SORTABLE_COLUMNS[field]) return;
    setPage(1);

    if (sortBy !== field) {
      setSortBy(field);
      setSortOrder("asc");
      return;
    }

    if (sortOrder === "asc") {
      setSortOrder("desc");
      return;
    }

    setSortBy("");
    setSortOrder("");
  };

  const renderSortIcon = (field) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={14} className="text-[#94A3B8]" />;
    }

    if (sortOrder === "asc") {
      return <ArrowUp size={14} className="text-[#2563EB]" />;
    }

    return <ArrowDown size={14} className="text-[#2563EB]" />;
  };

  const columns = useMemo(
    () => [
      {
        header: () => (
          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("folio")}>
            <span>Folio</span>
            {renderSortIcon("folio")}
          </button>
        ),
        accessorKey: "folio",
        cell: (i) => <span className="text-sm font-medium whitespace-nowrap text-[#111827]">{i.getValue()}</span>,
        meta: { className: "whitespace-nowrap w-20" },
      },
      {
        header: () => (
          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("nombreEvento")}>
            <span>Evento / Cliente</span>
            {renderSortIcon("nombreEvento")}
          </button>
        ),
        accessorKey: "evento",
        cell: ({ row }) => (
          <div className="min-w-32">
            <div className="font-medium text-sm truncate max-w-32 text-[#111827]">{row.original.evento}</div>
            <div className="text-sm text-[#64748B] truncate max-w-32">{row.original.cliente}</div>
          </div>
        ),
        meta: { className: "min-w-32" },
      },
      {
        header: "Inv.",
        accessorKey: "invitados",
        cell: (i) => <span className="text-sm text-[#111827]">{i.getValue()}</span>,
        meta: { className: "text-center w-10" },
      },
      {
        header: () => (
          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("fechaEvento")}>
            <span>Fecha / Hora</span>
            {renderSortIcon("fechaEvento")}
          </button>
        ),
        accessorKey: "fechaEvento",
        cell: ({ row }) => (
          <div className="text-sm whitespace-nowrap">
            <div className="text-[#111827]">
              {row.original.eventDurationDays >= 2
                ? `${row.original.fechaEvento} → ${row.original.fechaEventoFin}`
                : row.original.fechaEvento}
            </div>
            <div className="text-[#64748B]">{row.original.horaInicio}</div>
          </div>
        ),
        meta: { className: "whitespace-nowrap w-20" },
      },
      {
        header: () => (
          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("total")}>
            <span>Total</span>
            {renderSortIcon("total")}
          </button>
        ),
        accessorKey: "total",
        cell: (i) => <span className="text-sm font-medium whitespace-nowrap text-right block text-[#111827]">${Number(i.getValue() || 0).toLocaleString()}</span>,
        meta: { className: "whitespace-nowrap text-right w-20" },
      },
      {
        header: "Anticipo",
        accessorKey: "anticipo",
        cell: (i) => <span className="text-sm whitespace-nowrap text-right block text-[#64748B]">${Number(i.getValue() || 0).toLocaleString()}</span>,
        meta: { className: "whitespace-nowrap text-right w-20" },
      },
      {
        header: () => (
          <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("estado")}>
            <span>Estado</span>
            {renderSortIcon("estado")}
          </button>
        ),
        accessorKey: "estado",
        cell: ({ row, getValue }) => {
          const estado = normalizeQuotationStatus(getValue());
          const canEditEstado = estado !== "Contratado" && estado !== "Cancelado";
          const eventoCerrado = row.original?.eventoCerrado === true;
          // Solo mostrar estado operativo cuando el evento está cerrado (aporta información adicional)
          // No mostrar "Evento activo" cuando ya dice "Contratado" (sería redundante)
          const mostrarEstadoOperativo = estado === "Contratado" && eventoCerrado;
          const estadoOperativoLabel = row.original?.estadoOperativoEvento || "Evento cerrado";
          return (
            <div className="flex flex-col items-start gap-1.5">
              <div className="flex items-center gap-2">
                {canEditEstado ? (
                  <select
                    value={estado}
                    onChange={(event) => updateEstado(row.original, event.target.value)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold border bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] ${getEstadoClass(estado)}`}
                    aria-label="Cambiar estado de cotización"
                  >
                    {ESTADOS_DROPDOWN.filter((option) => option !== "Contratado").map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold ${getEstadoClass(estado)}`}>
                    {estado}
                  </span>
                )}
                {canEditEstado && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="p-1 rounded-lg hover:bg-green-50 text-green-600 disabled:opacity-40 transition"
                      onClick={() => updateEstado(row.original, "Contratado")}
                      disabled={estado === "Contratado"}
                      title="Marcar como contratado"
                      aria-label="Marcar como contratado"
                    >
                      <CheckCircle size={16} />
                    </button>
                  </div>
                )}
                {isAdmin && estado === "Contratado" && !eventoCerrado && row.original?.eventoCancelado !== true && (
                  <button
                    type="button"
                    onClick={() => handleCerrarEvento(row.original)}
                    disabled={closingEventoId === row.original?._id}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-600 transition hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Cerrar evento"
                    aria-label="Cerrar evento"
                  >
                    {closingEventoId === row.original?._id
                      ? <Loader2 size={15} className="animate-spin" />
                      : <CheckCheck size={15} />
                    }
                  </button>
                )}
              </div>
              {mostrarEstadoOperativo ? (
                <span className={`whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-semibold ${getEstadoOperativoClass(eventoCerrado)}`}>
                  {estadoOperativoLabel}
                </span>
              ) : null}
            </div>
          );
        },
        meta: { className: "whitespace-nowrap w-48" },
      },
      {
        header: "Acciones",
        id: "acciones",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            {row.original?.estado === "Contratado" && (
              <button
                type="button"
                disabled={row.original?.eventoCerrado === true}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-green-50"
                onClick={() => {
                  const id = row.original?._id;
                  if (!id || row.original?.eventoCerrado === true) return;
                  navigate(`/cotizaciones/${id}/pagos`);
                }}
                title={row.original?.eventoCerrado ? "El evento está cerrado" : "Registrar pago"}
                aria-label="Registrar pago"
              >
                <CreditCard size={14} />
                <span className="sr-only">Registrar pago</span>
              </button>
            )}
            <div className="w-8">
              <ActionsMenu
                onView={() => {
                  const id = row.original?._id;
                  if (!id) {
                    logger.error("No se encontró _id en la cotización:", row.original);
                    return;
                  }
                  navigate(`/cotizaciones/${id}/ver`);
                }}
                onEdit={() => {
                  const id = row.original?._id;
                  if (!id) {
                    logger.error("No se encontró _id en la cotización:", row.original);
                    return;
                  }
                  navigate(`/cotizaciones/${id}`);
                }}
                onDuplicate={() => {
                  const id = row.original?._id;
                  if (!id) {
                    logger.error("No se encontró _id en la cotización:", row.original);
                    return;
                  }

                  // Obtener la cotización completa para duplicarla
                  getCotizacionById(id)
                    .then((cotizacion) => {
                      // Pasar los datos al formulario usando location.state
                      navigate("/cotizaciones/nueva", {
                        state: {
                          duplicatedFrom: cotizacion,
                          isDuplicate: true,
                        },
                      });
                    })
                    .catch((err) => {
                      logger.error("[Cotizaciones] Error al obtener cotización para duplicar:", err);
                      const msg = err?.response?.data?.msg || err?.message || "No se pudo obtener la cotización";
                      alert(msg);
                    });
                }}
                onDelete={allowDelete ? (() => {
                  const id = row.original?._id;
                  if (!id) {
                    logger.error("No se encontró _id en la cotización:", row.original);
                    return;
                  }

                  if (!window.confirm("¿Estás seguro de que deseas eliminar esta cotización?")) {
                    return;
                  }

                  deleteCotizacion(id)
                    .then(() => {
                      const shouldGoBack = rows.length === 1 && page > 1;
                      if (shouldGoBack) {
                        setPage((current) => Math.max(1, current - 1));
                      } else {
                        refetch();
                      }
                      alert("Cotización eliminada exitosamente");
                    })
                    .catch((err) => {
                      logger.error("Error al eliminar cotización:", err);
                      const msg = err?.response?.data?.msg || err?.message || "No se pudo eliminar la cotización";
                      alert(msg);
                    });
                }) : undefined}
                onPdf={() => {
                  const id = row.original?._id;
                  if (!id) {
                    logger.error("No se encontró _id en la cotización:", row.original);
                    return;
                  }
                  // Obtener datos completos de la cotización
                  getCotizacionById(id)
                    .then((cotizacion) => {
                      generateCotizacionPDF(cotizacion);
                    })
                    .catch((err) => {
                      logger.error("Error al generar PDF:", err);
                      alert("No se pudo generar el PDF. Intenta nuevamente.");
                    });
                }}
                onCerrarEvento={
                  isAdmin &&
                  row.original?.estado === "Contratado" &&
                  row.original?.eventoCerrado !== true &&
                  row.original?.eventoCancelado !== true
                    ? () => handleCerrarEvento(row.original)
                    : undefined
                }
                onCancelarEvento={
                  row.original?.estado === "Contratado" &&
                  row.original?.eventoCancelado !== true &&
                  row.original?.eventoCerrado !== true
                    ? () => {
                        const id = row.original?._id;
                        if (!id) {
                          logger.error("No se encontró _id en la cotización:", row.original);
                          return;
                        }
                        setCancelarEventoError("");
                        setCancelarEventoId(id);
                      }
                    : undefined
                }
              />
            </div>
          </div>
        ),
        meta: { className: "w-16 text-right" },
      },
    ],
    [navigate, allowDelete, isAdmin, page, refetch, rows.length, sortBy, sortOrder, closingEventoId]
  );

  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = total === 0 ? 0 : Math.min(page * pageSize, total);
  const hasActiveFilters = Boolean(debouncedSearchTerm || estado || clienteId || negocioId || fechaInicio || fechaFin || folio);

  const handleApplyFilters = () => {
    setEstado(normalizeTextFilter(draftFilters.estado));
    setClienteId(normalizeTextFilter(draftFilters.clienteId));
    setNegocioId(normalizeTextFilter(draftFilters.negocioId));
    setFechaInicio(normalizeTextFilter(draftFilters.fechaInicio));
    setFechaFin(normalizeTextFilter(draftFilters.fechaFin));
    setFolio(normalizeTextFilter(draftFilters.folio));
    setPage(1);
    setFiltroOpen(false);
  };

  const handleClearFilters = () => {
    const cleared = {
      estado: "",
      clienteId: "",
      negocioId: "",
      fechaInicio: "",
      fechaFin: "",
      folio: "",
    };
    setDraftFilters(cleared);
    setEstado("");
    setClienteId("");
    setNegocioId("");
    setFechaInicio("");
    setFechaFin("");
    setFolio("");
    setClientSearch("");
    setPage(1);
  };

  return (
    <div className="p-5 h-screen flex flex-col overflow-hidden bg-[#F4F6F9]">
      <div className="flex items-center gap-3 justify-end mb-6 flex-wrap">
        <button
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-white text-[#111827] border border-gray-200 rounded-lg hover:bg-gray-50 transition whitespace-nowrap shadow-sm"
          onClick={() => navigate("/cotizaciones/nueva")}
        >
          <Plus size={16} /> Nueva
        </button>
        <button
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] transition whitespace-nowrap shadow-sm"
          onClick={() => {
            try {
              exportCotizacionesToExcel(cotizaciones);
            } catch (err) {
              logger.error("Error exportando a Excel:", err);
              alert("No se pudo exportar a Excel. Intenta nuevamente.");
            }
          }}
        >
          <FileDown size={16} /> Excel
        </button>
        <button
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] transition whitespace-nowrap shadow-sm"
          onClick={() => {
            try {
              exportCotizacionesToPDF(cotizaciones);
            } catch (err) {
              logger.error("Error exportando a PDF:", err);
              alert("No se pudo exportar a PDF. Intenta nuevamente.");
            }
          }}
        >
          <FileText size={16} /> PDF
        </button>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden min-h-0">
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 text-[#64748B]" size={18} />
              <input
                type="text"
                className="w-full h-11 pl-12 pr-12 py-3 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-[#111827] placeholder-[#64748B]"
                placeholder="Buscar por folio, cliente o evento..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
              <button className="absolute right-3 top-2.5 p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setFiltroOpen(true)}>
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>

        {loading && <div className="px-5 py-4 text-sm text-[#64748B] flex-shrink-0">Cargando cotizaciones...</div>}
        {error && (
          <div className="px-5 py-4 flex items-center justify-between gap-3 text-sm text-red-600 flex-shrink-0 bg-red-50 border-b border-red-100">
            <span>{error}</span>
            <button
              type="button"
              className="px-3 py-1.5 rounded-lg border border-red-200 hover:bg-white transition"
              onClick={refetch}
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-sm bg-[#F9FAFB] border-collapse">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-[#F9FAFB] border-b border-gray-200 sticky top-0">
                {hg.headers.map((header, idx) => (
                  <th key={header.id} className={`px-5 py-4 text-left font-semibold text-xs uppercase tracking-wider text-[#64748B] ${
                    idx === 0 ? 'rounded-tl-xl' : ''
                  } ${
                    idx === hg.headers.length - 1 ? 'rounded-tr-xl' : ''
                  }`}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 bg-white last:border-b-0 hover:bg-gray-50/50 transition">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={"px-5 py-4 text-[#111827] " + (cell.column.columnDef.meta?.className || "")}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-[#64748B] bg-white">
                  {hasActiveFilters ? "No se encontraron cotizaciones con los filtros actuales." : "No hay cotizaciones para mostrar."}
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-[#F9FAFB] flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-3 text-sm">
            <div className="text-[#64748B]">
              {startItem}-{endItem} de {total}
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <label className="flex items-center gap-2 text-[#64748B]">
                <span>Filas por página:</span>
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value));
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#111827]"
                >
                  {PAGE_SIZE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={!hasPrevPage}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition text-[#64748B]"
                >
                  ◀
                </button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((currentPage) => {
                    const showPage = currentPage === 1 ||
                                    currentPage === totalPages ||
                                    Math.abs(currentPage - page) <= 1;

                    if (!showPage) {
                      if (currentPage === page - 2 || currentPage === page + 2) {
                        return <span key={currentPage} className="px-2 text-[#64748B]">...</span>;
                      }
                      return null;
                    }

                    return (
                      <button
                        key={currentPage}
                        onClick={() => setPage(currentPage)}
                        className={`px-3 py-2 text-sm border rounded-lg transition ${
                          page === currentPage
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "border-gray-200 hover:bg-white text-[#64748B]"
                        }`}
                      >
                        {currentPage}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={!hasNextPage}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition text-[#64748B]"
                >
                  ▶
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      <CancelarEventoModal
        open={Boolean(cancelarEventoId)}
        onClose={() => {
          if (!cancelandoEvento) {
            setCancelarEventoId(null);
            setCancelarEventoError("");
          }
        }}
        onConfirm={handleConfirmarCancelacion}
        loading={cancelandoEvento}
        error={cancelarEventoError}
      />

      <Transition show={filtroOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={setFiltroOpen}>
          <div className="fixed inset-0 bg-black/30" />
          <div className="fixed inset-0 flex justify-end">
            <Dialog.Panel className="w-full max-w-md bg-white h-full p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Filtros</h2>
                <button onClick={() => setFiltroOpen(false)} aria-label="Cerrar">
                  X
                </button>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Estado</label>
                <select
                  value={draftFilters.estado}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, estado: event.target.value }))}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Todos</option>
                  {ESTADOS_DROPDOWN.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Rango de fechas</label>
                <input
                  type="date"
                  value={draftFilters.fechaInicio}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, fechaInicio: event.target.value }))}
                  className="border rounded px-3 py-2 w-full mb-2"
                />
                <input
                  type="date"
                  value={draftFilters.fechaFin}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, fechaFin: event.target.value }))}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Buscar cliente</label>
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(event) => setClientSearch(event.target.value)}
                  placeholder="Escribe para filtrar clientes"
                  className="border rounded px-3 py-2 w-full mb-2"
                />
                <select
                  value={draftFilters.clienteId}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, clienteId: event.target.value }))}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Todos los clientes</option>
                  {clientOptions.map((client) => (
                    <option key={client._id} value={client._id}>
                      {client.nombre}
                    </option>
                  ))}
                </select>
                {clientOptionsLoading && <p className="mt-2 text-xs text-[#64748B]">Cargando clientes...</p>}
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Negocio</label>
                <select
                  value={draftFilters.negocioId}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, negocioId: event.target.value }))}
                  className="border rounded px-3 py-2 w-full"
                >
                  <option value="">Todos los negocios</option>
                  {negocios.map((negocio) => (
                    <option key={negocio._id} value={negocio._id}>
                      {negocio.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">No. Cotización</label>
                <input
                  type="text"
                  value={draftFilters.folio}
                  onChange={(event) => setDraftFilters((current) => ({ ...current, folio: event.target.value }))}
                  className="border rounded px-3 py-2 w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="w-full border border-gray-200 text-[#111827] py-2 rounded hover:bg-[#F8FAFC]"
                  onClick={handleClearFilters}
                >
                  Limpiar
                </button>
                <button
                  type="button"
                  className="w-full bg-[#2563eb] text-white py-2 rounded hover:bg-[#1d4ed8]"
                  onClick={handleApplyFilters}
                >
                  Aplicar filtros
                </button>
              </div>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
