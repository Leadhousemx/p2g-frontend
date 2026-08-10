import ClienteRating from "./ClienteRating";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { Cliente, getCliente } from "../../services/clientesService";
import ResponsiveDataList from "../common/ResponsiveDataList";
import MobileEntityCard from "../common/MobileEntityCard";
import AdminEntityActionsMenu from "../common/AdminEntityActionsMenu";
import AppConfirmDialog from "../common/AppConfirmDialog";
import { logger } from "../../lib/logger";
import { formatDateOnly } from "../../utils/dateOnly";
interface Props {
  clientes: Cliente[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (p: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onDelete?: (id: string) => Promise<void>;
  onRatingChange?: (id: string, newRating: 'bad' | 'neutral' | 'good') => Promise<void>;
  searchTerm: string;
}

function ClientesPagination({
  page,
  pageSize,
  total,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onPageChange: (p: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = total === 0 ? 0 : Math.min(page * pageSize, total);
  const visiblePages: Array<number | string> = [];

  if (safeTotalPages <= 7) {
    for (let index = 1; index <= safeTotalPages; index += 1) {
      visiblePages.push(index);
    }
  } else {
    const windowStart = Math.max(2, page - 1);
    const windowEnd = Math.min(safeTotalPages - 1, page + 1);

    visiblePages.push(1);

    if (windowStart > 2) {
      visiblePages.push("...");
    }

    for (let index = windowStart; index <= windowEnd; index += 1) {
      visiblePages.push(index);
    }

    if (windowEnd < safeTotalPages - 1) {
      visiblePages.push("...");
    }

    visiblePages.push(safeTotalPages);
  }

  return (
    <div className="border-t border-gray-100 bg-[#F9FAFB] px-5 py-4 flex-shrink-0">
      <div className="flex flex-col gap-3 text-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="text-[#64748B]">
          Mostrando {startItem}-{endItem} de {total}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <label className="flex items-center gap-2 text-sm text-[#64748B]">
            <span>Filas por pagina:</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </label>

          {safeTotalPages > 1 && (
            <div className="flex items-center gap-2">
            <button
              disabled={!hasPrevPage}
              onClick={() => onPageChange(page - 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#64748B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Anterior
            </button>
            <div className="flex items-center gap-1">
              {visiblePages.map((pageNum, index) => {
                if (pageNum === "...") {
                  return <span key={`ellipsis-${index}`} className="px-2 text-[#64748B]">...</span>;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`rounded-lg border px-3 py-2 text-sm transition ${
                      page === pageNum
                        ? "border-[#2563EB] bg-[#2563EB] text-white"
                        : "border-gray-200 text-[#64748B] hover:bg-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              disabled={!hasNextPage}
              onClick={() => onPageChange(page + 1)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#64748B] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClientesTable({
  clientes,
  loading,
  page,
  pageSize,
  total,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onPageChange,
  onPageSizeChange,
  onDelete,
  onRatingChange,
  searchTerm,
}: Props) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string|null>(null);
  const [deleting, setDeleting] = useState(false);
  const [updatingRating, setUpdatingRating] = useState<string|null>(null);
  const [detailCliente, setDetailCliente] = useState<Cliente | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const handleOpenDetail = async (clienteId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetailCliente(null);
    try {
      const data = await getCliente(clienteId);
      setDetailCliente(data);
    } catch (err: any) {
      logger.error("Error cargando detalle de cliente:", err);
      setDetailError(err?.response?.data?.message || "No se pudo cargar la información del cliente");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRatingSelect = async (clientId: string, newRating: 'bad' | 'neutral' | 'good') => {
    if (!onRatingChange) return;
    setUpdatingRating(clientId);
    try {
      await onRatingChange(clientId, newRating);
    } catch (err) {
      logger.error("Error updating rating:", err);
    } finally {
      setUpdatingRating(null);
    }
  };

  const closeDetail = () => {
    setDetailCliente(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const clienteToDelete = deleteId ? clientes.find((item) => item._id === deleteId) ?? null : null;

  const renderDesktop = () => (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm bg-[#F9FAFB]">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-gray-200 sticky top-0">
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wider text-[#64748B]">Nombre</th>
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wider text-[#64748B]">Apellidos</th>
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wider text-[#64748B]">Teléfono</th>
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wider text-[#64748B]">Email</th>
              <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wider text-[#64748B]">Calificación</th>
              <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wider text-[#64748B]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => (
              <tr key={c._id} className="border-b border-gray-100 bg-white last:border-b-0 hover:bg-gray-50/50 transition">
                <td className="px-5 py-4 whitespace-nowrap text-[#111827] font-medium">{c.nombre}</td>
                <td className="px-5 py-4 whitespace-nowrap text-[#111827]">{c.apellidos || "-"}</td>
                <td className="px-5 py-4 whitespace-nowrap text-[#64748B]">{c.telefono || "-"}</td>
                <td className="px-5 py-4 whitespace-nowrap text-[#64748B]">{c.email || "-"}</td>
                <td className="px-5 py-4 text-center">
                  <div className={updatingRating === c._id ? "opacity-50" : ""}>
                    <ClienteRating
                      value={c.calificacion}
                      onRatingSelect={(newRating: 'bad' | 'neutral' | 'good') => handleRatingSelect(c._id, newRating)}
                    />
                  </div>
                </td>
                <td className="px-5 py-4 text-center">
                  <AdminEntityActionsMenu
                    onView={() => handleOpenDetail(c._id)}
                    onEdit={() => navigate(`/clientes/${c._id}`)}
                    onDelete={onDelete ? () => setDeleteId(c._id) : undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ClientesPagination
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );

  const renderMobileItem = (cliente: Cliente) => (
    <MobileEntityCard
      title={cliente.nombre}
      subtitle={cliente.apellidos || "Sin apellidos registrados"}
      meta={<ClienteRating value={cliente.calificacion} />}
      actions={
        <AdminEntityActionsMenu
          align="end"
          onView={() => handleOpenDetail(cliente._id)}
          onEdit={() => navigate(`/clientes/${cliente._id}`)}
          onDelete={onDelete ? () => setDeleteId(cliente._id) : undefined}
        />
      }
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Teléfono</dt>
          <dd className="text-right text-[#111827]">{cliente.telefono || "-"}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Email</dt>
          <dd className="break-all text-right text-[#111827]">{cliente.email || "-"}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Calificación</dt>
          <dd className={updatingRating === cliente._id ? "opacity-50" : ""}>
            <ClienteRating
              value={cliente.calificacion}
              onRatingSelect={(newRating: 'bad' | 'neutral' | 'good') => handleRatingSelect(cliente._id, newRating)}
            />
          </dd>
        </div>
      </dl>
    </MobileEntityCard>
  );

  return (
    <>
      <ResponsiveDataList
        items={clientes}
        loading={loading}
        getItemKey={(cliente) => cliente._id}
        renderDesktop={renderDesktop}
        renderMobileItem={renderMobileItem}
        mobileBreakpoint="md"
        emptyMessage={searchTerm ? "No hay clientes que coincidan con tu busqueda" : "No hay clientes registrados"}
      />

      {total > 0 && (
        <div className="mt-4 md:hidden">
          <ClientesPagination
            page={page}
            pageSize={pageSize}
            total={total}
            totalPages={totalPages}
            hasNextPage={hasNextPage}
            hasPrevPage={hasPrevPage}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </div>
      )}

      <AppConfirmDialog
        open={!!clienteToDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Eliminar cliente"
        message={clienteToDelete ? <>¿Estás seguro de que deseas eliminar a <strong>{clienteToDelete.nombre} {clienteToDelete.apellidos}</strong>?</> : ""}
        confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={async () => {
          if (!onDelete || !clienteToDelete) return;
          setDeleting(true);
          try {
            await onDelete(clienteToDelete._id);
            setDeleteId(null);
          } catch (err) {
            logger.error("Error eliminando cliente:", err);
            alert("Error al eliminar el cliente");
          } finally {
            setDeleting(false);
          }
        }}
      />

      {(detailLoading || detailError || detailCliente) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-[#111827]">Detalle del cliente</h2>
                {!detailLoading && detailCliente && (
                  <p className="text-sm text-[#64748B] mt-1">{detailCliente.nombre} {detailCliente.apellidos || ""}</p>
                )}
              </div>
              <button
                onClick={closeDetail}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
                aria-label="Cerrar"
              >
                <span className="text-2xl text-[#111827]">×</span>
              </button>
            </div>

            {detailLoading && (
              <div className="text-sm text-[#64748B]">Cargando información del cliente...</div>
            )}

            {!detailLoading && detailError && (
              <div className="text-sm text-red-600">{detailError}</div>
            )}

            {!detailLoading && detailCliente && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Nombre</p>
                    <p className="text-sm text-[#111827]">{detailCliente.nombre}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Apellidos</p>
                    <p className="text-sm text-[#111827]">{detailCliente.apellidos || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Teléfono</p>
                    <p className="text-sm text-[#111827]">{detailCliente.telefono || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Email</p>
                    <p className="text-sm text-[#111827]">{detailCliente.email || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Código Postal</p>
                    <p className="text-sm text-[#111827]">{detailCliente.cp || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Medio</p>
                    <p className="text-sm text-[#111827]">{detailCliente.medio || "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Fecha de nacimiento</p>
                    <p className="text-sm text-[#111827]">{detailCliente.fechaNacimiento ? formatDateOnly(detailCliente.fechaNacimiento, "es-MX") : "-"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">Calificación</p>
                    <p className="text-sm text-[#111827]">
                      {detailCliente.calificacion === "good"
                        ? "Buena"
                        : detailCliente.calificacion === "neutral"
                        ? "Neutral"
                        : "Mala"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={closeDetail}
                    className="px-4 py-2.5 bg-slate-100 text-[#111827] rounded-xl font-medium text-sm hover:bg-slate-200 transition"
                  >
                    Cerrar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
