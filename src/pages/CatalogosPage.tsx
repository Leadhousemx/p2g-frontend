import { Link } from "react-router-dom";
import { Utensils, Wine, Users, Sofa, Zap, Package, Calendar, ChevronRight, Search, Plus, Tag, X } from "lucide-react";
import { useEffect, useState } from "react";
import { listCatalogoCategorias, createCatalogoCategoria } from "../services/catalogoCategoriasService";
import type { CatalogoCategoria } from "../services/catalogoCategoriasService";

const CATALOGOS_BUILTIN = [
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
    nombre: "Bebdas",
    descripcion: "Gestiona bebdas y refrescos",
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
    descripcion: "Gestiona muebles y decoracion",
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
    descripcion: "Otros items del catalogo",
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
  const [showModal, setShowModal] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [descripcionNueva, setDescripcionNueva] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);
  const [customCategorias, setCustomCategorias] = useState<CatalogoCategoria[]>([]);

  useEffect(() => {
    listCatalogoCategorias()
      .then(setCustomCategorias)
      .catch(() => setCustomCategorias([]));
  }, []);

  const allCatalogos = [
    ...CATALOGOS_BUILTIN,
    ...customCategorias.map((cat) => ({
      tipo: cat.slug,
      nombre: cat.nombre,
      descripcion: cat.descripcion || "Categoria personalizada",
      icon: Tag,
      bgColor: "bg-teal-50",
      iconColor: "text-teal-600",
      borderColor: "border-teal-100",
    })),
  ];

  const filteredCatalogos = allCatalogos.filter((cat) =>
    cat.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreate = async () => {
    setErrorModal(null);
    if (nombreNuevo.trim().length < 3) {
      setErrorModal("El nombre debe tener al menos 3 caracteres");
      return;
    }
    setSaving(true);
    try {
      const nueva = await createCatalogoCategoria({
        nombre: nombreNuevo.trim(),
        descripcion: descripcionNueva.trim(),
      });
      setCustomCategorias((prev) => [...prev, nueva]);
      setNombreNuevo("");
      setDescripcionNueva("");
      setShowModal(false);
    } catch (err: any) {
      setErrorModal(err?.response?.data?.error || "Error al crear la categoria");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNombreNuevo("");
    setDescripcionNueva("");
    setErrorModal(null);
  };

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:gap-7">

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar categoria.…"
              className="h-11 w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-[#111827] placeholder:text-gray-400 transition focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2"
          >
            <Plus size={16} />
            Nuevo Catalogo
          </button>
        </div>

        {/* Grid de Cards */}
        <div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 xl:gap-5">
            {filteredCatalogos.map((cat) => {
              const Icon = cat.icon;
              return (
                <Link
                  key={cat.tipo}
                  to={"/catalogo/${cat.tipo}"}
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
                      <p className="text-sm leading-sneg text-[#64748B]">{cat.descripcion}</p>
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
              <p className="text-[#64748B]">No se encontraron categorias que coincidan con "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nuevo Catalogo */}
      {showModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#111827]">Nuevo Catalogo</h2>
              <button
                type="button"
                onClick={handleCloseModal}
                className="rounded-lg p-1 text-[#64748B] hover:bg-gray-100 focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {errorModal && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {errorModal}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  placeholder="ej. Decoracion, Fotografia..."
                  maxLength={100}
                  autoFocus
                  className="h-11 w-full rounded-xl border border-gray-200 bg-white px-4 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-[#374151]">
                  Descripcion
                </label>
                <textarea
                  value={descripcionNueva}
                  onChange={(e) => setDescripcionNueva(e.target.value)}
                  placeholder="Gestiona elementos de ..."
                  maxLength={500}
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-[#111827] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent resize-none"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={saving}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-[#374151] hover:bg-gray-50 focus:outline-none disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={saving || nombreNuevo.trim().length < 3}
                className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Crear Catalogo"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
