import { Building2, Hash } from "lucide-react";

interface Props {
  q: string;
  activo: string;
  formaPago: string;
  rfcGenerico: string;
  onChange: (nextFilters: { q?: string; activo?: string; formaPago?: string; rfcGenerico?: string }) => void;
}

export default function ProveedoresFilters({ q, activo, formaPago, rfcGenerico, onChange }: Props) {
  return (
    <div
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6"
      role="search"
      aria-label="Buscar proveedores"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-2 font-semibold">
            Búsqueda general
          </label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 text-[#64748B]" size={18} />
            <input
              value={q}
              onChange={(e) => onChange({ q: e.target.value })}
              placeholder="Buscar proveedor, RFC o contacto..."
              aria-label="Buscar proveedor"
              className="w-full h-11 pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-2 font-semibold">Estado</label>
          <select
            value={activo}
            onChange={(e) => onChange({ activo: e.target.value })}
            className="w-full h-11 px-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
          >
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-2 font-semibold">Forma de pago</label>
          <select
            value={formaPago}
            onChange={(e) => onChange({ formaPago: e.target.value })}
            className="w-full h-11 px-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
          >
            <option value="">Todas</option>
            <option value="contado">Contado</option>
            <option value="credito">Crédito</option>
          </select>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-[#64748B] mb-2 font-semibold">RFC genérico</label>
          <div className="relative">
            <Hash className="absolute left-3 top-3 text-[#64748B]" size={18} />
            <select
              value={rfcGenerico}
              onChange={(e) => onChange({ rfcGenerico: e.target.value })}
              className="w-full h-11 pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm text-[#111827] bg-white focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition"
            >
              <option value="">Todos</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
