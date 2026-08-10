import ClientesFilters from "../components/clientes/ClientesFilters";
import ClientesTable from "../components/clientes/ClientesTable";
import { useClientes } from "../hooks/useClientes";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus, FileDown, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { deleteCliente, updateCliente } from "../services/clientesService";
import { logger } from "../lib/logger";
import { useAuth } from "../context/auth-context";
import { canDeleteRecords } from "../utils/rolePermissions";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

function parsePositiveNumber(value: string | null, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback;
}

export default function ClientesPage() {
  const navigate = useNavigate();
  const auth = useAuth() as any;
  const user = auth?.user;
  const allowDelete = canDeleteRecords(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const initialPageSize = parsePositiveNumber(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);
  const initialSearchTerm = searchParams.get("q")
    || searchParams.get("nombre")
    || searchParams.get("email")
    || searchParams.get("telefono")
    || "";
  const [page, setPage] = useState(parsePositiveNumber(searchParams.get("page"), DEFAULT_PAGE));
  const [pageSize, setPageSize] = useState(
    PAGE_SIZE_OPTIONS.includes(initialPageSize) ? initialPageSize : DEFAULT_PAGE_SIZE
  );
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(initialSearchTerm);
  const {
    clientes,
    loading,
    error,
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    refetchClientes,
  } = useClientes({
    q: debouncedSearchTerm,
    page,
    pageSize,
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm.trim());
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchTerm]);

  useEffect(() => {
    const nextParams: Record<string, string> = {
      page: String(page),
      pageSize: String(pageSize),
    };

    if (debouncedSearchTerm) {
      nextParams.q = debouncedSearchTerm;
    }

    setSearchParams(nextParams, { replace: true });
  }, [debouncedSearchTerm, page, pageSize, setSearchParams]);

  const handleSearchChange = (nextSearchTerm: string) => {
    setSearchTerm(nextSearchTerm);
    setPage(DEFAULT_PAGE);
  };

  const handlePage = (p: number) => {
    setPage(p);
  };

  const handlePageSizeChange = (nextPageSize: number) => {
    setPageSize(nextPageSize);
    setPage(DEFAULT_PAGE);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCliente(id);

      const nextTotal = Math.max(0, total - 1);
      const nextTotalPages = Math.max(1, Math.ceil(nextTotal / pageSize));
      const nextPage = Math.min(page, nextTotalPages);

      if (nextPage !== page) {
        setPage(nextPage);
        return;
      }

      refetchClientes();
    } catch (err) {
      logger.error("Error deleting client:", err);
      throw err;
    }
  };

  const handleRatingChange = async (id: string, newRating: 'bad' | 'neutral' | 'good') => {
    try {
      await updateCliente(id, { calificacion: newRating });
      refetchClientes();
    } catch (err) {
      logger.error("Error updating rating:", err);
      throw err;
    }
  };

  const exportToExcel = () => {
    // TODO: Implementar exportación a Excel
    alert("Funcionalidad de exportación a Excel en desarrollo");
  };

  const exportToPDF = () => {
    // TODO: Implementar exportación a PDF
    alert("Funcionalidad de exportación a PDF en desarrollo");
  };

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:p-5">
      {/* Botones superiores */}
      <div className="flex items-center gap-3 justify-end mb-6 flex-wrap">
        <button
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-[#2563EB] text-white rounded-lg hover:bg-[#1d4ed8] transition whitespace-nowrap shadow-sm"
          onClick={() => navigate("/clientes/nuevo")}
        >
          <Plus size={16} /> Nuevo cliente
        </button>
        <button
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-white text-[#111827] border border-gray-200 rounded-lg hover:bg-gray-50 transition whitespace-nowrap shadow-sm"
          onClick={exportToExcel}
        >
          <FileDown size={16} /> Excel
        </button>
        <button
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-white text-[#111827] border border-gray-200 rounded-lg hover:bg-gray-50 transition whitespace-nowrap shadow-sm"
          onClick={exportToPDF}
        >
          <FileText size={16} /> PDF
        </button>
      </div>

      {/* Filtros */}
      <ClientesFilters
        value={searchTerm}
        onChange={handleSearchChange}
        loading={loading}
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <span>{error}</span>
          <button
            type="button"
            onClick={refetchClientes}
            className="mt-3 inline-flex rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 sm:mt-0"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      <div>
        <ClientesTable
          clientes={clientes}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          onPageChange={handlePage}
          onPageSizeChange={handlePageSizeChange}
          onDelete={allowDelete ? handleDelete : undefined}
          onRatingChange={handleRatingChange}
          searchTerm={debouncedSearchTerm}
        />
      </div>
    </div>
  );
}
