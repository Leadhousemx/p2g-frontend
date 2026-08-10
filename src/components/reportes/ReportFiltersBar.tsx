import { ReportPeriodType, ReportQueryParams } from "../../services/reportsService";

interface Props {
  filters: ReportQueryParams;
  loading?: boolean;
  negocios?: Array<{ id: string; nombre: string }>;
  title?: string;
  description?: string;
  onChange: (filters: ReportQueryParams) => void;
  onApply: () => void;
}

const years = Array.from({ length: 11 }, (_, idx) => new Date().getFullYear() - 5 + idx);

const controlClassName = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-[#111827]";
const periodFieldClassName = "lg:col-span-2 xl:col-span-2";
const secondaryFieldClassName = "lg:col-span-1 xl:col-span-2";
const negocioFieldClassName = "md:col-span-2 lg:col-span-2 xl:col-span-4";
const actionFieldClassName = "md:col-span-2 lg:col-span-2 xl:col-span-2";

export default function ReportFiltersBar({
  filters,
  loading = false,
  negocios = [],
  title = "Filtros del reporte",
  description = "Ajusta el periodo y el negocio antes de recargar las cuentas por cobrar.",
  onChange,
  onApply,
}: Props) {
  const setPeriodType = (periodType: ReportPeriodType) => {
    if (periodType === "monthly") {
      onChange({ periodType, year: filters.year, month: filters.month || new Date().getMonth() + 1, ...(filters.negocioId ? { negocioId: filters.negocioId } : {}) });
      return;
    }

    if (periodType === "semiannual") {
      onChange({ periodType, year: filters.year, semester: filters.semester || 1, ...(filters.negocioId ? { negocioId: filters.negocioId } : {}) });
      return;
    }

    onChange({ periodType, year: filters.year, ...(filters.negocioId ? { negocioId: filters.negocioId } : {}) });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-1 sm:mb-5">
        <h2 className="text-base font-semibold text-[#111827]">{title}</h2>
        <p className="text-sm text-[#64748B]">{description}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-12 xl:items-end">
        <div className={periodFieldClassName}>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-1.5">Periodo</label>
          <select
            className={controlClassName}
            value={filters.periodType}
            onChange={(e) => setPeriodType(e.target.value as ReportPeriodType)}
          >
            <option value="monthly">Mensual</option>
            <option value="semiannual">Semestral</option>
            <option value="annual">Anual</option>
          </select>
        </div>

        {filters.periodType === "monthly" && (
          <>
            <div className={secondaryFieldClassName}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-1.5">Mes</label>
              <select
                className={controlClassName}
                value={filters.month || ""}
                onChange={(e) => onChange({ ...filters, month: Number(e.target.value) })}
              >
                <option value={1}>Enero</option>
                <option value={2}>Febrero</option>
                <option value={3}>Marzo</option>
                <option value={4}>Abril</option>
                <option value={5}>Mayo</option>
                <option value={6}>Junio</option>
                <option value={7}>Julio</option>
                <option value={8}>Agosto</option>
                <option value={9}>Septiembre</option>
                <option value={10}>Octubre</option>
                <option value={11}>Noviembre</option>
                <option value={12}>Diciembre</option>
              </select>
            </div>

            <div className={secondaryFieldClassName}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-1.5">Año</label>
              <select
                className={controlClassName}
                value={filters.year}
                onChange={(e) => onChange({ ...filters, year: Number(e.target.value) })}
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {filters.periodType === "semiannual" && (
          <>
            <div className={secondaryFieldClassName}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-1.5">Semestre</label>
              <select
                className={controlClassName}
                value={filters.semester || 1}
                onChange={(e) => onChange({ ...filters, semester: Number(e.target.value) as 1 | 2 })}
              >
                <option value={1}>H1 (Ene - Jun)</option>
                <option value={2}>H2 (Jul - Dic)</option>
              </select>
            </div>

            <div className={secondaryFieldClassName}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-1.5">Año</label>
              <select
                className={controlClassName}
                value={filters.year}
                onChange={(e) => onChange({ ...filters, year: Number(e.target.value) })}
              >
                {years.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {filters.periodType === "annual" && (
          <div className={secondaryFieldClassName}>
            <label className="block text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-1.5">Año</label>
            <select
              className={controlClassName}
              value={filters.year}
              onChange={(e) => onChange({ ...filters, year: Number(e.target.value) })}
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        )}

        <div className={negocioFieldClassName}>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[#64748B] mb-1.5">Negocio</label>
          <select
            className={controlClassName}
            value={filters.negocioId || ""}
            onChange={(e) => onChange({ ...filters, negocioId: e.target.value || undefined })}
          >
            <option value="">Todos los negocios</option>
            {negocios.map((negocio) => (
              <option key={negocio.id} value={negocio.id}>{negocio.nombre}</option>
            ))}
          </select>
        </div>

        <div className={`flex items-end ${actionFieldClassName}`}>
          <button
            type="button"
            className="h-10 w-full rounded-lg bg-[#2563EB] px-4 py-2 text-sm text-white shadow-sm transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onApply}
            disabled={loading}
          >
            {loading ? "Cargando..." : "Aplicar"}
          </button>
        </div>
      </div>
    </div>
  );
}
