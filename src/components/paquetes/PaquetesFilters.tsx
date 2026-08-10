import { useState } from "react";
import { Search, Package } from "lucide-react";

interface Props {
  nombre: string;
  estado: "todos" | "activo" | "inactivo";
  onChange: (nombre: string, estado: "todos" | "activo" | "inactivo") => void;
  loading?: boolean;
}

export default function PaquetesFilters({ nombre, estado, onChange, loading }: Props) {
  const [localNombre, setLocalNombre] = useState(nombre);
  const [localEstado, setLocalEstado] = useState(estado);

  const handleSearch = () => {
    onChange(localNombre, localEstado);
  };

  const handleClear = () => {
    setLocalNombre("");
    setLocalEstado("todos");
    onChange("", "todos");
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Input Buscar por nombre */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-2 font-semibold">
            Buscar por nombre
          </label>
          <div className="relative">
            <Package className="absolute left-3 top-3 text-[#64748B]" size={18} />
            <input
              type="text"
              value={localNombre}
              onChange={(e) => setLocalNombre(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Nombre del paquete"
              disabled={loading}
              className="h-11 w-full rounded-xl border border-gray-200 py-3 pl-11 pr-4 text-sm text-[#111827] placeholder:text-gray-400 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
        </div>

        {/* Select Estado */}
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-2 font-semibold">
            Estado
          </label>
          <div className="relative">
            <select
              value={localEstado}
              onChange={(e) => setLocalEstado(e.target.value as "todos" | "activo" | "inactivo")}
              disabled={loading}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-[#111827] transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            >
              <option value="todos">Todos</option>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-[#64748B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Botones */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={handleSearch}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Search size={16} />
          Buscar
        </button>
        <button
          onClick={handleClear}
          disabled={loading}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-[#64748B] transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
