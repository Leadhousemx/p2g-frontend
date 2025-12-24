import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ProveedorLite } from "../../hooks/useProveedoresLite";

interface Props {
  filters: {
    desde: string;
    hasta: string;
    proveedorId: string;
    page: number;
  };
  onSearch: (filters: Props["filters"]) => void;
  proveedores: ProveedorLite[];
  loadingProveedores: boolean;
}

export function ComprasFilters({ filters, onSearch, proveedores, loadingProveedores }: Props) {
  // Usar undefined para proveedorId no seleccionado
  const [local, setLocal] = useState({
    ...filters,
    proveedorId: filters.proveedorId === "" ? undefined : filters.proveedorId
  });
  const [proveedorSearch, setProveedorSearch] = useState("");
  const debounceRef = useRef<any>(null); // useRef<NodeJS.Timeout | null> gives error in browser

  useEffect(() => {
    setLocal({
      ...filters,
      proveedorId: filters.proveedorId === "" ? undefined : filters.proveedorId
    });
  }, [filters]);

  // Debounce para proveedor
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Aquí podrías disparar búsqueda de proveedores si fuera remoto
    }, 300);
    // eslint-disable-next-line
  }, [proveedorSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setLocal({ ...local, [e.target.name]: e.target.value });
  };

  // Al buscar, si proveedorId es __all__ o vacío, lo mandamos como "" (sin filtro)
  const handleSearch = (custom?: typeof local) => {
    const l = custom || local;
    onSearch({
      ...l,
      proveedorId: !l.proveedorId || l.proveedorId === "__all__" ? "" : l.proveedorId,
      page: 1
    });
  };
  return (
    <form
      className="flex flex-wrap gap-2 items-end bg-white rounded-xl p-4 shadow"
      onSubmit={e => {
        e.preventDefault();
        handleSearch();
      }}
    >
      <div>
        <label htmlFor="desde" className="block text-xs font-medium mb-1">
          Desde
        </label>
        <Input
          id="desde"
          name="desde"
          type="date"
          value={local.desde}
          onChange={handleChange}
          aria-label="Desde"
        />
      </div>
      <div>
        <label htmlFor="hasta" className="block text-xs font-medium mb-1">
          Hasta
        </label>
        <Input
          id="hasta"
          name="hasta"
          type="date"
          value={local.hasta}
          onChange={handleChange}
          aria-label="Hasta"
        />
      </div>
      <div className="min-w-[200px]">
        <label htmlFor="proveedorId" className="block text-xs font-medium mb-1">
          Proveedor
        </label>
        <Select
          value={local.proveedorId === undefined ? undefined : local.proveedorId}
          onValueChange={v => setLocal({ ...local, proveedorId: v === "__all__" ? undefined : v })}
          name="proveedorId"
          aria-label="Proveedor"
        >
          <SelectTrigger id="proveedorId">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Todos</SelectItem>
            {proveedores.filter(p => p.id).map(p => (
              <SelectItem key={String(p.id)} value={String(p.id)}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 mt-4 md:mt-0">
        <Button type="submit" variant="default" aria-label="Buscar">
          Buscar
        </Button>
        <Button
          type="button"
          variant="secondary"
          aria-label="Limpiar"
          onClick={() => {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
            setLocal({ desde: firstDay, hasta: lastDay, proveedorId: undefined, page: 1 });
            handleSearch({ desde: firstDay, hasta: lastDay, proveedorId: undefined, page: 1 });
          }}
        >
          Limpiar
        </Button>
      </div>
    </form>
  );
}
