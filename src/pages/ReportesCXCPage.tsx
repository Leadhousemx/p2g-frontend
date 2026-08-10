import { useEffect, useState } from "react";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import MobileEntityCard from "../components/common/MobileEntityCard";
import ReportFiltersBar from "../components/reportes/ReportFiltersBar";
import ReportKpiCard from "../components/reportes/ReportKpiCard";
import ReportState from "../components/reportes/ReportState";
import { CXCResponse, getCXC, ReportQueryParams } from "../services/reportsService";
import { logger } from "../lib/logger";
import { useNegocios } from "../hooks/useNegocios";
import { exportReportToExcel } from "../utils/exportReportToExcel";

const defaultFilters: ReportQueryParams = {
  periodType: "monthly",
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
};

const CXC_TABLE_COLUMNS = [
  { key: "eventoFolio", label: "Evento/Folio", align: "left" },
  { key: "cliente", label: "Cliente", align: "left" },
  { key: "total", label: "Total", align: "right" },
  { key: "pagado", label: "Pagado", align: "right" },
  { key: "pendiente", label: "Pendiente", align: "right" },
  { key: "fechaEvento", label: "Fecha evento", align: "left" },
  { key: "fechaLimite", label: "Fecha límite", align: "left" },
  { key: "diasRestantes", label: "Días restantes", align: "center" },
  { key: "status", label: "Estatus", align: "center" },
] as const;

function getAlignedCellClass(align: "left" | "right" | "center") {
  if (align === "right") return "text-right";
  if (align === "center") return "text-center";
  return "text-left";
}

function formatCurrencyValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number"
    ? value
    : typeof value === "string"
      ? Number(value.replace(/[$,\s]/g, ""))
      : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return typeof value === "string" ? value : null;
  }

  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed);
}

function normalizeCxcRow(row: any, index: number) {
  const status = String(row?.status || row?.estatus || "Pendiente");

  return {
    rowIndex: index,
    key: String(row?._id ?? row?.id ?? row?.eventoId ?? row?.folio ?? row?.referencia ?? `${row?.cliente ?? "cxc"}-${row?.fechaEvento ?? "sin-fecha"}`),
    eventoFolio: String(row?.eventoFolio ?? row?.referencia ?? row?.folio ?? "-"),
    cliente: String(row?.cliente ?? row?.clienteNombre ?? "-"),
    total: formatCurrencyValue(row?.totalEvento ?? row?.total) ?? "-",
    pagado: formatCurrencyValue(row?.pagado) ?? "-",
    pendiente: formatCurrencyValue(row?.pendiente ?? row?.montoCxc) ?? "-",
    fechaEvento: String(row?.fechaEvento ?? "-"),
    fechaLimite: String(row?.fechaVencimiento ?? row?.fechaLimitePago ?? "-"),
    diasRestantes: String(row?.diasRestantes ?? "-"),
    status,
  };
}

function renderStatusBadge(status: string) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusClass(status)}`}>
      {status}
    </span>
  );
}

function renderDesktopTable(rows: any[]) {
  return (
    <div className="overflow-auto">
      <table className="w-full bg-white text-sm">
        <thead className="sticky top-0 border-b border-slate-200 bg-[#F9FAFB]">
          <tr>
            {CXC_TABLE_COLUMNS.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wide text-[#64748B] ${getAlignedCellClass(column.align)}`}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((normalizedRow: any, idx: number) => {
            return (
              <tr key={`${normalizedRow.key}-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                {CXC_TABLE_COLUMNS.map((column) => (
                  <td key={column.key} className={`px-4 py-3 text-[#111827] ${getAlignedCellClass(column.align)}`}>
                    {column.key === "status" ? renderStatusBadge(normalizedRow.status) : normalizedRow[column.key]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function renderMobileCxcCard(row: any, idx: number) {
  return (
    <MobileEntityCard
      title={row.eventoFolio}
      subtitle={row.cliente}
      meta={renderStatusBadge(row.status)}
      className="border-slate-200 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Pendiente</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{row.pendiente}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Pagado</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{row.pagado}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Total</dt>
          <dd className="mt-1 text-sm text-[#111827]">{row.total}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Días restantes</dt>
          <dd className="mt-1 text-sm text-[#111827]">{row.diasRestantes}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Fecha evento</dt>
          <dd className="mt-1 text-sm text-[#111827]">{row.fechaEvento}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Fecha límite</dt>
          <dd className="mt-1 text-sm text-[#111827]">{row.fechaLimite}</dd>
        </div>
      </dl>
    </MobileEntityCard>
  );
}

function getStatusClass(status: string) {
  const normalized = String(status || "").toLowerCase();
  if (normalized.includes("venc")) return "bg-red-50 text-red-700 border-red-200";
  if (normalized.includes("corriente")) return "bg-emerald-50 text-emerald-700 border-emerald-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function ReportesCXCPage() {
  const { negocios } = useNegocios();
  const [filters, setFilters] = useState<ReportQueryParams>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<CXCResponse | null>(null);

  const loadReport = async (targetFilters: ReportQueryParams) => {
    try {
      setLoading(true);
      setError("");
      const data = await getCXC(targetFilters);
      setReport(data);
    } catch (err: any) {
      logger.error("Error cargando reporte CXC:", err);
      setError(err?.response?.data?.message || "No se pudo cargar el reporte CXC.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport(defaultFilters);
  }, []);

  const handleFiltersChange = (nextFilters: ReportQueryParams) => {
    const currentNegocioId = String(filters.negocioId ?? "").trim();
    const nextNegocioId = String(nextFilters.negocioId ?? "").trim();
    const negocioChanged = currentNegocioId !== nextNegocioId;

    setFilters(nextFilters);

    if (negocioChanged) {
      loadReport(nextFilters);
    }
  };

  const rows = Array.isArray(report?.detalles)
    ? report.detalles
    : Array.isArray(report?.cuentas)
      ? report.cuentas
      : Array.isArray((report as any)?.cxc)
        ? (report as any).cxc
        : [];
  const normalizedRows = rows.map((row, index) => normalizeCxcRow(row, index));
  const negocioOptions = negocios.map((negocio) => ({ id: negocio._id, nombre: negocio.nombre }));

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      exportReportToExcel({
        fileName: `cuentas-por-cobrar-${today}.xlsx`,
        reportTitle: 'Cuentas por Cobrar',
        sheets: [
          {
            name: 'CXC',
            title: 'Cuentas por Cobrar',
            columns: [
              { header: 'Evento/Folio', key: 'eventoFolio', width: 22 },
              { header: 'Cliente', key: 'cliente', width: 28 },
              { header: 'Total', key: 'total', width: 16, type: 'currency' },
              { header: 'Pagado', key: 'pagado', width: 16, type: 'currency' },
              { header: 'Pendiente', key: 'pendiente', width: 16, type: 'currency' },
              { header: 'Fecha Evento', key: 'fechaEvento', width: 16 },
              { header: 'Fecha Límite', key: 'fechaLimite', width: 16 },
              { header: 'Días Restantes', key: 'diasRestantes', width: 14 },
              { header: 'Estatus', key: 'status', width: 16 },
            ],
            rows: rows.map((row: any) => ({
              eventoFolio: String(row?.eventoFolio ?? row?.referencia ?? row?.folio ?? '-'),
              cliente: String(row?.cliente ?? row?.clienteNombre ?? '-'),
              total: row?.totalEvento ?? row?.total ?? 0,
              pagado: row?.pagado ?? 0,
              pendiente: row?.pendiente ?? row?.montoCxc ?? 0,
              fechaEvento: String(row?.fechaEvento ?? '-'),
              fechaLimite: String(row?.fechaVencimiento ?? row?.fechaLimitePago ?? '-'),
              diasRestantes: String(row?.diasRestantes ?? '-'),
              status: String(row?.status ?? row?.estatus ?? 'Pendiente'),
            })),
          },
        ],
      });
    } catch (err) {
      logger.error('Error exportando Excel:', err);
      alert('No se pudo generar el Excel. Intenta nuevamente.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-full bg-[#F4F6F9] px-4 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 lg:gap-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Cuentas por cobrar</h1>
            <p className="text-sm text-[#64748B]">Consulta saldos pendientes, próximos vencimientos y estado de cobranza por periodo.</p>
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading || rows.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {exporting ? 'Generando Excel...' : 'Exportar Excel'}
          </button>
        </div>

        <ReportFiltersBar filters={filters} loading={loading} negocios={negocioOptions} onChange={handleFiltersChange} onApply={() => loadReport(filters)} />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ReportKpiCard title="Total CXC" value={formatCurrencyValue(report?.kpis?.totalCXC ?? (report as any)?.totalCxc)} />
          <ReportKpiCard title="# CXC abiertas" value={report?.kpis?.countAbiertas ?? (report as any)?.abiertas} />
          <ReportKpiCard title="Vencen en 7 días" value={report?.kpis?.countPorVencer7Dias ?? (report as any)?.vencen7dias} />
        </div>

        <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <ReportState loading={loading} error={error} empty={!loading && !error && rows.length === 0} emptyMessage="Sin cuentas por cobrar para el periodo." />

          {!loading && !error && rows.length > 0 && (
            <div className="p-3 sm:p-4">
              <ResponsiveDataList
                items={normalizedRows}
                loading={false}
                getItemKey={(item) => item.key}
                renderDesktop={() => renderDesktopTable(normalizedRows)}
                renderMobileItem={(item) => renderMobileCxcCard(item, item.rowIndex)}
                mobileBreakpoint="lg"
                emptyMessage="Sin cuentas por cobrar para el periodo."
                mobileListClassName="space-y-3"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
