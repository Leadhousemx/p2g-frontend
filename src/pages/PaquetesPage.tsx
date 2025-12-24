import DashboardLayout from "../layouts/DashboardLayout";
import PaquetesFilters from "../components/paquetes/PaquetesFilters";
import PaquetesTable from "../components/paquetes/PaquetesTable";
import { usePaquetes } from "../hooks/usePaquetes";
import { useSearchParams, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { useState } from "react";

export default function PaquetesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [searchNombre, setSearchNombre] = useState(searchParams.get("searchNombre") || "");
  const { paquetes, total, loading } = usePaquetes({ searchNombre, page, pageSize: 10 });

  const handleFilter = (nombre: string) => {
    setSearchNombre(nombre);
    setPage(1);
    setSearchParams({ searchNombre: nombre, page: "1" });
  };
  const handlePage = (p: number) => {
    setPage(p);
    setSearchParams({ searchNombre, page: String(p) });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Paquetes</h1>
        <div className="flex items-center gap-2">
          <Button variant="success" asChild aria-label="Nuevo Paquete">
            <Link to="/paquetes/nuevo">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Paquete
            </Link>
          </Button>
        </div>
      </div>
      <PaquetesFilters value={searchNombre} onChange={handleFilter} loading={loading} />
      <PaquetesTable
        paquetes={paquetes}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPageChange={handlePage}
      />
    </>
  );
}
