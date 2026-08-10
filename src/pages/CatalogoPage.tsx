import { useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui";
import { Plus, Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useCatalogo } from "../hooks/useCatalogo";
import AdminEntityActionsMenu from "../components/common/AdminEntityActionsMenu";
import AppConfirmDialog from "../components/common/AppConfirmDialog";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import MobileEntityCard from "../components/common/MobileEntityCard";
import { isValidTipo, CatalogoTipo, deleteCatalogoItem } from "../services/catalogoService";
import { logger } from "../lib/logger";
import { useAuth } from "../context/auth-context";
import { canDeleteRecords } from "../utils/rolePermissions";

const TIPO_NAMES: Record<CatalogoTipo, string> = {
  platillos: "Catering",
  bebidas: "Bebidas",
  personal: "Personal",
  mobiliario: "Mobiliario",
  audio: "Audio",
  otros: "Otros",
  tipoeventos: "Tipos de Evento",
};

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function parsePositiveNumber(value: string | null, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function CatalogoPagination({
  page,
  pageSize,
  total,
  safeTotalPages,
  hasPrevPage,
  hasNextPage,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  safeTotalPages: number;
  hasPrevPage: boolean;
  hasNextPage: boolean;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
}) {
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = total === 0 ? 0 : Math.min(page * pageSize, total);

  return (
    <div className="border-t border-gray-100 bg-[#F9FAFB] px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="text-[#64748B]">{startItem}-{endItem} de {total}</div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-[#64748B]">
            <span>Filas por página:</span>
            <select
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#111827]"
            >
              {PAGE_SIZE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasPrevPage}
            onClick={() => onPageChange(page - 1)}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            Anterior
          </Button>
          <div className="text-[#64748B]">Página {page} de {safeTotalPages}</div>
          <Button
            size="sm"
            variant="outline"
            disabled={!hasNextPage}
            onClick={() => onPageChange(page + 1)}
            className="disabled:cursor-not-allowed disabled:opacity-50"
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CatalogoPage() {
  const { tipo: tipoParam } = useParams<{ tipo: string }>();
  const { user } = (useAuth() || {}) as { user?: any };
  const allowDelete = canDeleteRecords(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [page, setPage] = useState(parsePositiveNumber(searchParams.get("page"), DEFAULT_PAGE));
  const [pageSize, setPageSize] = useState(parsePositiveNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE));
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "nombre");
  const [sortOrder, setSortOrder] = useState(searchParams.get("sortOrder") === "desc" ? "desc" : "asc");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Validar tipo
  if (!tipoParam || !isValidTipo(tipoParam)) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow-lg">
        <div className="text-center">
          <p className="text-red-600 font-semibold mb-4">Tipo de catálogo inválido: {tipoParam}</p>
          <Button onClick={() => navigate("/catalogos")}>Volver a Catálogos</Button>
        </div>
      </div>
    );
  }

  const tipo: CatalogoTipo = tipoParam;
  const { items, total, totalPages, hasNextPage, hasPrevPage, loading, error: apiError, refetch } = useCatalogo({
    tipo,
    q,
    page,
    pageSize,
    sortBy,
    sortOrder,
  });

  const updateUrl = (nextValues: {
    page?: number;
    pageSize?: number;
    q?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const nextPage = nextValues.page ?? page;
    const nextPageSize = nextValues.pageSize ?? pageSize;
    const nextQ = nextValues.q ?? q;
    const nextSortBy = nextValues.sortBy ?? sortBy;
    const nextSortOrder = nextValues.sortOrder ?? sortOrder;
    const nextParams = new URLSearchParams();
    nextParams.set("page", String(nextPage));
    nextParams.set("pageSize", String(nextPageSize));
    if (nextQ) nextParams.set("q", nextQ);
    if (nextSortBy) nextParams.set("sortBy", nextSortBy);
    if (nextSortOrder) nextParams.set("sortOrder", nextSortOrder);
    setSearchParams(nextParams, { replace: true });
  };

  const handleFilter = (nextQ: string) => {
    setQ(nextQ);
    setPage(1);
    updateUrl({ q: nextQ, page: 1 });
  };

  const handlePage = (p: number) => {
    setPage(p);
    updateUrl({ page: p });
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(1);
    updateUrl({ pageSize: nextPageSize, page: 1 });
  };

  const toggleSort = (field: "nombre" | "precio" | "activo") => {
    if (sortBy !== field) {
      setSortBy(field);
      setSortOrder("asc");
      setPage(1);
      updateUrl({ sortBy: field, sortOrder: "asc", page: 1 });
      return;
    }

    const nextSortOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(nextSortOrder);
    setPage(1);
    updateUrl({ sortBy: field, sortOrder: nextSortOrder, page: 1 });
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) {
      return <ArrowUpDown size={14} className="text-[#94A3B8]" />;
    }

    return sortOrder === "asc"
      ? <ArrowUp size={14} className="text-[#2563EB]" />
      : <ArrowDown size={14} className="text-[#2563EB]" />;
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await deleteCatalogoItem(tipo, deleteId);
      setDeleteId(null);
      if (page > 1 && items.length === 1) {
        const nextPage = page - 1;
        setPage(nextPage);
        updateUrl({ page: nextPage });
      } else {
        refetch();
      }
    } catch (err) {
      logger.error("Error deleting:", err);
    } finally {
      setDeleting(false);
    }
  };

  const safeTotalPages = Math.max(1, totalPages || 1);
  const itemToDelete = deleteId ? items.find((item) => item._id === deleteId) ?? null : null;

  const renderDesktop = () => (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse bg-[#F9FAFB] text-sm">
          <thead>
            <tr className="sticky top-0 border-b border-gray-200 bg-[#F9FAFB]">
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("nombre")}>
                  <span>Nombre</span>
                  {renderSortIcon("nombre")}
                </button>
              </th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                <button type="button" className="ml-auto inline-flex items-center gap-1" onClick={() => toggleSort("precio")}>
                  <span>Precio</span>
                  {renderSortIcon("precio")}
                </button>
              </th>
              <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleSort("activo")}>
                  <span>Estado</span>
                  {renderSortIcon("activo")}
                </button>
              </th>
              <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wider text-[#64748B]">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item._id} className="border-b border-gray-100 bg-white transition last:border-b-0 hover:bg-gray-50/50">
                <td className="px-5 py-4">
                  <div className="font-medium text-[#111827]">{item.nombre}</div>
                  {item.descripcion && (
                    <div className="max-w-xs truncate text-xs text-[#64748B]">{item.descripcion}</div>
                  )}
                </td>
                <td className="whitespace-nowrap px-5 py-4 text-right font-medium text-[#111827]">
                  {tipo === "tipoeventos" ? "-" : `$${item.precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
                </td>
                <td className="px-5 py-4 text-center">
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                      item.activo
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-gray-200 bg-gray-100 text-gray-600"
                    }`}
                  >
                    {item.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex justify-end">
                    <AdminEntityActionsMenu
                      onEdit={() => navigate(`/catalogo/${tipo}/${item._id}/editar`)}
                      onDelete={allowDelete ? () => setDeleteId(item._id) : undefined}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CatalogoPagination
        page={page}
        pageSize={pageSize}
        total={total}
        safeTotalPages={safeTotalPages}
        hasPrevPage={hasPrevPage}
        hasNextPage={hasNextPage}
        onPageChange={handlePage}
        onPageSizeChange={handlePageSizeChange}
      />
    </div>
  );

  const renderMobileItem = (item) => (
    <MobileEntityCard
      title={item.nombre}
      subtitle={item.descripcion || "Sin descripción registrada"}
      meta={
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold text-[#111827] border-slate-200 bg-slate-50">
            {tipo === "tipoeventos" ? "Sin precio" : `$${item.precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
          </span>
          <span
            className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
              item.activo
                ? "border-green-200 bg-green-50 text-green-700"
                : "border-gray-200 bg-gray-100 text-gray-600"
            }`}
          >
            {item.activo ? "Activo" : "Inactivo"}
          </span>
        </div>
      }
      actions={
        <AdminEntityActionsMenu
          align="end"
          onEdit={() => navigate(`/catalogo/${tipo}/${item._id}/editar`)}
          onDelete={allowDelete ? () => setDeleteId(item._id) : undefined}
        />
      }
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Precio</dt>
          <dd className="text-right text-[#111827]">
            {tipo === "tipoeventos" ? "-" : `$${item.precio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Estado</dt>
          <dd className="text-right text-[#111827]">{item.activo ? "Activo" : "Inactivo"}</dd>
        </div>
      </dl>
    </MobileEntityCard>
  );

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="mb-6 flex justify-end">
        <Button
          asChild
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] transition whitespace-nowrap shadow-sm"
        >
          <Link to={`/catalogo/${tipo}/nuevo`}>
            <Plus size={16} /> Nuevo
          </Link>
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="relative w-full lg:w-[70%]">
            <Search className="absolute left-4 top-3.5 text-[#64748B]" size={18} />
            <input
              type="text"
              placeholder="Buscar por nombre..."
              value={q}
              onChange={(e) => handleFilter(e.target.value)}
              className="w-full h-11 pl-12 pr-4 py-3 text-sm rounded-lg border border-gray-200 focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-[#111827] placeholder-[#64748B]"
            />
          </div>
        </div>

        {apiError && (
          <div className="px-5 py-4 flex-shrink-0">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700 font-semibold mb-2">Error al cargar catálogo</p>
              <p className="text-sm text-red-600 mb-2">{apiError}</p>
              {apiError.includes("404") && (
                <p className="text-xs text-red-500 mb-4">
                  La ruta /api/catalogo/{tipo} no está disponible en el servidor
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={refetch}>Reintentar</Button>
                <Button variant="outline" onClick={() => navigate("/catalogos")}>Volver</Button>
              </div>
            </div>
          </div>
        )}

        {!apiError && (
          <>
            <ResponsiveDataList
              items={items}
              loading={loading}
              getItemKey={(item) => item._id}
              renderDesktop={renderDesktop}
              renderMobileItem={renderMobileItem}
              mobileBreakpoint="md"
              emptyMessage={q ? "No se encontraron elementos para la búsqueda actual." : "No hay elementos para mostrar."}
            />

            {!loading && items.length > 0 && (
              <div className="md:hidden">
                <CatalogoPagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  safeTotalPages={safeTotalPages}
                  hasPrevPage={hasPrevPage}
                  hasNextPage={hasNextPage}
                  onPageChange={handlePage}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </>
        )}
        </div>
      </div>

      <AppConfirmDialog
        open={allowDelete && !!itemToDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="Eliminar elemento"
        message={itemToDelete ? `¿Estás seguro de que deseas eliminar \"${itemToDelete.nombre}\"? Esta acción no se puede deshacer.` : ""}
        confirmLabel={deleting ? "Eliminando..." : "Eliminar"}
        cancelLabel="Cancelar"
        loading={deleting}
        confirmButtonClassName="bg-red-600 hover:bg-red-700"
        onConfirm={handleDelete}
      />
    </div>
  );
}
