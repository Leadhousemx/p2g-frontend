import { Link } from "react-router-dom";
import { Utensils, Wine, Users, Sofa, Zap, Package, Calendar, ChevronRight, Search } from "lucide-react";
import { useState } from "react";

const CATALOGOS = [
  {
    tipo: "platillos",
    nombre: "Catering",
    descripcion: "Gestiona servicios de catering y comidas",
    icon: Utensils,
    bgColor: "bg-amber-50",
    iconColor: "text-amber-600",
    borderColor: "border-amber-100",
  },
  {
    tipo: "bebidas",
    nombre: "Bebidas",
    descripcion: "Gestiona bebidas y refrescos",
    icon: Wine,
    bgColor: "bg-violet-50",
    iconColor: "text-violet-600",
    borderColor: "border-violet-100",
  },
  {
    tipo: "personal",
    nombre: "Personal",
    descripcion: "Gestiona personal y camareros",
    icon: Users,
    bgColor: "bg-blue-50",
    iconColor: "text-blue-600",
    borderColor: "border-blue-100",
  },
  {
    tipo: "mobiliario",
    nombre: "Mobiliario",
    descripcion: "Gestiona muebles y decoración",
    icon: Sofa,
    bgColor: "bg-orange-50",
    iconColor: "text-orange-600",
    borderColor: "border-orange-100",
  },
  {
    tipo: "audio",
    nombre: "Audio",
    descripcion: "Gestiona equipos de sonido",
    icon: Zap,
    bgColor: "bg-red-50",
    iconColor: "text-red-600",
    borderColor: "border-red-100",
  },
  {
    tipo: "otros",
    nombre: "Otros",
    descripcion: "Otros items del catálogo",
    icon: Package,
    bgColor: "bg-slate-50",
    iconColor: "text-slate-600",
    borderColor: "border-slate-100",
  },
  {
    tipo: "tipoeventos",
    nombre: "Tipos de Evento",
    descripcion: "Gestiona tipos de eventos",
    icon: Calendar,
    bgColor: "bg-emerald-50",
    iconColor: "text-emerald-600",
    borderColor: "border-emerald-100",
  },
];

export default function CatalogosPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCatalogos = CATALOGOS.filter((cat) =>
    cat.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:gap-7">
        {/* Quick Search */}
        <div className="flex justify-end">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar categoría…"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-[#111827] placeholder:text-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>
        </div>

        {/* Grid de Cards */}
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {filteredCatalogos.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.tipo}
                  to={`/catalogo/${cat.tipo}`}
                  className="group no-underline"
                >
                  <div className="flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
                    {/* Icon Badge */}
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border ${cat.bgColor} ${cat.borderColor} transition-transform group-hover:scale-110 sm:h-14 sm:w-14`}>
                      <Icon className={cat.iconColor} size={22} strokeWidth={2} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <h3 className="mb-1 text-base font-bold text-[#111827]">{cat.nombre}</h3>
                      <p className="text-sm leading-snug text-[#64748B]">{cat.descripcion}</p>
                    </div>

                    {/* Chevron */}
                    <ChevronRight className="mt-1 shrink-0 text-[#64748B] opacity-100 transition-all sm:opacity-0 sm:group-hover:opacity-100" size={20} />
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredCatalogos.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm">
              <p className="text-[#64748B]">No se encontraron categorías que coincidan con "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
