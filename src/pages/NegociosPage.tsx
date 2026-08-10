import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Power } from "lucide-react";
import { useNegocios } from "../hooks/useNegocios";
import { getNegocio, Negocio } from "../services/negociosService";
import AdminEntityActionsMenu from "../components/common/AdminEntityActionsMenu";
import AppConfirmDialog from "../components/common/AppConfirmDialog";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import MobileEntityCard from "../components/common/MobileEntityCard";
import { logger } from "../lib/logger";

const NEGOCIOS_TABLE_COLUMNS = [
  { key: "negocio", label: "Negocio", align: "left" },
  { key: "estado", label: "Estado", align: "left" },
  { key: "acciones", label: "Acciones", align: "center" },
] as const;

function getAlignedCellClass(align: "left" | "center") {
  return align === "center" ? "text-center" : "text-left";
}

function getEstadoBadgeClass(activo: boolean) {
  return activo
    ? "bg-emerald-50 text-emerald-700"
    : "bg-slate-100 text-slate-700";
}

function normalizeNegocioRow(negocio: any, index: number) {
  return {
    rowIndex: index,
    key: String(negocio?._id ?? `negocio-${index}`),
    id: String(negocio?._id ?? ""),
    nombre: String(negocio?.nombre ?? "-"),
    tipo: String(negocio?.tipo ?? "-"),
    activo: Boolean(negocio?.activo),
    estadoLabel: negocio?.activo ? "Activo" : "Inactivo",
  };
}

export default function NegociosPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [tempSearch, setTempSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showActivos, setShowActivos] = useState(true);
  const [negocioToDeleteId, setNegocioToDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailNegocio, setDetailNegocio] = useState<Negocio | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const { negocios, total, totalActivos, totalInactivos, loading, error, remove } = useNegocios({
    search: search || undefined,
    page,
    limit: 10,
    activo: showActivos,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(tempSearch);
    setPage(1);
  };

  const handleClear = () => {
    setTempSearch("");
    setSearch("");
    setPage(1);
  };

  const handleToggleTab = (activos: boolean) => {
    setShowActivos(activos);
    setPage(1);
  };

  const handleRequestDelete = (id: string) => {
    setNegocioToDeleteId(id);
  };

  const handleOpenDetail = async (id: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetailNegocio(null);
    try {
      const data = await getNegocio(id);
      setDetailNegocio(data);
    } catch (err: any) {
      logger.error("Error cargando detalle del negocio:", err);
      setDetailError(err?.response?.data?.message || "No se pudo cargar la información del negocio");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailNegocio(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const handleConfirmDelete = async () => {
    if (!negocioToDeleteId) return;

    setDeleting(true);
    try {
      await remove(negocioToDeleteId);
      setNegocioToDeleteId(null);
    } catch {
      alert("No se pudo desactivar el negocio");
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = Math.ceil(total / 10);
  const normalizedNegocios = negocios.map((negocio, index) => normalizeNegocioRow(negocio, index));
  const negocioToDelete = negocioToDeleteId
    ? negocios.find((negocio) => negocio._id === negocioToDeleteId) ?? null
    : null;

  const renderNegocioActions = (row: (typeof normalizedNegocios)[number], align = "end") => (
    <AdminEntityActionsMenu
      align={align}
      onView={() => handleOpenDetail(row.id)}
      onEdit={() => navigate(`/negocios/${row.id}/editar`)}
      extraItems={[
        {
          key: "toggle-status",
          label: row.activo ? "Desactivar" : "Activar",
          icon: Power,
          onSelect: () => {
            /* Toggle activo */
          },
        },
      ]}
      onDelete={() => handleRequestDelete(row.id)}
    />
  );

  const renderPagination = (className = "") => {
    if (totalPages <= 1) return null;

    return (
      <div className={`border-t border-slate-200 px-5 py-4 ${className}`.trim()}>
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-[#64748B]">
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
              disabled={page === 1}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderDesktop = () => (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="sticky top-0 border-b border-slate-200 bg-slate-50">
            <tr>
              {NEGOCIOS_TABLE_COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-4 text-xs font-semibold uppercase tracking-wide text-[#64748B] ${getAlignedCellClass(column.align)}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {normalizedNegocios.map((row) => (
              <tr
                key={row.key}
                className="border-b border-gray-100 transition-colors hover:bg-slate-50/50"
              >
                <td className="px-5 py-4 text-left">
                  <div className="text-sm font-semibold text-[#111827]">{row.nombre}</div>
                  <div className="mt-0.5 text-xs text-[#64748B]">{row.tipo}</div>
                </td>
                <td className="px-5 py-4 text-left">
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getEstadoBadgeClass(row.activo)}`}>
                    {row.estadoLabel}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  <div className="flex justify-center">{renderNegocioActions(row)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {renderPagination()}
    </div>
  );

  const renderMobileItem = (row: (typeof normalizedNegocios)[number]) => (
    <MobileEntityCard
      title={row.nombre}
      subtitle={row.tipo}
      meta={
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getEstadoBadgeClass(row.activo)}`}>
          {row.estadoLabel}
        </span>
      }
      actions={renderNegocioActions(row, "end")}
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Tipo</dt>
          <dd className="text-right text-[#111827]">{row.tipo}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Estado</dt>
          <dd>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${getEstadoBadgeClass(row.activo)}`}>
              {row.estadoLabel}
            </span>
          </dd>
        </div>
      </dl>
    </MobileEntityCard>
  );

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <div className="flex justify-end">
          <button
            onClick={() => navigate("/negocios/nuevo")}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8] sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            Nuevo Negocio
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[#64748B]">Activos</div>
            <div className="text-2xl font-bold text-[#111827]">{totalActivos}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-[#64748B]">Inactivos</div>
            <div className="text-2xl font-bold text-[#64748B]">{totalInactivos}</div>
          </div>
        </div>

        {/* Filters Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-[#111827]">Filtros del listado</h2>
              <p className="text-sm text-[#64748B]">Busca negocios por nombre y alterna entre registros activos e inactivos sin salir del listado.</p>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Buscar por nombre..."
                value={tempSearch}
                onChange={(e) => setTempSearch(e.target.value)}
                className="h-11 w-full rounded-xl border border-gray-200 pl-10 pr-4 text-sm transition-all focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
              />
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex gap-1 rounded-xl bg-slate-50 p-1 sm:inline-flex">
                <button
                  type="button"
                  onClick={() => handleToggleTab(true)}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    showActivos
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                >
                  Activos
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleTab(false)}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                    !showActivos
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                >
                  Inactivos
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
                <button
                  type="submit"
                  className="h-11 rounded-xl bg-[#2563EB] px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-[#1d4ed8] sm:min-w-[140px]"
                >
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-11 rounded-xl border border-gray-200 bg-white px-4 text-sm font-medium text-[#64748B] transition-colors hover:bg-slate-50 sm:min-w-[140px]"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </form>
        </div>
        <ResponsiveDataList
          items={normalizedNegocios}
          loading={loading}
          getItemKey={(row) => row.key}
          renderDesktop={renderDesktop}
          renderMobileItem={renderMobileItem}
          mobileBreakpoint="md"
          emptyMessage="No hay negocios para mostrar"
          emptyView={
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <div className={`text-sm ${error ? "text-red-600" : "text-[#64748B]"}`}>
                {error || "No hay negocios para mostrar"}
              </div>
            </div>
          }
        />

        <div className="md:hidden">{renderPagination("rounded-2xl border border-slate-200 bg-white shadow-sm")}</div>

      <AppConfirmDialog
        open={!!negocioToDelete}
        onOpenChange={(open) => {
          if (!open) {
            setNegocioToDeleteId(null);
          }
        }}
        title="Desactivar negocio"
        message={
          negocioToDelete
            ? `¿Estás seguro de que deseas desactivar el negocio ${negocioToDelete.nombre}?`
            : ""
        }
        confirmLabel={deleting ? "Desactivando..." : "Desactivar"}
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        confirmButtonClassName="bg-red-600 text-white hover:bg-red-700"
      />

      {(detailLoading || detailError || detailNegocio) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#111827]">Detalle del negocio</h2>
                {!detailLoading && detailNegocio && (
                  <p className="mt-1 text-sm text-[#64748B]">{detailNegocio.nombre}</p>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="rounded-lg p-2 transition hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <span className="text-2xl text-[#111827]">×</span>
              </button>
            </div>

            {detailLoading && (
              <div className="text-sm text-[#64748B]">Cargando información del negocio...</div>
            )}

            {!detailLoading && detailError && (
              <div className="text-sm text-red-600">{detailError}</div>
            )}

            {!detailLoading && detailNegocio && (
              <>
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Nombre</p>
                    <p className="text-sm text-[#111827]">{detailNegocio.nombre || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Tipo</p>
                    <p className="text-sm text-[#111827]">{detailNegocio.tipo || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Estado</p>
                    <p className="text-sm text-[#111827]">{detailNegocio.activo ? "Activo" : "Inactivo"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Creado</p>
                    <p className="text-sm text-[#111827]">{detailNegocio.createdAt ? new Date(detailNegocio.createdAt).toLocaleString("es-MX") : "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Actualizado</p>
                    <p className="text-sm text-[#111827]">{detailNegocio.updatedAt ? new Date(detailNegocio.updatedAt).toLocaleString("es-MX") : "-"}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={closeDetail}
                    className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-slate-200"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
