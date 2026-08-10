import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Calendar, Search } from "lucide-react";
import type { GastosListadoFilters } from "../../hooks/useGastosListado";
import { toLocalDateOnly } from "../../utils/dateOnly";

interface Proveedor {
  id: string;
  nombre: string;
}

interface Props {
  filters: GastosListadoFilters;
  onSearch: (filters: GastosListadoFilters) => void;
  proveedores: Proveedor[];
  loadingProveedores: boolean;
}

const METODOS_PAGO = ["Efectivo", "Transferencia", "Cheque", "Tarjeta", "Otro"] as const;

export function ComprasFilters({ filters, onSearch, proveedores, loadingProveedores }: Props) {
  const [local, setLocal] = useState({
    ...filters,
    tipoRegistro: filters.tipoRegistro || "todos",
    q: filters.q || "",
    folio: filters.folio || "",
    proveedorId: filters.proveedorId || "__all__",
    metodoPago: filters.metodoPago || "__all__",
    fechaInicio: filters.fechaInicio || "",
    fechaFin: filters.fechaFin || "",
    minTotal: filters.minTotal ?? "",
    maxTotal: filters.maxTotal ?? "",
    sortBy: filters.sortBy || "fecha",
    sortOrder: filters.sortOrder || "desc",
    page: filters.page || 1,
    pageSize: filters.pageSize || 10,
  });
  const providerEnabled = local.tipoRegistro === "todos";

  useEffect(() => {
    setLocal({
      ...filters,
      tipoRegistro: filters.tipoRegistro || "todos",
      q: filters.q || "",
      folio: filters.folio || "",
      proveedorId: filters.proveedorId || "__all__",
      metodoPago: filters.metodoPago || "__all__",
      fechaInicio: filters.fechaInicio || "",
      fechaFin: filters.fechaFin || "",
      minTotal: filters.minTotal ?? "",
      maxTotal: filters.maxTotal ?? "",
      sortBy: filters.sortBy || "fecha",
      sortOrder: filters.sortOrder || "desc",
      page: filters.page || 1,
      pageSize: filters.pageSize || 10,
    });
  }, [filters]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocal({ ...local, [e.target.name]: e.target.value });
  };

  const handleSearch = (custom?: typeof local) => {
    const l = custom || local;

    onSearch({
      ...l,
      tipoRegistro: l.tipoRegistro || "todos",
      q: String(l.q || "").trim(),
      folio: String(l.folio || "").trim(),
      proveedorId: l.tipoRegistro === "todos" && l.proveedorId !== "__all__" ? String(l.proveedorId || "") : undefined,
      metodoPago: l.metodoPago === "__all__" ? "" : l.metodoPago,
      fechaInicio: l.fechaInicio || "",
      fechaFin: l.fechaFin || "",
      minTotal: l.minTotal === "" ? undefined : Number(l.minTotal),
      maxTotal: l.maxTotal === "" ? undefined : Number(l.maxTotal),
      sortBy: l.sortBy,
      sortOrder: l.sortOrder,
      page: l.page || 1,
      pageSize: l.pageSize || 10,
    });
  };

  const applyPreset = (preset: "hoy" | "7dias" | "mes-actual" | "mes-pasado") => {
    const now = new Date();
    let desde = "";
    let hasta = toLocalDateOnly(now);

    if (preset === "hoy") {
      desde = hasta;
    } else if (preset === "7dias") {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      desde = toLocalDateOnly(sevenDaysAgo);
    } else if (preset === "mes-actual") {
      desde = toLocalDateOnly(new Date(now.getFullYear(), now.getMonth(), 1));
    } else if (preset === "mes-pasado") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
      desde = toLocalDateOnly(new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1));
      hasta = toLocalDateOnly(new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0));
    }

    const nextLocal = { ...local, fechaInicio: desde, fechaFin: hasta, page: 1 };
    setLocal(nextLocal);
    handleSearch(nextLocal);
  };

  const handleClear = () => {
    const cleared = {
      tipoRegistro: local.tipoRegistro || "todos",
      q: "",
      folio: "",
      proveedorId: "__all__",
      metodoPago: "__all__",
      fechaInicio: "",
      fechaFin: "",
      minTotal: "",
      maxTotal: "",
      sortBy: "fecha",
      sortOrder: "desc",
      page: 1,
      pageSize: local.pageSize || 10,
    };
    setLocal(cleared);
    handleSearch(cleared);
  };

  return (
    <div>
      {/* Card de filtros */}
      <form
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        onSubmit={e => {
          e.preventDefault();
          handleSearch({ ...local, page: 1 });
        }}
      >
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor="tipoRegistro" className="mb-2 block text-xs font-semibold text-[#111827]">
              Listado
            </label>
            <Select
              id="tipoRegistro"
              value={local.tipoRegistro}
              onValueChange={(value: "todos" | "operativos" | "fijos") => {
                const nextLocal = {
                  ...local,
                  tipoRegistro: value,
                  proveedorId: value === "todos" ? local.proveedorId : "__all__",
                  sortBy: "fecha",
                  page: 1,
                };
                setLocal(nextLocal);
                handleSearch(nextLocal);
              }}
              name="tipoRegistro"
            >
              <SelectTrigger className="h-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent">
                <SelectValue placeholder="Selecciona listado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="operativos">Gastos operativos</SelectItem>
                <SelectItem value="fijos">Registros de gastos fijos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="proveedorId" className="mb-2 block text-xs font-semibold text-[#111827]">
              Proveedor
            </label>
            <Select
              id="proveedorId"
              value={String(local.proveedorId || "__all__")}
              onValueChange={(value: string) => setLocal({ ...local, proveedorId: value })}
              name="proveedorId"
              disabled={!providerEnabled}
            >
              <SelectTrigger className="h-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent disabled:opacity-60">
                <SelectValue placeholder={loadingProveedores ? "Cargando proveedores..." : providerEnabled ? "Todos" : "Disponible solo en Todos"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {proveedores.map((proveedor) => (
                  <SelectItem key={proveedor.id} value={proveedor.id}>{proveedor.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="q" className="mb-2 block text-xs font-semibold text-[#111827]">
              Búsqueda general
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-3 text-[#64748B]" size={16} />
              <Input
                id="q"
                name="q"
                type="text"
                value={String(local.q || "")}
                onChange={handleChange}
                className="h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                placeholder="Buscar por folio, concepto o referencia"
              />
            </div>
          </div>

          <div>
            <label htmlFor="folio" className="mb-2 block text-xs font-semibold text-[#111827]">
              Folio
            </label>
            <Input
              id="folio"
              name="folio"
              type="text"
              value={String(local.folio || "")}
              onChange={handleChange}
              className="h-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              placeholder="Ej. OPE-0001"
            />
          </div>

          <div>
            <label htmlFor="metodoPago" className="mb-2 block text-xs font-semibold text-[#111827]">
              Método de pago
            </label>
            <Select
              id="metodoPago"
              value={String(local.metodoPago || "__all__")}
              onValueChange={(value: string) => setLocal({ ...local, metodoPago: value })}
              name="metodoPago"
            >
              <SelectTrigger className="h-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                {METODOS_PAGO.map((metodo) => (
                  <SelectItem key={metodo} value={metodo}>{metodo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="fechaInicio" className="block text-xs font-semibold text-[#111827] mb-2">
              Desde
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-[#64748B]" size={16} />
              <Input
                id="fechaInicio"
                name="fechaInicio"
                type="date"
                value={String(local.fechaInicio || "")}
                onChange={handleChange}
                className="h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                aria-label="Desde"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fechaFin" className="block text-xs font-semibold text-[#111827] mb-2">
              Hasta
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-3 text-[#64748B]" size={16} />
              <Input
                id="fechaFin"
                name="fechaFin"
                type="date"
                value={String(local.fechaFin || "")}
                onChange={handleChange}
                className="h-11 pl-10 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
                aria-label="Hasta"
              />
            </div>
          </div>

          <div>
            <label htmlFor="minTotal" className="block text-xs font-semibold text-[#111827] mb-2">
              Total mínimo
            </label>
            <Input
              id="minTotal"
              name="minTotal"
              type="number"
              min="0"
              step="0.01"
              value={String(local.minTotal ?? "")}
              onChange={handleChange}
              className="h-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          <div>
            <label htmlFor="maxTotal" className="block text-xs font-semibold text-[#111827] mb-2">
              Total máximo
            </label>
            <Input
              id="maxTotal"
              name="maxTotal"
              type="number"
              min="0"
              step="0.01"
              value={String(local.maxTotal ?? "")}
              onChange={handleChange}
              className="h-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent"
              placeholder="0.00"
            />
          </div>

          {!providerEnabled && (
            <p className="mb-4 text-xs text-[#64748B]">
              El filtro por proveedor solo aplica en el modo Todos y se limpia automáticamente al cambiar a Operativos o Fijos.
            </p>
          )}

          <div>
            <label htmlFor="sortBy" className="block text-xs font-semibold text-[#111827] mb-2">
              Ordenar por
            </label>
            <Select
              id="sortBy"
              value={String(local.sortBy || "fecha")}
              onValueChange={(value: string) => setLocal({ ...local, sortBy: value as GastosListadoFilters["sortBy"] })}
              name="sortBy"
            >
              <SelectTrigger className="h-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent">
                <SelectValue placeholder="Fecha" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fecha">Fecha</SelectItem>
                <SelectItem value="folio">Folio</SelectItem>
                <SelectItem value="total">Total</SelectItem>
                <SelectItem value="metodoPago">Método de pago</SelectItem>
                <SelectItem value="tipoRegistro">Tipo de registro</SelectItem>
                <SelectItem value="estadoPago">Estado de pago</SelectItem>
                <SelectItem value="proveedorNombre">Proveedor</SelectItem>
                <SelectItem value="createdAt">Fecha de creación</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label htmlFor="sortOrder" className="block text-xs font-semibold text-[#111827] mb-2">
              Dirección
            </label>
            <Select
              id="sortOrder"
              value={String(local.sortOrder || "desc")}
              onValueChange={(value: "asc" | "desc") => setLocal({ ...local, sortOrder: value })}
              name="sortOrder"
            >
              <SelectTrigger className="h-11 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#2563EB] focus:border-transparent">
                <SelectValue placeholder="Descendente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">Descendente</SelectItem>
                <SelectItem value="asc">Ascendente</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mb-4 border-b border-slate-200 pb-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748B]">Presets rápidos</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("hoy")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#64748B] transition hover:bg-slate-100"
            >
              Hoy
            </button>
            <button
              type="button"
              onClick={() => applyPreset("7dias")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#64748B] transition hover:bg-slate-100"
            >
              Últimos 7 días
            </button>
            <button
              type="button"
              onClick={() => applyPreset("mes-actual")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#64748B] transition hover:bg-slate-100"
            >
              Este mes
            </button>
            <button
              type="button"
              onClick={() => applyPreset("mes-pasado")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-[#64748B] transition hover:bg-slate-100"
            >
              Mes pasado
            </button>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="submit"
            className="w-full rounded-xl bg-[#2563EB] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-[#111827] transition hover:bg-slate-50 sm:w-auto"
          >
            Limpiar
          </button>
        </div>
      </form>
    </div>
  );
}
