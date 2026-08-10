import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Plus } from "lucide-react";
import PageSkeleton from "../components/common/PageSkeleton";
import { usePagos } from "../hooks/usePagos";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import MobileEntityCard from "../components/common/MobileEntityCard";
import AdminEntityActionsMenu from "../components/common/AdminEntityActionsMenu";
import AppConfirmDialog from "../components/common/AppConfirmDialog";
import { formatDateOnly } from "../utils/dateOnly";

const PAGOS_TABLE_COLUMNS = [
  { key: "fecha", label: "Fecha", align: "left" },
  { key: "folioEvento", label: "Folio / Evento", align: "left" },
  { key: "monto", label: "Monto", align: "left" },
  { key: "formaDePago", label: "Forma de Pago", align: "left" },
  { key: "referencia", label: "Referencia", align: "left" },
  { key: "creador", label: "Creador", align: "left" },
  { key: "acciones", label: "Acciones", align: "right" },
] as const;

const NOOP = () => {};

type NormalizedPagoRow = ReturnType<typeof normalizePagoRow>;

function PagosPagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="border-t border-gray-200 bg-[#F9FAFB] px-5 py-4">
      <div className="flex flex-wrap items-center justify-center gap-2 md:justify-end">
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            key={pageNumber}
            onClick={() => onPageChange(pageNumber)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              page === pageNumber
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {pageNumber}
          </button>
        ))}
      </div>
    </div>
  );
}

function getAlignedCellClass(align: "left" | "right") {
  return align === "right" ? "text-right" : "text-left";
}

function normalizePagoRow(pago: any, index: number) {
  return {
    rowIndex: index,
    key: String(pago?._id ?? `pago-${index}`),
    id: String(pago?._id ?? ""),
    fechaLabel: pago?.fecha ? formatDateOnly(pago.fecha, "es-MX") : "-",
    folio: String(pago?.cotizacionId?.folio ?? "-"),
    evento: String(pago?.cotizacionId?.nombreEvento ?? "-"),
    montoLabel: `$${Number(pago?.monto ?? 0).toFixed(2)}`,
    formaDePagoLabel: String(pago?.formaDePago ?? "-")
      .replace(/^./, (value: string) => value.toUpperCase()),
    referenciaLabel: String(pago?.referencia ?? "-") || "-",
    creadorNombre: String(pago?.createdBy?.nombre ?? "-"),
    creadorEmail: String(pago?.createdBy?.email ?? "-"),
  };
}

export default function PagosPage() {
  const { pagos, total, totalFiltrado, loading, error, list, remove } = usePagos();
  const [cotizacionId, setCotizacionId] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pagoToDelete, setPagoToDelete] = useState<{ id: string; folio: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const pageSize = 50;

  const handleFilter = async () => {
    setPage(1);
    await list({
      cotizacionId: cotizacionId || undefined,
      page: 1,
      pageSize,
      sortBy: "fecha",
      sortDir,
    });
  };

  const handleClearFilters = async () => {
    setCotizacionId("");
    setSortDir("desc");
    setPage(1);
    await list({
      page: 1,
      pageSize,
      sortBy: "fecha",
      sortDir: "desc",
    });
  };

  const handlePageChange = async (newPage: number) => {
    setPage(newPage);
    await list({
      cotizacionId: cotizacionId || undefined,
      page: newPage,
      pageSize,
      sortBy: "fecha",
      sortDir,
    });
  };

  const handleDelete = async (id: string) => {
    const success = await remove(id);
    if (success) {
      await list({
        cotizacionId: cotizacionId || undefined,
        page,
        pageSize,
        sortBy: "fecha",
        sortDir,
      });
    }

    return success;
  };

  const handleConfirmDelete = async () => {
    if (!pagoToDelete) return;

    setDeleting(true);
    try {
      const success = await handleDelete(pagoToDelete.id);
      if (success) {
        setPagoToDelete(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    list({
      page: 1,
      pageSize,
      sortBy: "fecha",
      sortDir: "desc",
    });
  }, []);

  const totalPages = Math.ceil(totalFiltrado / pageSize);
  const normalizedPagos = pagos.map((pago, index) => normalizePagoRow(pago, index));

  const renderTableBody = () => {
    return normalizedPagos.map((row: NormalizedPagoRow) => (
      <tr key={row.key} className="hover:bg-gray-50">
        <td className="px-6 py-4 text-sm font-medium text-gray-900">{row.fechaLabel}</td>
        <td className="px-6 py-4 text-sm text-gray-600">
          <div className="font-semibold">{row.folio}</div>
          <div className="text-xs text-gray-500">{row.evento}</div>
        </td>
        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{row.montoLabel}</td>
        <td className="px-6 py-4 text-sm text-gray-600">
          <span className="inline-block rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
            {row.formaDePagoLabel}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-gray-600">{row.referenciaLabel}</td>
        <td className="px-6 py-4 text-sm text-gray-600">
          <div>{row.creadorNombre}</div>
          <div className="text-xs text-gray-500">{row.creadorEmail}</div>
        </td>
        <td className="px-6 py-4 text-right">
          <div className="flex justify-end gap-2">
            <AdminEntityActionsMenu
              onView={NOOP}
              onEdit={NOOP}
              onDuplicate={NOOP}
              onDelete={() => setPagoToDelete({ id: row.id, folio: row.folio })}
            />
          </div>
        </td>
      </tr>
    ));
  };

  const renderDesktop = () => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              {PAGOS_TABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`px-6 py-3 text-sm font-semibold text-gray-700 ${getAlignedCellClass(column.align)}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">{renderTableBody()}</tbody>
        </table>
      </div>
      <PagosPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );

  const renderMobileItem = (row: NormalizedPagoRow) => (
    <MobileEntityCard
      title={row.folio}
      subtitle={row.evento !== "-" ? row.evento : "Sin evento asociado"}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-[#111827]">{row.montoLabel}</span>
          <span className="inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800">
            {row.formaDePagoLabel}
          </span>
        </div>
      }
      actions={
        <AdminEntityActionsMenu
          onView={NOOP}
          onEdit={NOOP}
          onDuplicate={NOOP}
          onDelete={() => setPagoToDelete({ id: row.id, folio: row.folio })}
        />
      }
      className=""
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Fecha</dt>
          <dd className="text-right text-[#111827]">{row.fechaLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Referencia</dt>
          <dd className="text-right text-[#111827]">{row.referenciaLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Registrado por</dt>
          <dd className="text-right text-[#111827]">
            <div>{row.creadorNombre}</div>
            <div className="text-xs text-[#64748B]">{row.creadorEmail}</div>
          </dd>
        </div>
      </dl>
    </MobileEntityCard>
  );

  if (loading && pagos.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827] sm:text-3xl">Pagos</h1>
            <p className="text-sm text-[#64748B]">
              Consulta pagos registrados, filtra por cotizacion y administra el alta de nuevos movimientos sin salir del modulo.
            </p>
          </div>
          <Link
            to="/pagos/nuevo"
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8] sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Pago
          </Link>
        </div>

        <div>
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#111827]">Filtros del listado</h2>
              <p className="text-sm text-[#64748B]">
                Filtra pagos por cotizacion y controla el orden cronologico del historial sin salir del modulo.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)]">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Filtrar por Cotización</label>
                <input
                  type="text"
                  value={cotizacionId}
                  onChange={(e) => setCotizacionId(e.target.value)}
                  placeholder="ID de cotización..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Orden</label>
                <select
                  value={sortDir}
                  onChange={(e) => setSortDir(e.target.value as "asc" | "desc")}
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="desc">Más recientes primero</option>
                  <option value="asc">Más antiguos primero</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={handleFilter}
                    className="h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8] sm:min-w-[140px]"
                  >
                    Filtrar
                  </button>
                  <button
                    onClick={handleClearFilters}
                    className="h-11 rounded-xl border border-gray-300 bg-white px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:min-w-[140px]"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          <ResponsiveDataList
            items={normalizedPagos}
            loading={false}
            getItemKey={(row: NormalizedPagoRow) => row.key}
            renderDesktop={renderDesktop}
            renderMobileItem={renderMobileItem}
            mobileBreakpoint="md"
            emptyMessage="No hay pagos para mostrar"
            loadingView={<PageSkeleton />}
            emptyView={undefined}
            mobileListClassName={undefined}
            desktopClassName={undefined}
          />

          {pagos.length > 0 && (
            <>
              <div className="mt-4 md:hidden">
                <PagosPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Total de pagos</p>
                  <p className="text-2xl font-bold text-blue-900">{total}</p>
                </div>
                <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-green-600">Pagos filtrados</p>
                  <p className="text-2xl font-bold text-green-900">{totalFiltrado}</p>
                </div>
                <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 sm:col-span-2 xl:col-span-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-purple-600">Monto total (filtrado)</p>
                  <p className="text-2xl font-bold text-purple-900">
                    ${pagos.reduce((sum, pago) => sum + pago.monto, 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </>
          )}

          <AppConfirmDialog
            open={!!pagoToDelete}
            onOpenChange={(open: boolean) => {
              if (!open) {
                setPagoToDelete(null);
              }
            }}
            title="Eliminar pago"
            message={
              pagoToDelete
                ? `¿Eliminar pago de la cotización ${pagoToDelete.folio}? El pago será revertido.`
                : ""
            }
            confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
            cancelLabel="Cancelar"
            loading={deleting}
            onConfirm={handleConfirmDelete}
            confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
          />
        </div>
      </div>
    </div>
  );
}
