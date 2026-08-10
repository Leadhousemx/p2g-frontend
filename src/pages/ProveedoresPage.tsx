import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import ProveedoresFilters from "../components/proveedores/ProveedoresFilters";
import ProveedoresTable from "../components/proveedores/ProveedoresTable";
import { useProveedores } from "../hooks/useProveedores";
import { useAuth } from "../context/auth-context";
import { canDeleteRecords } from "../utils/rolePermissions";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

function parsePositiveNumber(value: string | null, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

function parseBooleanFilter(value: string) {
  if (value === "activo") return true;
  if (value === "inactivo") return false;
  return undefined;
}

function parseRfcGenericoFilter(value: string) {
  if (value === "si") return true;
  if (value === "no") return false;
  return undefined;
}

export default function ProveedoresPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = (useAuth() || {}) as { user?: any };
  const allowDelete = canDeleteRecords(user);
  const [page, setPage] = useState(parsePositiveNumber(searchParams.get("page"), DEFAULT_PAGE));
  const [pageSize, setPageSize] = useState(parsePositiveNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE));
  const [searchTerm, setSearchTerm] = useState(searchParams.get("q") || "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchParams.get("q") || "");
  const [activo, setActivo] = useState(searchParams.get("activo") || "");
  const [formaPago, setFormaPago] = useState(searchParams.get("formaPago") || "");
  const [rfcGenerico, setRfcGenerico] = useState(searchParams.get("rfcGenerico") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc" | "">(
    searchParams.get("sortOrder") === "desc" ? "desc" : searchParams.get("sortOrder") === "asc" ? "asc" : ""
  );
  const {
    proveedores,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    loading,
    error,
    refetch,
    remove,
  } = useProveedores({
    q: debouncedSearchTerm,
    activo: parseBooleanFilter(activo),
    formaPago: formaPago === "contado" || formaPago === "credito" ? formaPago : undefined,
    rfcGenerico: parseRfcGenericoFilter(rfcGenerico),
    page,
    pageSize,
    sortBy: sortBy || undefined,
    sortOrder: sortOrder || undefined,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextQ = searchTerm.trim();
      const didSearchChange = nextQ !== debouncedSearchTerm;
      setDebouncedSearchTerm(nextQ);
      if (didSearchChange) {
        setPage(1);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
    };
  }, [searchTerm, debouncedSearchTerm]);

  useEffect(() => {
    const nextParams = new URLSearchParams();
    nextParams.set("page", String(page));
    nextParams.set("pageSize", String(pageSize));
    if (debouncedSearchTerm) nextParams.set("q", debouncedSearchTerm);
    if (activo) nextParams.set("activo", activo);
    if (formaPago) nextParams.set("formaPago", formaPago);
    if (rfcGenerico) nextParams.set("rfcGenerico", rfcGenerico);
    if (sortBy) nextParams.set("sortBy", sortBy);
    if (sortOrder) nextParams.set("sortOrder", sortOrder);
    setSearchParams(nextParams, { replace: true });
  }, [page, pageSize, debouncedSearchTerm, activo, formaPago, rfcGenerico, sortBy, sortOrder, setSearchParams]);

  const handleEdit = useCallback((id: string) => {
    navigate(`/proveedores/${id}/editar`);
  }, [navigate]);

  const handleDelete = useCallback(async (id: string) => {
    await remove(id);

    const nextTotal = Math.max(0, total - 1);
    const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
    const nextPage = Math.min(page, nextTotalPages);

    if (nextPage !== page) {
      setPage(nextPage);
      return;
    }

    refetch();
  }, [page, pageSize, refetch, remove, total]);

  const handleFiltersChange = useCallback((nextFilters: { q?: string; activo?: string; formaPago?: string; rfcGenerico?: string }) => {
    if (nextFilters.q !== undefined) {
      setSearchTerm(nextFilters.q);
    }
    if (nextFilters.activo !== undefined) {
      setActivo(nextFilters.activo);
      setPage(1);
    }
    if (nextFilters.formaPago !== undefined) {
      setFormaPago(nextFilters.formaPago);
      setPage(1);
    }
    if (nextFilters.rfcGenerico !== undefined) {
      setRfcGenerico(nextFilters.rfcGenerico);
      setPage(1);
    }
  }, []);

  const handleSortChange = useCallback((field: "nombreComercial" | "rfc" | "telefono" | "email" | "formaPago" | "activo") => {
    setPage(1);

    if (sortBy !== field) {
      setSortBy(field);
      setSortOrder("asc");
      return;
    }

    if (sortOrder === "asc") {
      setSortOrder("desc");
      return;
    }

    setSortBy("");
    setSortOrder("");
  }, [sortBy, sortOrder]);

  const hasActiveFilters = Boolean(debouncedSearchTerm || activo || formaPago || rfcGenerico);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:p-5">
      <div className="flex items-center justify-end gap-3 mb-6">
        <button
          onClick={() => navigate("/proveedores/nuevo")}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2563EB] text-white rounded-xl font-medium text-sm hover:bg-blue-700 transition"
          aria-label="Nuevo proveedor"
        >
          <Plus size={16} />
          Nuevo proveedor
        </button>
      </div>

      <ProveedoresFilters
        q={searchTerm}
        activo={activo}
        formaPago={formaPago}
        rfcGenerico={rfcGenerico}
        onChange={handleFiltersChange}
      />

      {error ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={refetch}
            className="rounded-lg border border-red-200 px-3 py-2 text-sm hover:bg-white transition"
          >
            Reintentar
          </button>
        </div>
      ) : null}

      <ProveedoresTable
        proveedores={proveedores}
        loading={loading}
        page={page}
        pageSize={pageSize}
        total={total}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPrevPage={hasPrevPage}
        searchTerm={hasActiveFilters ? debouncedSearchTerm || "filtered" : ""}
        sortBy={sortBy as any}
        sortOrder={sortOrder}
        onEdit={handleEdit}
        onDelete={allowDelete ? handleDelete : undefined}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
