import { Link } from "react-router-dom";
import { Utensils, Wine, Users, Sofa, Zap, Package, Calendar, ChevronRight, Search, Plus, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";

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

const CUSTOM_CATALOGOS_KEY = "brentrix_custom_catalogos";

interface CustomCatalogo {
  id: string;
  tipo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

function loadCustomCatalogos(): CustomCatalogo[] {
  try {
    const stored = localStorage.getItem(CUSTOM_CATALOGOS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveCustomCatalogos(cats: CustomCatalogo[]) {
  localStorage.setItem(CUSTOM_CATALOGOS_KEY, JSON.stringify(cats));
}

export default function CatalogosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [customCatalogos, setCustomCatalogos] = useState<CustomCatalogo[]>(loadCustomCatalogos);
  const [showModal, setShowModal] = useState(false);
  const [formNombre, setFormNombre] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formError, setFormError] = useState("");
  const nombreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showModal) nombreInputRef.current?.focus();
  }, [showModal]);

  const handleCreate = () => {
    const nombre = formNombre.trim();
    if (!nombre) {
      setFormError("El nombre es requerido.");
      return;
    }
    const nuevo: CustomCatalogo = {
      id: `custom-${Date.now()}`,
      tipo: `custom-${nombre.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      nombre,
      descripcion: formDesc.trim(),
      activo: true,
    };
    const updated = [...customCatalogos, nuevo];
    saveCustomCatalogos(updated);
    setCustomCatalogos(updated);
    setShowModal(false);
    setFormNombre("");
    setFormDesc("");
    setFormError("");
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormNombre("");
    setFormDesc("");
    setFormError("");
  };

  const activeCustomCatalogos = customCatalogos.filter((cat) => cat.activo);

  const filteredFixed = CATALOGOS.filter((cat) =>
    cat.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustom = activeCustomCatalogos.filter((cat) =>
    cat.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalVisible = filteredFixed.length + filteredCustom.length;

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:gap-7">
        {/* Search + New Button */}
        <div className="flex items-center justify-between gap-3">
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
          <button
            onClick={() => setShowModal(true)}
            className="flex shrink-0 items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#1d4ed8] active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Nuevo catálogo</span>
          </button>
        </div>

        {/* Grid de Cards */}
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {filteredFixed.map((cat) => {
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

            {filteredCustom.map((cat) => (
              <div
                key={cat.id}
                className="flex h-full items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-slate-50 border-slate-100 sm:h-14 sm:w-14">
                  <Package className="text-slate-600" size={22} strokeWidth={2} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-1 text-base font-bold text-[#111827]">{cat.nombre}</h3>
                  <p className="text-sm leading-snug text-[#64748B]">{cat.descripcion}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Empty state */}
          {totalVisible === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-12 text-center shadow-sm">
              <p className="text-[#64748B]">No se encontraron categorías que coincidan con "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nuevo Catálogo */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseModal(); }}
        >
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111827]">Nuevo catálogo</h2>
              <button
                onClick={handleCloseModal}
                className="rounded-full p-1 text-gray-400 transition hover:text-gray-600 hover:bg-gray-100 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#374151]">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  ref={nombreInputRef}
                  type="text"
                  value={formNombre}
                  onChange={(e) => { setFormNombre(e.target.value); setFormError(""); }}
                  placeholder="P. ej. Equipos especiales"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-[#111827] transition focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-[#374151]">
                  Descripción
                </label>
                <textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Descripción opcional del catálogo"
                  rows={3}
                  className="w-full resize-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-[#111827] transition focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-500">{formError}</p>
              )}

              <div className="flex justify-end gap-3 pt-1">
                <button
                  onClick={handleCloseModal}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-[#374151] transition hover:border-gray-400 hover:bg-gray-50 focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  className="rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#1d4ed8] active:scale-95 focus:outline-none"
                >
                  Crear catálogo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
