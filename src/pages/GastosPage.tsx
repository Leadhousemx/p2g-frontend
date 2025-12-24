import GastosFilters from "../components/gastos/GastosFilters";
import GastosTable from "../components/gastos/GastosTable";
import { useGastos } from "../hooks/useGastos";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { Plus, FileDown, Table } from "lucide-react";
import { Button } from "@/components/ui";
import { exportToExcel, exportToPDF } from "../utils/exportUtils";
import { useState } from "react";
import { FiltroGastos } from "../components/gastos/GastosFilters";

export default function GastosPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "fecha");
  const [sortDir, setSortDir] = useState(searchParams.get("dir") || "desc");
  const [filters, setFilters] = useState<FiltroGastos>({});
  const { gastos, loading, total, totalFiltrado } = useGastos({
    folio: filters.folio,
    desde: filters.desde,
    hasta: filters.hasta,
    page,
    pageSize: 10,
    sortBy,
    sortDir,
  });

  const handleFilter = (next: Partial<FiltroGastos>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setPage(1);
    setSearchParams({ ...filters, ...next, page: "1", sort: sortBy, dir: sortDir });
  };
  const handlePage = (p: number) => {
    setPage(p);
    setSearchParams({ ...filters, page: String(p), sort: sortBy, dir: sortDir });
  };
  const handleSort = (col: string) => {
    let dir = sortBy === col ? (sortDir === "asc" ? "desc" : "asc") : "asc";
    setSortBy(col);
    setSortDir(dir);
    setSearchParams({ ...filters, page: String(page), sort: col, dir });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Gastos</h1>
        <div className="flex items-center gap-2">
          <Button variant="success" asChild aria-label="Nuevo gasto">
            <Link to="/gastos/nuevo">
              <Plus className="mr-2 h-4 w-4" /> Nuevo gasto
            </Link>
          </Button>
          <Button variant="outline" onClick={() => exportToPDF(gastos)} aria-label="Exportar PDF">
            <FileDown className="mr-2 h-4 w-4" /> PDF
          </Button>
          <Button variant="outline" onClick={() => exportToExcel(gastos)} aria-label="Exportar Excel">
            <Table className="mr-2 h-4 w-4" /> Excel
          </Button>
        </div>
      </div>
      <GastosFilters value={filters} onChange={handleFilter} loading={loading} />
      <GastosTable
        gastos={gastos}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        totalFiltrado={totalFiltrado}
        onPageChange={handlePage}
        onSort={handleSort}
        sortBy={sortBy}
        sortDir={sortDir}
      />
    </>
  );
}
