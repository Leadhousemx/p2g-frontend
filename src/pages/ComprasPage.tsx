import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ComprasFilters } from "../components/compras/ComprasFilters";
import { ComprasTable } from "../components/compras/ComprasTable";
import ContentShell from "../components/common/ContentShell";
import { useGastosListado, type GastosListadoFilters } from "../hooks/useGastosListado";
import type { GastoListadoItem } from "../types/gastosListado";
import { useProveedoresLite } from "../hooks/useProveedoresLite";
import { useAuth } from "../context/auth-context";
import { canDeleteRecords } from "../utils/rolePermissions";

function parseTipoRegistro(value: string | null): GastosListadoFilters["tipoRegistro"] {
  if (value === "todos" || value === "operativos" || value === "fijos") {
    return value;
  }

  return "todos";
}

function normalizeGastosFilters(filters: Partial<GastosListadoFilters>) {
  const tipoRegistro = filters.tipoRegistro || "todos";
  const page = Math.max(1, Number(filters.page || 1));
  const pageSize = Math.max(1, Number(filters.pageSize || 10));
  const normalizeText = (value?: string) => String(value || "").trim();
  const normalizeMoney = (value?: number) => {
    if (value === undefined || value === null || value === ("" as any)) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  return {
    tipoRegistro,
    q: normalizeText(filters.q),
    folio: normalizeText(filters.folio),
    proveedorId: tipoRegistro === "todos" ? normalizeText(filters.proveedorId) : undefined,
    metodoPago: normalizeText(filters.metodoPago),
    fechaInicio: normalizeText(filters.fechaInicio),
    fechaFin: normalizeText(filters.fechaFin),
    minTotal: normalizeMoney(filters.minTotal),
    maxTotal: normalizeMoney(filters.maxTotal),
    page,
    pageSize,
    sortBy: filters.sortBy || "fecha",
    sortOrder: filters.sortOrder === "asc" ? "asc" : "desc",
  } satisfies GastosListadoFilters;
}

export default function ComprasPage() {
  const navigate = useNavigate();
  const auth = useAuth() as any;
  const user = auth?.user;
  const allowDelete = canDeleteRecords(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const { proveedores, loading: loadingProveedores } = useProveedoresLite();

  const defaultTipoRegistro = parseTipoRegistro(searchParams.get("tipoRegistro"));
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "10", 10) || 10);

  const [filters, setFilters] = useState<GastosListadoFilters>(() => normalizeGastosFilters({
    tipoRegistro: defaultTipoRegistro,
    q: searchParams.get("q") || "",
    folio: searchParams.get("folio") || "",
    proveedorId: searchParams.get("proveedorId") || "",
    metodoPago: searchParams.get("metodoPago") || "",
    fechaInicio: searchParams.get("fechaInicio") || "",
    fechaFin: searchParams.get("fechaFin") || "",
    minTotal: searchParams.get("minTotal") ? Number(searchParams.get("minTotal")) : undefined,
    maxTotal: searchParams.get("maxTotal") ? Number(searchParams.get("maxTotal")) : undefined,
    page,
    pageSize,
    sortBy: (searchParams.get("sortBy") as GastosListadoFilters["sortBy"]) || "fecha",
    sortOrder: (searchParams.get("sortOrder") as GastosListadoFilters["sortOrder"]) || "desc",
  }));

  const {
    gastos,
    total,
    loading,
    error,
    list,
    totalPages,
    currentPage,
    currentPageSize,
    hasNextPage,
    hasPrevPage,
    removeCompra,
    removeGastoOperativo,
    removeRegistroGastoFijo,
  } = useGastosListado(filters);

  const handleSearch = (newFilters: any) => {
    const normalizedFilters = normalizeGastosFilters({
      tipoRegistro: parseTipoRegistro(newFilters.tipoRegistro),
      q: newFilters.q,
      folio: newFilters.folio,
      proveedorId: newFilters.proveedorId,
      metodoPago: newFilters.metodoPago,
      fechaInicio: newFilters.fechaInicio,
      fechaFin: newFilters.fechaFin,
      minTotal: newFilters.minTotal,
      maxTotal: newFilters.maxTotal,
      page: newFilters.page || 1,
      pageSize: newFilters.pageSize || filters.pageSize || 10,
      sortBy: newFilters.sortBy || filters.sortBy,
      sortOrder: newFilters.sortOrder || filters.sortOrder,
    });

    setFilters(normalizedFilters);

    setSearchParams({
      tipoRegistro: normalizedFilters.tipoRegistro || "todos",
      ...(normalizedFilters.q && { q: normalizedFilters.q }),
      ...(normalizedFilters.folio && { folio: normalizedFilters.folio }),
      ...(normalizedFilters.tipoRegistro === "todos" && normalizedFilters.proveedorId && { proveedorId: normalizedFilters.proveedorId }),
      ...(normalizedFilters.metodoPago && { metodoPago: normalizedFilters.metodoPago }),
      ...(normalizedFilters.fechaInicio && { fechaInicio: normalizedFilters.fechaInicio }),
      ...(normalizedFilters.fechaFin && { fechaFin: normalizedFilters.fechaFin }),
      ...(normalizedFilters.minTotal !== undefined && { minTotal: String(normalizedFilters.minTotal) }),
      ...(normalizedFilters.maxTotal !== undefined && { maxTotal: String(normalizedFilters.maxTotal) }),
      page: String(normalizedFilters.page || 1),
      pageSize: String(normalizedFilters.pageSize || 10),
      ...(normalizedFilters.sortBy && { sortBy: normalizedFilters.sortBy }),
      ...(normalizedFilters.sortOrder && { sortOrder: normalizedFilters.sortOrder }),
    });
  };

  const handleDelete = async (item: GastoListadoItem) => {
    const success = item.tipoRegistro === "compra"
      ? await removeCompra(item.origenId)
      : item.tipoRegistro === "operativo"
      ? await removeGastoOperativo(item.origenId)
      : await removeRegistroGastoFijo(item.origenId);

    if (success) {
      await list(filters);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    handleSearch({ ...filters, pageSize: newSize, page: 1 });
  };

  const handleRetry = () => {
    void list(filters);
  };

  return (
    <ContentShell
      as="section"
      padding="responsive"
      className="mx-auto flex w-full max-w-7xl min-h-0 flex-1 flex-col bg-[#F4F6F9] py-4 sm:py-5"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <button
          onClick={() => navigate(`/compras/nueva?tipo=${filters.tipoRegistro === "fijos" ? "gastos_fijos" : filters.tipoRegistro === "operativos" ? "operacion" : "compras"}`)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
        >
          <Plus size={16} />
          Nuevo gasto
        </button>
      </div>

      <ComprasFilters
        filters={filters}
        onSearch={handleSearch}
        proveedores={proveedores}
        loadingProveedores={loadingProveedores}
      />

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{error}</span>
            <button
              type="button"
              onClick={handleRetry}
              className="rounded-lg border border-red-200 bg-white px-3 py-1.5 font-medium text-red-700 transition hover:bg-red-100"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}

      <ComprasTable
        data={gastos}
        total={total}
        loading={loading}
        page={currentPage || filters.page || 1}
        pageSize={currentPageSize || filters.pageSize || 10}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        tipoRegistro={filters.tipoRegistro || "todos"}
        onPageChange={(page) => handleSearch({ ...filters, page })}
        onPageSizeChange={handlePageSizeChange}
        onDelete={allowDelete ? handleDelete : undefined}
      />
    </ContentShell>
  );
}
