import type { Compra } from "../../services/comprasService";
import type { GastoOperativo } from "../../services/gastosOperativosService";
import type { RegistroGastoFijo } from "../../services/registrosGastosFijosService";
import type { GastoListadoItem } from "../../types/gastosListado";
import { Skeleton } from "../ui/skeleton";
import AdminEntityActionsMenu from "../common/AdminEntityActionsMenu";
import AppConfirmDialog from "../common/AppConfirmDialog";
import MobileEntityCard from "../common/MobileEntityCard";
import { ChevronLeft, ChevronRight, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { formatDateOnly } from "../../utils/dateOnly";

interface Props {
  data: GastoListadoItem[];
  total: number;
  loading: boolean;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  tipoRegistro: "todos" | "operativos" | "fijos";
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onDelete?: (item: GastoListadoItem) => void;
}

function toSafeNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBusinessDate(value: unknown): string {
  return formatDateOnly(value, "es-MX", { day: "numeric", month: "numeric", year: "numeric" });
}

function isCompraRecord(item: GastoListadoItem): item is GastoListadoItem & { raw: Compra } {
  return item.tipoRegistro === "compra" && Boolean(item.raw);
}

function isGastoOperativoRecord(item: GastoListadoItem): item is GastoListadoItem & { raw: GastoOperativo } {
  return (item.tipoRegistro === "operativo" || item.sourceEndpoint === "/gastos-operativos") && Boolean(item.raw);
}

function isRegistroGastoFijoRecord(item: GastoListadoItem): item is GastoListadoItem & { raw: RegistroGastoFijo } {
  return (item.tipoRegistro === "fijo" || item.sourceEndpoint === "/registros-gastos-fijos") && Boolean(item.raw);
}

function getTotal(item: GastoListadoItem): number {
  return toSafeNumber((item.raw as any)?.totalCompra ?? (item.raw as any)?.total ?? item.total);
}

function getStatus(item: GastoListadoItem): "Pagado" | "Pendiente" | "No aplica" {
  return item.estadoPago || "No aplica";
}

function getDocumentTitle(item: GastoListadoItem): string {
  if (item.documentoTipo) {
    return item.documentoTipo;
  }

  if (item.tipoRegistro === "operativo") {
    return "Operación";
  }

  if (item.tipoRegistro === "fijo") {
    return "Gasto fijo";
  }

  return "Compra";
}

function getDocumentSubtitle(item: GastoListadoItem): string {
  if (item.documentoFolio) {
    return item.documentoFolio;
  }

  return item.eventoNombre || "-";
}

function getDetailPrimary(item: GastoListadoItem): string {
  return item.descripcionPrincipal || item.proveedorNombre || "-";
}

function getDetailSecondary(item: GastoListadoItem): string {
  return item.proveedorNombre || item.eventoNombre || item.subtipoRegistro || item.metodoPago || item.sourceEndpoint || "-";
}

function getTipoRegistroLabel(tipoRegistro: GastoListadoItem["tipoRegistro"]): string {
  if (tipoRegistro === "compra") {
    return "Compra";
  }

  if (tipoRegistro === "operativo") {
    return "Operación";
  }

  return "Gasto fijo";
}

function formatMoney(value: number): string {
  return Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(value);
}

export function ComprasTable({
  data,
  total,
  loading,
  page,
  pageSize,
  totalPages,
  hasNextPage,
  hasPrevPage,
  tipoRegistro,
  onPageChange,
  onPageSizeChange,
  onDelete,
}: Props) {
  const navigate = useNavigate();
  const [deleteModal, setDeleteModal] = useState<GastoListadoItem | null>(null);
  const [detailItem, setDetailItem] = useState<GastoListadoItem | null>(null);
  const safeTotalPages = Math.max(1, totalPages || 1);
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  const pages = useMemo(() => {
    if (safeTotalPages <= 7) {
      return Array.from({ length: safeTotalPages }, (_, i) => i + 1);
    }

    const result = (() => {
      const arr: (number | string)[] = [1];
      if (page <= 4) {
        for (let i = 2; i <= 5; i++) arr.push(i);
        arr.push("...", safeTotalPages);
      } else if (page >= safeTotalPages - 3) {
        arr.push("...");
        for (let i = safeTotalPages - 4; i <= safeTotalPages; i++) arr.push(i);
      } else {
        arr.push("...");
        for (let i = page - 1; i <= page + 1; i++) arr.push(i);
        arr.push("...", safeTotalPages);
      }
      return arr;
    })();

    return result;
  }, [page, safeTotalPages]);

  const emptyLabel = tipoRegistro === "operativos"
    ? "No hay gastos operativos para los filtros seleccionados."
    : tipoRegistro === "fijos"
      ? "No hay registros de gastos fijos para los filtros seleccionados."
      : "No hay gastos para los filtros seleccionados.";

  const handleDuplicate = (compra: Compra) => {
    sessionStorage.setItem(
      "duplicateCompra",
      JSON.stringify({
        compraId: compra._id,
        snapshot: compra,
      })
    );
    navigate("/compras/nueva?tipo=compras");
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal && onDelete) {
      await onDelete(deleteModal);
      setDeleteModal(null);
    }
  };

  const handleCloseDetail = () => {
    setDetailItem(null);
  };

  const getDetailTitle = (item: GastoListadoItem) => {
    if (item.tipoRegistro === "compra") {
      return `Compra ${item.folio}`;
    }

    if (item.tipoRegistro === "operativo") {
      return `Operación ${item.folio}`;
    }

    return `Gasto fijo ${item.folio}`;
  };

  const renderDetailItems = (item: GastoListadoItem) => {
    if (isCompraRecord(item)) {
      return (
        <>
          <div className="space-y-3 sm:hidden">
            {item.raw.items.map((detail, idx) => (
              <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <div className="mb-3 break-words text-sm font-semibold text-[#111827]">{detail.productoNombre}</div>
                <dl className="space-y-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Cantidad</dt>
                    <dd className="text-right text-[#111827]">{detail.cantidad}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Precio unitario</dt>
                    <dd className="text-right text-[#111827]">{formatMoney(detail.precioUnitario)}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Subtotal</dt>
                    <dd className="text-right font-semibold text-[#111827]">{formatMoney(detail.subtotal)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Producto</th>
                  <th className="px-4 py-2 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Cantidad</th>
                  <th className="px-4 py-2 text-right font-semibold text-xs uppercase tracking-wide text-[#64748B]">Precio unitario</th>
                  <th className="px-4 py-2 text-right font-semibold text-xs uppercase tracking-wide text-[#64748B]">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {item.raw.items.map((detail, idx) => (
                  <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50/50">
                    <td className="px-4 py-2 text-sm text-[#111827]">{detail.productoNombre}</td>
                    <td className="px-4 py-2 text-center text-sm text-[#111827]">{detail.cantidad}</td>
                    <td className="px-4 py-2 text-right text-sm text-[#111827]">{formatMoney(detail.precioUnitario)}</td>
                    <td className="px-4 py-2 text-right text-sm font-semibold text-[#111827]">{formatMoney(detail.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (isGastoOperativoRecord(item)) {
      return (
        <>
          <div className="space-y-3 sm:hidden">
            {item.raw.items.map((detail, idx) => {
              const lineTotal = toSafeNumber(detail.total ?? detail.cantidad * detail.precio);

              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-3 break-words text-sm font-semibold text-[#111827]">{detail.nombreServicio}</div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Cantidad</dt>
                      <dd className="text-right text-[#111827]">{detail.cantidad}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Precio</dt>
                      <dd className="text-right text-[#111827]">{formatMoney(detail.precio)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Total</dt>
                      <dd className="text-right font-semibold text-[#111827]">{formatMoney(lineTotal)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Servicio</th>
                  <th className="px-4 py-2 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Cantidad</th>
                  <th className="px-4 py-2 text-right font-semibold text-xs uppercase tracking-wide text-[#64748B]">Precio</th>
                  <th className="px-4 py-2 text-right font-semibold text-xs uppercase tracking-wide text-[#64748B]">Total</th>
                </tr>
              </thead>
              <tbody>
                {item.raw.items.map((detail, idx) => {
                  const lineTotal = toSafeNumber(detail.total ?? detail.cantidad * detail.precio);

                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-sm text-[#111827]">{detail.nombreServicio}</td>
                      <td className="px-4 py-2 text-center text-sm text-[#111827]">{detail.cantidad}</td>
                      <td className="px-4 py-2 text-right text-sm text-[#111827]">{formatMoney(detail.precio)}</td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-[#111827]">{formatMoney(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    if (isRegistroGastoFijoRecord(item)) {
      return (
        <>
          <div className="space-y-3 sm:hidden">
            {item.raw.items.map((detail, idx) => {
              const lineTotal = toSafeNumber(detail.total ?? detail.precio);

              return (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                  <div className="mb-3 break-words text-sm font-semibold text-[#111827]">{detail.nombreGastoFijo}</div>
                  <dl className="space-y-2 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Precio</dt>
                      <dd className="text-right text-[#111827]">{formatMoney(detail.precio)}</dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Total</dt>
                      <dd className="text-right font-semibold text-[#111827]">{formatMoney(lineTotal)}</dd>
                    </div>
                  </dl>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Concepto</th>
                  <th className="px-4 py-2 text-right font-semibold text-xs uppercase tracking-wide text-[#64748B]">Precio</th>
                  <th className="px-4 py-2 text-right font-semibold text-xs uppercase tracking-wide text-[#64748B]">Total</th>
                </tr>
              </thead>
              <tbody>
                {item.raw.items.map((detail, idx) => {
                  const lineTotal = toSafeNumber(detail.total ?? detail.precio);

                  return (
                    <tr key={idx} className="border-b border-gray-100 hover:bg-slate-50/50">
                      <td className="px-4 py-2 text-sm text-[#111827]">{detail.nombreGastoFijo}</td>
                      <td className="px-4 py-2 text-right text-sm text-[#111827]">{formatMoney(detail.precio)}</td>
                      <td className="px-4 py-2 text-right text-sm font-semibold text-[#111827]">{formatMoney(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      );
    }

    return <div className="text-sm text-[#64748B]">No hay detalle disponible para este registro.</div>;
  };

  const renderDetailSummary = (item: GastoListadoItem) => {
    if (isCompraRecord(item)) {
      const subtotal = toSafeNumber((item.raw as any)?.subtotalProductos ?? (item.raw as any)?.monto ?? item.total);
      const descuento = toSafeNumber((item.raw as any)?.descuento);
      const totalCompra = toSafeNumber((item.raw as any)?.totalCompra ?? (item.raw as any)?.total ?? item.total);

      return (
        <div className="rounded-xl bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm text-[#64748B]">Subtotal</span>
            <span className="text-sm font-semibold text-[#111827]">{formatMoney(subtotal)}</span>
          </div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-sm text-[#64748B]">Descuento</span>
            <span className="text-sm font-semibold text-[#111827]">{formatMoney(descuento)}</span>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
            <span className="text-base font-bold text-[#111827]">Total</span>
            <span className="text-base font-bold text-[#2563EB]">{formatMoney(totalCompra)}</span>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-[#111827]">Total</span>
          <span className="text-base font-bold text-[#2563EB]">{formatMoney(getTotal(item))}</span>
        </div>
      </div>
    );
  };

  const renderStatusBadge = (item: GastoListadoItem) => {
    const status = getStatus(item);

    return (
      <span
        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${
          status === "Pagado"
            ? "bg-green-50 text-green-700 border-green-200"
            : status === "Pendiente"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-slate-100 text-slate-700 border-slate-200"
        }`}
      >
        {status}
      </span>
    );
  };

  const renderTipoBadge = (item: GastoListadoItem) => (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
        item.tipoRegistro === "compra"
          ? "border-blue-200 bg-blue-50 text-blue-700"
          : item.tipoRegistro === "operativo"
            ? "border-orange-200 bg-orange-50 text-orange-700"
            : "border-cyan-200 bg-cyan-50 text-cyan-700"
      }`}
    >
      {getTipoRegistroLabel(item.tipoRegistro)}
    </span>
  );

  const renderActions = (item: GastoListadoItem) => (
    <div className="flex items-center justify-center gap-2">
      {isCompraRecord(item) && getStatus(item) === "Pendiente" && (
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition hover:bg-green-100"
          onClick={() => navigate(`/compras/${item.origenId}/pagos`)}
          title="Registrar pago"
          aria-label="Registrar pago"
        >
          <CreditCard size={14} />
        </button>
      )}

      <AdminEntityActionsMenu
        onView={() => setDetailItem(item)}
        onEdit={isCompraRecord(item) ? () => navigate(`/compras/${item.origenId}/editar`) : undefined}
        onDuplicate={isCompraRecord(item) ? () => handleDuplicate(item.raw) : undefined}
        onDelete={onDelete ? () => setDeleteModal(item) : undefined}
      />
    </div>
  );

  return (
    <>
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
        {loading ? (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {Array.from({ length: pageSize }).map((_, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <Skeleton className="h-5 w-1/3" />
                  <Skeleton className="mt-3 h-4 w-1/2" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-4 h-20 w-full" />
                </div>
              ))}
            </div>

            <div className="hidden flex-1 overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Folio</th>
                    <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Fecha</th>
                    <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Tipo</th>
                    <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Referencia</th>
                    <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Detalle</th>
                    <th className="px-5 py-4 text-right font-semibold text-xs uppercase tracking-wide text-[#64748B]">Total</th>
                    <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Estado</th>
                    <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: pageSize }).map((_, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td colSpan={8} className="px-5 py-4"><Skeleton className="h-4 w-full" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : data.length === 0 ? (
          <div className="px-5 py-8 text-center text-[#64748B]">{emptyLabel}</div>
        ) : (
          <>
            <div className="space-y-3 p-4 md:hidden">
              {data.map((item) => (
                <MobileEntityCard
                  key={item.id}
                  title={item.folio}
                  subtitle={formatBusinessDate(item.fecha)}
                  meta={
                    <div className="flex flex-wrap items-center gap-2">
                      {renderTipoBadge(item)}
                      {renderStatusBadge(item)}
                      <span className="text-sm font-semibold text-[#111827]">{formatMoney(getTotal(item))}</span>
                    </div>
                  }
                  actions={renderActions(item)}
                >
                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Referencia</dt>
                      <dd className="text-right text-[#111827]">
                        <div className="font-medium">{getDocumentTitle(item)}</div>
                        <div className="text-xs text-[#64748B]">{getDocumentSubtitle(item)}</div>
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Detalle</dt>
                      <dd className="text-right text-[#111827]">
                        <div className="font-medium">{getDetailPrimary(item)}</div>
                        <div className="text-xs text-[#64748B]">{getDetailSecondary(item)}</div>
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Total</dt>
                      <dd className="text-right font-semibold text-[#111827]">{formatMoney(getTotal(item))}</dd>
                    </div>
                  </dl>
                </MobileEntityCard>
              ))}
            </div>

            <div className="hidden flex-1 overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Folio</th>
                    <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Fecha</th>
                    <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Tipo</th>
                    <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Referencia</th>
                    <th className="px-5 py-4 text-left font-semibold text-xs uppercase tracking-wide text-[#64748B]">Detalle</th>
                    <th className="px-5 py-4 text-right font-semibold text-xs uppercase tracking-wide text-[#64748B]">Total</th>
                    <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Estado</th>
                    <th className="px-5 py-4 text-center font-semibold text-xs uppercase tracking-wide text-[#64748B]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-slate-50/50 transition">
                      <td className="px-5 py-4 whitespace-nowrap font-mono text-sm text-[#111827]">{item.folio}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm text-[#111827]">{formatBusinessDate(item.fecha)}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">{renderTipoBadge(item)}</td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="font-medium text-sm text-[#111827]">{getDocumentTitle(item)}</div>
                        <div className="text-xs text-[#64748B]">{getDocumentSubtitle(item)}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="text-sm text-[#111827] font-medium">{getDetailPrimary(item)}</div>
                        <div className="text-xs text-[#64748B]">{getDetailSecondary(item)}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-right font-bold text-sm text-[#111827]">
                        {formatMoney(getTotal(item))}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">{renderStatusBadge(item)}</td>
                      <td className="px-5 py-4 whitespace-nowrap text-center">{renderActions(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Paginación */}
        {safeTotalPages > 1 && (
          <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-[#64748B]">
              Mostrando <span className="font-semibold text-[#111827]">{startItem}–{endItem}</span> de <span className="font-semibold text-[#111827]">{total}</span>
              </div>
              <div className="flex flex-col gap-3 lg:min-w-[420px] lg:items-end">
                <div className="flex items-center justify-between gap-2 sm:justify-start">
                  <label htmlFor="pageSize" className="text-sm text-[#64748B]">Filas por página:</label>
                  <select
                    id="pageSize"
                    value={pageSize}
                    onChange={(e) => onPageSizeChange(Number(e.target.value))}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-[#111827] focus:ring-2 focus:ring-[#2563EB]"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-2 md:hidden">
                  <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={!hasPrevPage}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-[#111827] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} className="text-[#64748B]" />
                    Anterior
                  </button>
                  <span className="min-w-0 text-center text-sm font-medium text-[#111827]">
                    Página {page} de {safeTotalPages}
                  </span>
                  <button
                    onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
                    disabled={!hasNextPage}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-[#111827] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Próxima página"
                  >
                    Siguiente
                    <ChevronRight size={16} className="text-[#64748B]" />
                  </button>
                </div>

                <div className="hidden flex-wrap items-center gap-2 md:flex md:justify-end">
                  <button
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={!hasPrevPage}
                    className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Página anterior"
                  >
                    <ChevronLeft size={16} className="text-[#64748B]" />
                  </button>
                  {pages.map((p, i) =>
                    p === "..." ? (
                      <span key={`ellipsis-${i}`} className="px-2 text-[#64748B]">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => onPageChange(p as number)}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                          p === page
                            ? "bg-[#2563EB] text-white"
                            : "border border-slate-200 text-[#111827] hover:bg-slate-50"
                        }`}
                        aria-label={`Página ${p}`}
                        aria-current={p === page ? "page" : undefined}
                      >
                        {p}
                      </button>
                    )
                  )}
                  <button
                    onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
                    disabled={!hasNextPage}
                    className="rounded-lg border border-slate-200 p-1.5 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Próxima página"
                  >
                    <ChevronRight size={16} className="text-[#64748B]" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de detalle de gasto */}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden rounded-none bg-white sm:h-auto sm:max-h-[90vh] sm:rounded-2xl">
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-4 pb-4 pt-4 sm:px-6 sm:pb-5 sm:pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-[#111827] sm:text-xl">{getDetailTitle(detailItem)}</h2>
                  <p className="mt-1 text-sm text-[#64748B]">{formatBusinessDate(detailItem.fecha)}</p>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="rounded-lg p-2 transition hover:bg-slate-100"
                  aria-label="Cerrar"
                >
                  <span className="text-2xl text-[#111827]">×</span>
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
              <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Tipo de registro</p>
                  <p className="break-words text-sm text-[#111827]">{getTipoRegistroLabel(detailItem.tipoRegistro)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Referencia</p>
                  <p className="break-words text-sm text-[#111827]">{getDocumentTitle(detailItem)} {getDocumentSubtitle(detailItem)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Detalle</p>
                  <p className="break-words text-sm text-[#111827]">{getDetailPrimary(detailItem)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Método de pago</p>
                  <p className="text-sm text-[#111827]">{detailItem.metodoPago || "-"}</p>
                </div>
                {isCompraRecord(detailItem) && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Forma de pago</p>
                    <p className="text-sm text-[#111827]">{detailItem.raw.formaPago}</p>
                  </div>
                )}
                {detailItem.eventoNombre && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 sm:border-0 sm:bg-transparent sm:p-0">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Evento</p>
                    <p className="text-sm text-[#111827]">{detailItem.eventoNombre}</p>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[#111827]">
                  {detailItem.tipoRegistro === "compra" ? "Artículos" : "Conceptos"}
                </h3>
                {renderDetailItems(detailItem)}
              </div>

              {renderDetailSummary(detailItem)}
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">
              <div className="flex justify-stretch sm:justify-end">
              <button
                onClick={handleCloseDetail}
                className="w-full rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-slate-200 sm:w-auto"
              >
                Cerrar
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AppConfirmDialog
        open={Boolean(deleteModal)}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteModal(null);
          }
        }}
        title="Eliminar gasto"
        message={
          deleteModal
            ? `¿Estás seguro de que deseas eliminar ${getTipoRegistroLabel(deleteModal.tipoRegistro).toLowerCase()} ${deleteModal.folio}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
        onConfirm={handleDeleteConfirm}
      />
    </>
  );
}
