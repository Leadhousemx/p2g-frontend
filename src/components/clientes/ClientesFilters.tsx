import { Search } from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
}

export default function ClientesFilters({ value, onChange, loading }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex-1 min-w-[240px]">
          <label htmlFor="clientes-search" className="block text-xs font-medium text-[#64748B] mb-2 uppercase tracking-wider">
            Busqueda
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-[#64748B]" size={18} />
            <input
              id="clientes-search"
              type="text"
              aria-label="Buscar clientes"
              value={value}
              onChange={(event) => onChange(event.target.value)}
              className="w-full h-11 pl-11 pr-4 py-3 text-sm rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-[#111827] placeholder-[#64748B]"
              placeholder="Buscar por nombre, email o telefono"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={loading && !value}
            className="px-6 py-2.5 text-sm bg-white text-[#64748B] border border-gray-200 rounded-xl hover:bg-gray-50 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            title="Limpiar busqueda"
            aria-label="Limpiar busqueda"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
