import { useEffect, useMemo, useState, Fragment } from "react";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Dialog, Transition } from "@headlessui/react";
import { Search, Filter, FileDown, FileText, Plus, CheckCircle, XCircle, CreditCard } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import ActionsMenu from "../components/ActionsMenu";
import { listCotizaciones, getCotizacionById, deleteCotizacion, updateCotizacion } from "../services/cotizacionesService";
import { generateCotizacionPDF } from "../utils/generatePDF";
import { exportCotizacionesToExcel, exportCotizacionesToPDF } from "../utils/exportUtils";
import { displayQuotationTotals } from "../utils/frontend-quotation-helpers";
import { logger } from "../lib/logger";
const getEstadoClass = (estado) => {
  switch(estado) {
    case "Contratado":
      return "bg-green-50 text-green-700 border border-green-200"; // Verde suave
    case "Cotizado":
    case "Pendiente":
      return "bg-amber-50 text-amber-700 border border-amber-200"; // Amarillo suave
    case "Cancelado":
      return "bg-gray-100 text-gray-600 border border-gray-200"; // Gris suave
    default:
      return "bg-gray-100 text-gray-600 border border-gray-200";
  }
};

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

export default function CotizacionesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [filtroOpen, setFiltroOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  const [paginaActual, setPaginaActual] = useState(1);
  const registrosPorPagina = 10;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState([]);

  // Función para cargar cotizaciones
  const fetchCotizaciones = async () => {
    setLoading(true);
    setError("");
    try {
      const list = await listCotizaciones();
      
      // Normalizar al shape de la tabla actual
      const normalized = (list || []).map((c) => {
        const clienteNombre = c?.cliente?.nombre || "Sin cliente";
        const numberOfDays = clampDurationDays(c?.eventDurationDays ?? c?.breakdown?.numberOfDays ?? 1);
        const eventStartDate = toDateISO(c?.eventStartDate || c?.fechaEvento);
        const eventEndDate = toDateISO(c?.eventEndDate) || addDaysFromISO(eventStartDate, numberOfDays - 1);
        const totalsDisplay = displayQuotationTotals(c);
        if (totalsDisplay?.hasErrors) {
          logger.warn("[Cotizaciones] Quotation totals validation failed", {
            folio: c?.folio,
            id: c?._id,
            errors: totalsDisplay.errors,
          });
        }
        const total = totalsDisplay?.hasErrors
          ? Number(c?.breakdown?.total ?? c?.total ?? 0)
          : Number(totalsDisplay?.display?.total ?? c?.breakdown?.total ?? c?.total ?? 0);
        
        return {
          _id: c?._id,
          id: c?.folio || "-", // No. Cotización
          evento: c?.nombreEvento || "-",
          cliente: clienteNombre,
          invitados: (Number(c?.invitadosAdultos || 0) + Number(c?.invitadosNinos || 0)) || 0,
          fechaEvento: eventStartDate,
          fechaEventoFin: eventEndDate,
          eventDurationDays: numberOfDays,
          horaInicio: c?.horaInicio || "",
          horaFin: c?.horaFin || "",
          fechaCotizacion: toDateISO(c?.createdAt),
          total: total,
          anticipo: Number(c?.anticipo || 0),
          estado: c?.estado || "Cotizado",
        };
      });
      setData(normalized);
    } catch (err) {
      logger.error("Error listCotizaciones:", err);
      const msg = err?.response?.data?.msg || err?.message || "No se pudieron cargar las cotizaciones";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Cargar datos cuando cambia la ubicación (se vuelve a esta página)
  useEffect(() => {
    fetchCotizaciones();
  }, [location.pathname]);

  const updateEstado = async (row, nuevoEstado) => {
    const id = row?._id;
    const estadoActual = row?.estado || "Cotizado";
    if (!id || estadoActual === nuevoEstado) return;

    try {
      await updateCotizacion(id, { estado: nuevoEstado });
      setData((prev) =>
        prev.map((item) => (item._id === id ? { ...item, estado: nuevoEstado } : item))
      );
    } catch (err) {
      logger.error("Error al actualizar estado:", err);
      const msg = err?.response?.data?.msg || err?.message || "No se pudo actualizar el estado";
      alert(msg);
    }
  };

  const columns = useMemo(
    () => [
      {
        header: "Folio",
        accessorKey: "id",
        cell: (i) => <span className="text-sm font-medium whitespace-nowrap text-[#111827]">{i.getValue()}</span>,
        meta: { className: "whitespace-nowrap w-20" },
      },
      { 
        header: "Evento / Cliente", 
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
        header: "Fecha / Hora",
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
        header: "Total",
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
        header: "Estado",
        accessorKey: "estado",
        cell: ({ row, getValue }) => {
          const estado = getValue();
          return (
            <div className="flex items-center gap-2">
              <span className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-semibold ${getEstadoClass(estado)}`}>
                {estado}
              </span>
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
                <button
                  type="button"
                  className="p-1 rounded-lg hover:bg-red-50 text-red-600 disabled:opacity-40 transition"
                  onClick={() => updateEstado(row.original, "Cancelado")}
                  disabled={estado === "Cancelado"}
                  title="Marcar como cancelado"
                  aria-label="Marcar como cancelado"
                >
                  <XCircle size={16} />
                </button>
              </div>
            </div>
          );
        },
        meta: { className: "whitespace-nowrap w-40" },
      },
      {
        header: "Acciones",
        id: "acciones",
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-2">
            {row.original?.estado === "Contratado" && (
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition"
                onClick={() => {
                  const id = row.original?._id;
                  if (!id) return;
                  navigate(`/cotizaciones/${id}/pagos`);
                }}
                title="Registrar pago"
                aria-label="Registrar pago"
              >
                <CreditCard size={14} />
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
                onDelete={() => {
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
                      // Remover de la lista local
                      setData((prevData) => prevData.filter((item) => item._id !== id));
                      alert("Cotización eliminada exitosamente");
                    })
                    .catch((err) => {
                      logger.error("Error al eliminar cotización:", err);
                      const msg = err?.response?.data?.msg || err?.message || "No se pudo eliminar la cotización";
                      alert(msg);
                    });
                }}
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
              />
            </div>
          </div>
        ),
        meta: { className: "w-16 text-right" },
      },
    ],
    [navigate]
  );

  // Búsqueda por cliente (local, sobre data cargada)
  const clientes = useMemo(() => [...new Set((data || []).map((e) => e.cliente))], [data]);

  const handleBusqueda = (e) => {
    const v = e.target.value;
    setBusqueda(v);
    setSugerencias(clientes.filter((c) => c.toLowerCase().includes(v.toLowerCase())).slice(0, 10));
  };

  // Filtrado local (MVP)
  const filteredData = useMemo(() => {
    if (!busqueda) return data;
    const q = busqueda.toLowerCase();
    return (data || []).filter((x) => (x.cliente || "").toLowerCase().includes(q));
  }, [data, busqueda]);

  // Paginación
  const totalPaginas = Math.ceil(filteredData.length / registrosPorPagina);
  const paginatedData = useMemo(() => {
    const inicio = (paginaActual - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    return filteredData.slice(inicio, fin);
  }, [filteredData, paginaActual]);

  // Resetear página cuando cambia el filtro
  useEffect(() => {
    setPaginaActual(1);
  }, [busqueda]);

  const table = useReactTable({ data: paginatedData, columns, getCoreRowModel: getCoreRowModel() });

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
              exportCotizacionesToExcel(filteredData);
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
              exportCotizacionesToPDF(filteredData);
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
                placeholder="Buscar por cliente..."
                value={busqueda}
                onChange={handleBusqueda}
              />
              {busqueda && sugerencias.length > 0 && (
                <ul className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto">
                  {sugerencias.map((s) => (
                    <li
                      key={s}
                      className="px-4 py-2.5 text-sm hover:bg-[#F9FAFB] cursor-pointer text-[#111827] transition"
                      onClick={() => {
                        setBusqueda(s);
                        setSugerencias([]);
                      }}
                    >
                      {s}
                    </li>
                  ))}
                </ul>
              )}
              <button className="absolute right-3 top-2.5 p-1.5 rounded-lg hover:bg-gray-100" onClick={() => setFiltroOpen(true)}>
                <Filter size={18} />
              </button>
            </div>
          </div>
        </div>

        {loading && <div className="px-5 py-4 text-sm text-[#64748B] flex-shrink-0">Cargando cotizaciones...</div>}
        {error && <div className="px-5 py-4 text-sm text-red-600 flex-shrink-0">{error}</div>}

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
            {!loading && paginatedData.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-5 py-8 text-center text-[#64748B] bg-white">
                  No hay cotizaciones para mostrar.
                </td>
              </tr>
            )}
          </tbody>
          </table>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-[#F9FAFB] flex-shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
            <div className="text-[#64748B]">
              {paginatedData.length > 0 ? (paginaActual - 1) * registrosPorPagina + 1 : 0}-{Math.min(paginaActual * registrosPorPagina, filteredData.length)} de {filteredData.length}
            </div>
            
            {totalPaginas > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
                  disabled={paginaActual === 1}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition text-[#64748B]"
                >
                  ◀
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => {
                    const mostrar = pagina === 1 || 
                                    pagina === totalPaginas || 
                                    Math.abs(pagina - paginaActual) <= 1;
                    
                    if (!mostrar) {
                      if (pagina === paginaActual - 2 || pagina === paginaActual + 2) {
                        return <span key={pagina} className="px-2 text-[#64748B]">...</span>;
                      }
                      return null;
                    }
                    
                    return (
                      <button
                        key={pagina}
                        onClick={() => setPaginaActual(pagina)}
                        className={`px-3 py-2 text-sm border rounded-lg transition ${
                          paginaActual === pagina
                            ? "bg-[#2563EB] text-white border-[#2563EB]"
                            : "border-gray-200 hover:bg-white text-[#64748B]"
                        }`}
                      >
                        {pagina}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
                  disabled={paginaActual === totalPaginas}
                  className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition text-[#64748B]"
                >
                  ▶
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Panel de filtros (UI, todavía sin lógica real) */}
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
                <label className="block text-sm font-medium mb-1">Rango de fechas</label>
                <input type="date" className="border rounded px-3 py-2 w-full mb-2" />
                <input type="date" className="border rounded px-3 py-2 w-full" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Cliente</label>
                <input type="text" className="border rounded px-3 py-2 w-full" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">No. Cotización</label>
                <input type="text" className="border rounded px-3 py-2 w-full" />
              </div>
              <button className="w-full bg-[#2563eb] text-white py-2 rounded hover:bg-[#1d4ed8]">Aplicar filtros</button>
            </Dialog.Panel>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
