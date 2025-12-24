import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input } from "@/components/ui";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../components/ui/select";
import { Plus } from "lucide-react";
import { ComprasFilters } from "../components/compras/ComprasFilters";
import { ComprasTable } from "../components/compras/ComprasTable";
import { useCompras } from "../hooks/useCompras";
import { useProveedoresLite } from "../hooks/useProveedoresLite";
import DashboardLayout from "../layouts/DashboardLayout";

export default function ComprasPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Filtros por defecto: mes actual
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const defaultDesde = searchParams.get("desde") || firstDay.toISOString().slice(0, 10);
  const defaultHasta = searchParams.get("hasta") || lastDay.toISOString().slice(0, 10);
  const defaultProveedorId = searchParams.get("proveedorId") || "";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [filters, setFilters] = useState({
    desde: defaultDesde,
    hasta: defaultHasta,
    proveedorId: defaultProveedorId,
    page,
  });

  const { data, total, loading } = useCompras({ ...filters, pageSize: 10 });
  const { proveedores, loading: loadingProveedores } = useProveedoresLite();

  // Sincroniza filtros con URL
  const handleSearch = (newFilters: typeof filters) => {
    setFilters(newFilters);
    setSearchParams({
      ...newFilters,
      page: String(newFilters.page),
    });
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Compras</h1>
        <Button variant="success" asChild aria-label="Nueva compra">
          <Link to="/compras/nueva">
            <Plus className="mr-2 h-4 w-4" />
            Nueva compra
          </Link>
        </Button>
      </div>
      <ComprasFilters
        filters={filters}
        onSearch={handleSearch}
        proveedores={proveedores}
        loadingProveedores={loadingProveedores}
      />
      <div className="mt-4">
        <ComprasTable
          data={data}
          total={total}
          loading={loading}
          page={filters.page}
          pageSize={10}
          onPageChange={page => handleSearch({ ...filters, page })}
        />
      </div>
    </div>
  );
}
