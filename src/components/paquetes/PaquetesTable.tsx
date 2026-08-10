import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { type Paquete, deletePaquete } from "../../services/paquetesService";
import AdminEntityActionsMenu from "../common/AdminEntityActionsMenu";
import AppConfirmDialog from "../common/AppConfirmDialog";
import ResponsiveDataList from "../common/ResponsiveDataList";
import MobileEntityCard from "../common/MobileEntityCard";
import { logger } from "../../lib/logger";
interface Props {
  paquetes: Paquete[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onDelete?: () => void;
  canDelete?: boolean;
}

export default function PaquetesTable({ paquetes, loading, page, pageSize, total, onPageChange, onDelete, canDelete = true }: Props) {
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const totalPages = Math.ceil(total / pageSize);

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const paqueteToDelete = deleteId ? paquetes.find((paquete) => paquete._id === deleteId) ?? null : null;

  const renderActionsMenu = (paquete: Paquete) => (
    <AdminEntityActionsMenu
      align="end"
      onEdit={() => navigate(`/paquetes/${paquete._id}/editar`)}
      onDelete={canDelete ? () => setDeleteId(paquete._id) : undefined}
    />
  );

  const renderPagination = () => (
    <div className="flex items-center justify-between border-t border-gray-200 bg-[#F9FAFB] px-5 py-4">
      <span className="text-sm text-[#64748B]">
        Mostrando {startItem}–{endItem} de {total}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="rounded-lg p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Página anterior"
        >
          <ChevronLeft size={18} className="text-[#64748B]" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
          <button
            key={pageNum}
            onClick={() => onPageChange(pageNum)}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              pageNum === page
                ? "bg-[#2563EB] text-white"
                : "text-[#64748B] hover:bg-gray-100"
            }`}
          >
            {pageNum}
          </button>
        ))}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="rounded-lg p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Página siguiente"
        >
          <ChevronRight size={18} className="text-[#64748B]" />
        </button>
      </div>
    </div>
  );

  const handleDelete = async () => {
    if (!canDelete) return;
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deletePaquete(deleteId);
      setDeleteId(null);
      if (onDelete) onDelete();
    } catch (err: any) {
      logger.error("Error al eliminar paquete:", err);
      alert("Error al eliminar paquete");
    } finally {
      setDeleting(false);
    }
  };

  const renderDesktop = () => (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="flex-1 overflow-auto">
        <table className="w-full bg-[#F9FAFB] text-sm">
          <thead>
            <tr className="sticky top-0 border-b border-gray-200 bg-[#F9FAFB]">
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Nombre</th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#64748B]">Total paquete</th>
              <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">Estado</th>
              <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paquetes.map((p) => (
              <tr key={p._id} className="border-b border-gray-100 bg-white transition last:border-b-0 hover:bg-gray-50/50">
                <td className="whitespace-nowrap px-5 py-4 font-medium text-[#111827]">{p.nombre}</td>
                <td className="whitespace-nowrap px-5 py-4 text-right font-mono text-[#111827]">
                  {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(p.totalPaquete || 0))}
                </td>
                <td className="px-5 py-4 text-center">
                  {p.activo ? (
                    <span className="inline-flex items-center rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-600">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-5 py-4 text-center">{renderActionsMenu(p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="hidden md:block">{renderPagination()}</div>
    </div>
  );

  const renderMobileItem = (paquete: Paquete) => (
    <MobileEntityCard
      title={paquete.nombre}
      subtitle="Paquete comercial activo en el catálogo"
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-[#111827]">
            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(paquete.totalPaquete || 0))}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
              paquete.activo
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-gray-200 bg-gray-100 text-gray-600"
            }`}
          >
            {paquete.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
      }
      actions={renderActionsMenu(paquete)}
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Total paquete</dt>
          <dd className="text-right font-medium text-[#111827]">
            {new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(Number(paquete.totalPaquete || 0))}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Estado</dt>
          <dd className="text-right text-[#111827]">{paquete.activo ? "Activo" : "Inactivo"}</dd>
        </div>
      </dl>
    </MobileEntityCard>
  );

  return (
    <>
      <ResponsiveDataList
        items={paquetes}
        loading={loading}
        getItemKey={(paquete: Paquete) => paquete._id}
        renderDesktop={renderDesktop}
        renderMobileItem={renderMobileItem}
        mobileBreakpoint="md"
        emptyMessage="No hay paquetes que coincidan con tu búsqueda"
      />

      {paquetes.length > 0 && <div className="mt-4 md:hidden">{renderPagination()}</div>}

      <AppConfirmDialog
        open={canDelete && !!paqueteToDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Eliminar paquete"
        message={paqueteToDelete ? `¿Estás seguro de que deseas eliminar \"${paqueteToDelete.nombre}\"? Esta acción no se puede deshacer.` : ""}
        confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
        cancelLabel="Cancelar"
        loading={deleting}
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
        onConfirm={handleDelete}
      />
    </>
  );
}
