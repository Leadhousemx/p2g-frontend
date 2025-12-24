import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui";
import ProveedoresFilters from "../components/proveedores/ProveedoresFilters";
import ProveedoresTable from "../components/proveedores/ProveedoresTable";
import { useProveedores } from "../hooks/useProveedores";

export default function ProveedoresPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { proveedores, total, loading, list, remove } = useProveedores();

  // Debounce búsqueda
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      list({ searchNombre: search, page, pageSize });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, page, pageSize, list]);

  // handleEdit solo usa window.location.href, no useNavigate
  const handleEdit = useCallback((id: string) => {
    if (id.startsWith("page:")) {
      setPage(Number(id.split(":")[1]));
    } else {
      window.location.href = `/proveedores/${id}/editar`;
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    await remove(id);
    // list() se refresca en el hook
  }, [remove]);

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <div className="flex items-center gap-2">
            <Button variant="success" asChild aria-label="Nuevo Proveedor">
              <Link to="/proveedores/nuevo">
                <Plus className="mr-2 h-4 w-4" /> Nuevo Proveedor
              </Link>
            </Button>
          </div>
        </div>
        <ProveedoresFilters
          value={search}
          onChange={v => {
            setSearch(v);
            setPage(1);
          }}
          onClear={() => {
            setSearch("");
            setPage(1);
          }}
          loading={loading}
        />
        <ProveedoresTable
          proveedores={proveedores}
          loading={loading}
          page={page}
          pageSize={pageSize}
          total={total}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>
    </>
  );
}
