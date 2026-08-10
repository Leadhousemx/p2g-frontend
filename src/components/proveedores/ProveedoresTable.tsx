import { Proveedor, ProveedorDetalle, getProveedor } from "../../services/proveedoresService";
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { useToast } from "../ui/use-toast";
import ResponsiveDataList from "../common/ResponsiveDataList";
import MobileEntityCard from "../common/MobileEntityCard";
import AdminEntityActionsMenu from "../common/AdminEntityActionsMenu";
import AppConfirmDialog from "../common/AppConfirmDialog";
import { logger } from "../../lib/logger";

interface Props {
  proveedores: Proveedor[];
  loading: boolean;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  searchTerm?: string;
  sortBy?: "createdAt" | "updatedAt" | "nombreComercial" | "razonSocial" | "rfc" | "email" | "telefono" | "contactoNombre" | "formaPago" | "activo" | "";
  sortOrder?: "asc" | "desc" | "";
  onEdit: (id: string) => void;
  onDelete?: (id: string) => Promise<void>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange?: (field: "nombreComercial" | "rfc" | "telefono" | "email" | "formaPago" | "activo") => void;
}

export default function ProveedoresTable({ proveedores, loading, page, pageSize, total, totalPages, hasNextPage, hasPrevPage, searchTerm = "", sortBy = "", sortOrder = "", onEdit, onDelete, onPageChange, onPageSizeChange, onSortChange }: Props) {
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailProveedor, setDetailProveedor] = useState<ProveedorDetalle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const safeTotalPages = Math.max(1, totalPages || 1);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);
  const proveedorToDelete = deleteId ? proveedores.find((item) => item._id === deleteId) ?? null : null;

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={14} className="text-[#94A3B8]" />;
    }

    return sortOrder === "asc"
      ? <ArrowUp size={14} className="text-[#2563EB]" />
      : <ArrowDown size={14} className="text-[#2563EB]" />;
  };

  const renderSortableHeader = (label: string, field: "nombreComercial" | "rfc" | "telefono" | "email" | "formaPago" | "activo", align: "left" | "right" | "center" = "left") => (
    <button
      type="button"
      className={`inline-flex items-center gap-1 ${align === "right" ? "ml-auto" : ""} ${align === "center" ? "justify-center" : ""}`}
      onClick={() => onSortChange?.(field)}
    >
      <span>{label}</span>
      {renderSortIcon(field)}
    </button>
  );

  const handleOpenDetail = async (proveedorId: string) => {
    setDetailLoading(true);
    setDetailError(null);
    setDetailProveedor(null);
    try {
      const data = await getProveedor(proveedorId);
      setDetailProveedor(data);
    } catch (err: any) {
      logger.error("Error cargando detalle de proveedor:", err);
      setDetailError(err?.response?.data?.message || "No se pudo cargar la información del proveedor");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailProveedor(null);
    setDetailError(null);
    setDetailLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!onDelete) return;
    setDeleting(true);
    try {
      await onDelete(id);
      toast({ title: "Proveedor eliminado", variant: "success" });
    } catch (error: any) {
      const message = error?.response?.data?.message || "Error al eliminar el proveedor";
      if (message.includes("compras")) {
        toast({
          title: "No se puede eliminar: Este proveedor tiene compras asociadas",
          variant: "destructive"
        });
      } else {
        toast({ title: `Error: ${message}`, variant: "destructive" });
      }
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  const renderDesktop = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col flex-1">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm bg-[#F9FAFB]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 sticky top-0">
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">{renderSortableHeader("Nombre comercial", "nombreComercial")}</th>
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">{renderSortableHeader("RFC", "rfc")}</th>
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">{renderSortableHeader("Teléfono", "telefono")}</th>
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">{renderSortableHeader("Email", "email")}</th>
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">{renderSortableHeader("Pago", "formaPago")}</th>
              <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">{renderSortableHeader("Estado", "activo")}</th>
              <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {proveedores.map((p) => (
              <tr key={p._id} className="border-b border-gray-100 bg-white hover:bg-gray-50/50 transition">
                <td className="px-5 py-4">
                  <div className="font-semibold text-[#111827]">{p.nombreComercial}</div>
                  <div className="mt-1 text-xs text-[#64748B]">{p.razonSocial || "Sin razón social"}</div>
                </td>
                <td className="px-5 py-4 whitespace-nowrap text-[#64748B]">{p.rfc || "-"}</td>
                <td className="px-5 py-4 whitespace-nowrap text-[#64748B]">{p.telefono || "-"}</td>
                <td className="px-5 py-4 whitespace-nowrap text-[#64748B]">{p.email || "-"}</td>
                <td className="px-5 py-4 whitespace-nowrap text-[#64748B] capitalize">{p.formaPago || "-"}</td>
                <td className="px-5 py-4 whitespace-nowrap text-[#64748B]">{p.activo ? "Activo" : "Inactivo"}</td>
                <td className="px-5 py-4 text-center">
                  <AdminEntityActionsMenu
                    onView={() => handleOpenDetail(p._id)}
                    onEdit={() => onEdit(p._id)}
                    onDelete={onDelete ? () => setDeleteId(p._id) : undefined}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-gray-200 bg-[#F9FAFB] px-5 py-4 md:flex-row md:items-center md:justify-between">
        <span className="text-sm text-[#64748B]">
          Mostrando {startItem}–{endItem} de {total}
        </span>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <span>Filas por página:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={!hasPrevPage}
              className="rounded-lg p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Página anterior"
            >
              <ChevronLeft size={18} className="text-[#64748B]" />
            </button>

            {(() => {
              const pages: (number | string)[] = [];
              const maxVisible = 7;

              if (safeTotalPages <= maxVisible) {
                for (let index = 1; index <= safeTotalPages; index += 1) pages.push(index);
              } else {
                const start = Math.max(1, page - 2);
                const end = Math.min(safeTotalPages, page + 2);

                pages.push(1);
                if (start > 2) pages.push("...");
                for (let index = start; index <= end; index += 1) {
                  if (!pages.includes(index)) pages.push(index);
                }
                if (end < safeTotalPages - 1) pages.push("...");
                if (!pages.includes(safeTotalPages)) pages.push(safeTotalPages);
              }

              return pages.map((pageNum, idx) =>
                pageNum === "..." ? (
                  <span key={`ellipsis-${idx}`} className="px-2 py-2 text-[#64748B]">…</span>
                ) : (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum as number)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                      pageNum === page
                        ? "bg-[#2563EB] text-white"
                        : "text-[#64748B] hover:bg-gray-100"
                    }`}
                  >
                    {pageNum}
                  </button>
                )
              );
            })()}

            <button
              onClick={() => onPageChange(page + 1)}
              disabled={!hasNextPage}
              className="rounded-lg p-2 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Página siguiente"
            >
              <ChevronRight size={18} className="text-[#64748B]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMobileItem = (proveedor: Proveedor) => (
    <MobileEntityCard
      title={proveedor.nombreComercial}
      subtitle={proveedor.razonSocial || "Sin razón social"}
      meta={
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
          proveedor.activo ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
        }`}>
          {proveedor.activo ? "Activo" : "Inactivo"}
        </span>
      }
      actions={
        <AdminEntityActionsMenu
          onView={() => handleOpenDetail(proveedor._id)}
          onEdit={() => onEdit(proveedor._id)}
          onDelete={onDelete ? () => setDeleteId(proveedor._id) : undefined}
        />
      }
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">RFC</dt>
          <dd className="text-right text-[#111827]">{proveedor.rfc || "-"}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Teléfono</dt>
          <dd className="text-right text-[#111827]">{proveedor.telefono || "-"}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Email</dt>
          <dd className="break-all text-right text-[#111827]">{proveedor.email || "-"}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Forma de pago</dt>
          <dd className="text-right text-[#111827] capitalize">{proveedor.formaPago || "-"}</dd>
        </div>
      </dl>
    </MobileEntityCard>
  );

  return (
    <>
      <ResponsiveDataList
        items={proveedores}
        loading={loading}
        getItemKey={(proveedor) => proveedor._id}
        renderDesktop={renderDesktop}
        renderMobileItem={renderMobileItem}
        mobileBreakpoint="md"
        emptyMessage={searchTerm ? "No hay proveedores que coincidan con la búsqueda o filtros actuales." : "No hay proveedores para mostrar."}
      />

      {!loading && proveedores.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:hidden">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 text-sm text-[#64748B]">
              <span>Mostrando {startItem}–{endItem} de {total}</span>
              <div className="flex items-center gap-2">
                <span>Filas:</span>
                <select
                  value={pageSize}
                  onChange={(e) => onPageSizeChange(Number(e.target.value))}
                  className="h-9 rounded-lg border border-gray-200 bg-white px-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {safeTotalPages > 1 ? (
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={() => onPageChange(page - 1)}
                  disabled={!hasPrevPage}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#64748B] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <span className="text-sm font-medium text-[#111827]">Página {page} de {safeTotalPages}</span>
                <button
                  onClick={() => onPageChange(page + 1)}
                  disabled={!hasNextPage}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-[#64748B] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente <ChevronRight size={16} />
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <AppConfirmDialog
        open={!!proveedorToDelete && !!onDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Eliminar proveedor"
        message={proveedorToDelete ? <>¿Deseas eliminar a <strong>{proveedorToDelete.nombreComercial}</strong>? Esta acción no se puede deshacer.</> : ""}
        confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
        cancelLabel="Cancelar"
        loading={deleting}
        onConfirm={() => {
          if (!deleteId) return;
          return handleDelete(deleteId);
        }}
      />

      {(detailLoading || detailError || detailProveedor) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
            <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-xl font-bold text-[#111827]">Detalle del proveedor</h2>
                {!detailLoading && detailProveedor && (
                  <p className="mt-1 text-sm text-[#64748B]">{detailProveedor.nombreComercial}</p>
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
              <div className="text-sm text-[#64748B]">Cargando información del proveedor...</div>
            )}

            {!detailLoading && detailError && (
              <div className="text-sm text-red-600">{detailError}</div>
            )}

            {!detailLoading && detailProveedor && (
              <>
                <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Nombre comercial</p>
                    <p className="text-sm text-[#111827]">{detailProveedor.nombreComercial || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Razón social</p>
                    <p className="text-sm text-[#111827]">{detailProveedor.razonSocial || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">RFC</p>
                    <p className="text-sm text-[#111827]">{detailProveedor.rfc || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Teléfono</p>
                    <p className="text-sm text-[#111827]">{detailProveedor.telefono || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Email</p>
                    <p className="break-all text-sm text-[#111827]">{detailProveedor.email || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Contacto</p>
                    <p className="text-sm text-[#111827]">{detailProveedor.contactoNombre || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Forma de pago</p>
                    <p className="text-sm capitalize text-[#111827]">{detailProveedor.formaPago || "-"}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Estado</p>
                    <p className="text-sm text-[#111827]">{detailProveedor.activo ? "Activo" : "Inactivo"}</p>
                  </div>
                </div>

                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-3 font-semibold text-blue-900">Resumen</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs uppercase text-blue-600">Compras realizadas</p>
                      <p className="text-2xl font-bold text-blue-900">{detailProveedor.cantidadCompras ?? 0}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-blue-600">Total de compras</p>
                      <p className="text-2xl font-bold text-blue-900">${(detailProveedor.totalCompras ?? 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</p>
                    </div>
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
    </>
  );
}
