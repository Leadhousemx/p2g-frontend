import ClientesFilters from "../components/clientes/ClientesFilters";
import ClientesTable from "../components/clientes/ClientesTable";
import { useClientes } from "../hooks/useClientes";
import { useSearchParams, Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import { useState } from "react";

export default function ClientesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
  const [filters, setFilters] = useState({
    nombre: searchParams.get("nombre") || "",
    email: searchParams.get("email") || "",
    telefono: searchParams.get("telefono") || "",
  });
  const { clientes, loading, total } = useClientes({
    searchNombre: filters.nombre,
    searchEmail: filters.email,
    searchTelefono: filters.telefono,
    page,
    pageSize: 10,
  });

  const handleFilter = (f: typeof filters) => {
    setFilters(f);
    setPage(1);
    setSearchParams({ ...f, page: "1" });
  };
  const handlePage = (p: number) => {
    setPage(p);
    setSearchParams({ ...filters, page: String(p) });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <div className="flex items-center gap-2">
          <Button variant="success" asChild aria-label="Nuevo cliente">
            <Link to="/clientes/nuevo">
              <Plus className="mr-2 h-4 w-4" /> Nuevo cliente
            </Link>
          </Button>
        </div>
      </div>
      <ClientesFilters
        value={filters}
        onChange={handleFilter}
        loading={loading}
      />
      <ClientesTable
        clientes={clientes}
        loading={loading}
        page={page}
        pageSize={10}
        total={total}
        onPageChange={handlePage}
        filters={filters}
      />
    </>
  );
}
