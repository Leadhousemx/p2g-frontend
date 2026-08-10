import PaquetesFilters from "../components/paquetes/PaquetesFilters";
import PaquetesTable from "../components/paquetes/PaquetesTable";
import { usePaquetes } from "../hooks/usePaquetes";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../context/auth-context";
import { canDeleteRecords } from "../utils/rolePermissions";

export default function PaquetesPage() {
  const navigate = useNavigate();
  const { user } = (useAuth() || {}) as { user?: any };
  const allowDelete = canDeleteRecords(user);
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [searchNombre, setSearchNombre] = useState(searchParams.get("searchNombre") || "");
  const [estadoFilter, setEstadoFilter] = useState<"todos" | "activo" | "inactivo">("todos");

  const activo = estadoFilter === "todos" ? undefined : estadoFilter === "activo";
  const { paquetes, total, loading, refetch } = usePaquetes({ searchNombre, page, pageSize: 10, activo });

  const handleFilter = (nombre: string, estado: "todos" | "activo" | "inactivo") => {
    setSearchNombre(nombre);
    setEstadoFilter(estado);
    setPage(1);
    setSearchParams({ searchNombre: nombre, estado, page: "1" });
  };

  const handlePage = (p: number) => {
    setPage(p);
    setSearchParams({ searchNombre, estado: estadoFilter, page: String(p) });
  };

  const handleDeleteSuccess = () => {
    refetch();
  };

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6 lg:gap-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <button
            onClick={() => navigate("/paquetes/nuevo")}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:self-start"
          >
            <Plus size={16} />
            Nuevo paquete
          </button>
        </div>

        <PaquetesFilters
          nombre={searchNombre}
          estado={estadoFilter}
          onChange={handleFilter}
          loading={loading}
        />

        <div className="min-h-0 flex-1">
          <PaquetesTable
            paquetes={paquetes}
            loading={loading}
            page={page}
            pageSize={10}
            total={total}
            onPageChange={handlePage}
            onDelete={handleDeleteSuccess}
            canDelete={allowDelete}
          />
        </div>
      </div>
    </div>
  );
}
