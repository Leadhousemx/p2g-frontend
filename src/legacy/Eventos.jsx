// LEGACY/ORPHAN FILE: no current route imports this page.
// Treat as reference/prototype only until it is either routed explicitly or removed.
import { useState, useMemo } from "react";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Dialog, Transition } from "@headlessui/react";
import { Search, Filter, FileDown, FileText, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ActionsMenu from "../components/ActionsMenu";
import DashboardLayout from "../layouts/DashboardLayout";

// Datos de ejemplo
const eventos = [
  {
    id: "COT-001",
    evento: "Boda Pérez",
    cliente: "Alberto Martínez",
    invitados: 120,
    fechaEvento: "2025-08-15",
    horaInicio: "18:00",
    horaFin: "02:00",
    fechaCotizacion: "2025-07-01",
    total: 50000,
    anticipo: 20000,
    estado: "Contratado",
  },
  {
    id: "COT-002",
    evento: "XV López",
    cliente: "María López",
    invitados: 80,
    fechaEvento: "2025-09-10",
    horaInicio: "17:00",
    horaFin: "23:00",
    fechaCotizacion: "2025-08-01",
    total: 32000,
    anticipo: 12000,
    estado: "Cotizado",
  },
  {
    id: "COT-003",
    evento: "Bautizo Ramírez",
    cliente: "Carlos Ramírez",
    invitados: 50,
    fechaEvento: "2025-10-05",
    horaInicio: "13:00",
    horaFin: "18:00",
    fechaCotizacion: "2025-09-15",
    total: 18000,
    anticipo: 5000,
    estado: "Cancelado",
  },
];

const estados = {
  Cotizado: "bg-yellow-100 text-yellow-800",
  Contratado: "bg-green-100 text-green-800",
  Cancelado: "bg-red-100 text-red-800",
};

export default function Eventos() {
  const navigate = useNavigate();
  // Filtros
  const [filtroOpen, setFiltroOpen] = useState(false);
  // Autocomplete
  const [busqueda, setBusqueda] = useState("");
  const [sugerencias, setSugerencias] = useState([]);
  // Tabla
  const [data] = useState(eventos);

  // Columnas tabla
  const columns = useMemo(
    () => [
      { header: "No. Cotización", accessorKey: "id", cell: info => <span className="whitespace-nowrap">{info.getValue()}</span>, meta: { className: "whitespace-nowrap" } },
      { header: "Evento", accessorKey: "evento" },
      { header: "Cliente", accessorKey: "cliente" },
      { header: "Invitados", accessorKey: "invitados" },
      { header: "Fecha del evento", accessorKey: "fechaEvento", cell: info => <span className="whitespace-nowrap">{info.getValue()}</span>, meta: { className: "whitespace-nowrap" } },
      { header: "Hora de inicio", accessorKey: "horaInicio", cell: info => <span className="whitespace-nowrap">{info.getValue()}</span>, meta: { className: "whitespace-nowrap" } },
      { header: "Hora de fin", accessorKey: "horaFin", cell: info => <span className="whitespace-nowrap">{info.getValue()}</span>, meta: { className: "whitespace-nowrap" } },
      { header: "Fecha de cotización", accessorKey: "fechaCotizacion" },
      {
        header: "Total",
        accessorKey: "total",
        cell: info => <span className="whitespace-nowrap text-right block w-28">${info.getValue().toLocaleString()}</span>,
        meta: { className: "whitespace-nowrap text-right w-28" }
      },
      {
        header: "Anticipo",
        accessorKey: "anticipo",
        cell: info => <span className="whitespace-nowrap text-right block w-28">${info.getValue().toLocaleString()}</span>,
        meta: { className: "whitespace-nowrap text-right w-28" }
      },
      {
        header: "Estado",
        accessorKey: "estado",
        cell: info => (
          <span className={`whitespace-nowrap px-2 py-1 rounded text-xs font-semibold ${estados[info.getValue()] || ""}`}>
            {info.getValue()}
          </span>
        ),
        meta: { className: "whitespace-nowrap" }
      },
      {
        header: "Acciones",
        id: "acciones",
        cell: () => (
          <div className="w-14 text-right pr-2">
            <ActionsMenu
              onEdit={() => {}}
              onDuplicate={() => {}}
              onDelete={() => {}}
              onPdf={() => {}}
            />
          </div>
        ),
        meta: { className: "w-14 text-right pr-2" }
      }
    ],
    []
  );

  // React Table
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Sugerencias autocomplete
  const clientes = [...new Set(eventos.map(e => e.cliente))];
  const handleBusqueda = e => {
    setBusqueda(e.target.value);
    setSugerencias(
      clientes.filter(c =>
        c.toLowerCase().includes(e.target.value.toLowerCase())
      )
    );
  };

  return (
    <DashboardLayout usuario={null}>
      <h1 className="text-2xl font-bold text-[#2563eb] mb-4">Eventos</h1>
      <div className="flex items-center gap-2 justify-end mb-4">
        <button
          className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          onClick={() => navigate("/eventos/nueva-cotizacion")}
        >
          <Plus size={18} /> Nueva Cotización
        </button>
        <button className="flex items-center gap-1 px-3 py-2 bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8]">
          <FileDown size={18} /> Excel
        </button>
        <button className="flex items-center gap-1 px-3 py-2 bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8]">
          <FileText size={18} /> PDF
        </button>
      </div>
      {/* Filtros y búsqueda */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            className="w-full pl-10 pr-10 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
            placeholder="Buscar por cliente..."
            value={busqueda}
            onChange={handleBusqueda}
          />
          {busqueda && sugerencias.length > 0 && (
            <ul className="absolute left-0 right-0 mt-1 bg-white border rounded shadow z-10">
              {sugerencias.map((s, i) => (
                <li
                  key={i}
                  className="px-4 py-2 hover:bg-blue-100 cursor-pointer"
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
          <button
            className="absolute right-2 top-2 p-1 rounded hover:bg-gray-100"
            onClick={() => setFiltroOpen(true)}
          >
            <Filter size={18} />
          </button>
        </div>
      </div>
      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm bg-white rounded-xl shadow">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="bg-[#2563eb] text-white">
                {headerGroup.headers.map(header => (
                  <th key={header.id} className="px-4 py-3 text-left font-semibold">
                    {header.isPlaceholder ? null : header.column.columnDef.header}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="border-b last:border-b-0 hover:bg-muted/50">
                {row.getVisibleCells().map(cell => (
                  <td
                    key={cell.id}
                    className={
                      "px-4 py-2 " +
                      (cell.column.columnDef.meta?.className || "")
                    }
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-sm text-gray-600 mt-2">
          Mostrando {data.length} de {eventos.length} eventos
        </div>
      </div>
      {/* Panel de filtros */}
      <Transition show={filtroOpen} as={Dialog} onClose={setFiltroOpen}>
        <Dialog.Panel className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-50">
          <div className="w-full max-w-md bg-white h-full p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Filtros</h2>
              <button onClick={() => setFiltroOpen(false)}>
                <span className="sr-only">Cerrar</span>X
              </button>
            </div>
            {/* Aquí van los filtros: rango de fechas, cliente, número de cotización */}
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
          </div>
        </Dialog.Panel>
      </Transition>
    </DashboardLayout>
  );
}
