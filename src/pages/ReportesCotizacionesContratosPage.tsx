import { useEffect, useState } from "react";
import MobileEntityCard from "../components/common/MobileEntityCard";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import ReportFiltersBar from "../components/reportes/ReportFiltersBar";
import ReportKpiCard from "../components/reportes/ReportKpiCard";
import ReportState from "../components/reportes/ReportState";
import {
  CotizacionesContratosResponse,
  CotizacionesEstadisticasResponse,
  getCotizacionesContratos,
  getCotizacionesEstadisticas,
  ReportQueryParams,
} from "../services/reportsService";
import { logger } from "../lib/logger";
import { useNegocios } from "../hooks/useNegocios";
import { ESTADOS_DROPDOWN, getQuotationStatusConfig, normalizeQuotationStatus } from "../constants/quotationStatus";
import { exportReportToExcel } from "../utils/exportReportToExcel";

const defaultFilters: ReportQueryParams = {
  periodType: "monthly",
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
};

const ESTADISTICAS_TABLE_COLUMNS = [
  { key: "estado", label: "Estado", align: "left" },
  { key: "cantidad", label: "Cantidad", align: "right" },
  { key: "monto", label: "Monto", align: "right" },
  { key: "porcentaje", label: "Porcentaje", align: "right" },
] as const;

const COTIZACIONES_TABLE_COLUMNS = [
  { key: "folio", label: "Folio", align: "left" },
  { key: "cliente", label: "Cliente", align: "left" },
  { key: "fecha", label: "Fecha", align: "left" },
  { key: "montoCotizado", label: "Monto cotizado", align: "right" },
  { key: "status", label: "Estatus", align: "center" },
  { key: "montoContratado", label: "Monto contratado", align: "right" },
] as const;

function getStatusClass(status: string) {
  return getQuotationStatusConfig(status).badgeClass;
}

function getAlignedCellClass(align: "left" | "right" | "center") {
  if (align === "center") return "text-center";
  return align === "right" ? "text-right" : "text-left";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCurrency(value: unknown): string {
  return `$${toNumber(value).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function normalizeEstadoDistribucionRow(row: any, index: number) {
  const statusConfig = getQuotationStatusConfig(row?.estado);

  return {
    rowIndex: index,
    key: String(row?.estado ?? `estado-${index}`),
    estado: String(row?.estado ?? "-"),
    cantidad: toNumber(row?.cantidad),
    montoTotal: toNumber(row?.montoTotal),
    porcentaje: String(row?.porcentaje ?? "0"),
    badgeClass: statusConfig.badgeClass,
    icon: statusConfig.icon,
  };
}

function renderDistribucionEstados(rows: Array<ReturnType<typeof normalizeEstadoDistribucionRow>>) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-[#111827]">Distribución por estado</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {rows.map((row) => (
          <div key={row.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${row.badgeClass}`}>
                {row.icon} {row.estado}
              </span>
              <span className="text-xs text-[#64748B]">{row.porcentaje}%</span>
            </div>
            <p className="mt-2 text-lg font-semibold text-[#111827]">{row.cantidad}</p>
            <p className="text-xs text-[#64748B]">{formatCurrency(row.montoTotal)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function normalizeEstadoEstadisticaRow(row: any, index: number) {
  const statusConfig = getQuotationStatusConfig(row?.estado);

  return {
    rowIndex: index,
    key: String(row?.estado ?? `estadistica-${index}`),
    estado: String(row?.estado ?? "-"),
    cantidad: toNumber(row?.cantidad),
    monto: formatCurrency(row?.montoTotal),
    porcentaje: `${String(row?.porcentaje ?? "0")}%`,
    icon: statusConfig.icon,
  };
}

function renderLegacyEstadisticasFooter(legacyCanceladas: any, legacyMapeadas: any) {
  if (!(toNumber(legacyCanceladas?.cantidad) > 0 || toNumber(legacyMapeadas?.cantidad) > 0)) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-3 text-xs text-[#64748B]">
      <span>Legacy canceladas: <strong>{toNumber(legacyCanceladas?.cantidad)}</strong> ({formatCurrency(legacyCanceladas?.montoTotal)})</span>
      <span>Mapeadas desde cancelado: <strong>{toNumber(legacyMapeadas?.cantidad)}</strong> ({formatCurrency(legacyMapeadas?.montoTotal)})</span>
    </div>
  );
}

function renderEstadisticaMobileMeta(row: ReturnType<typeof normalizeEstadoEstadisticaRow>) {
  return (
    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-[#334155]">
      {row.porcentaje}
    </span>
  );
}

function renderEstadisticaMobileCard(row: ReturnType<typeof normalizeEstadoEstadisticaRow>) {
  return (
    <MobileEntityCard
      title={`${row.icon} ${row.estado}`}
      meta={renderEstadisticaMobileMeta(row)}
      className="border-slate-200 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Cantidad</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{row.cantidad}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Monto</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{row.monto}</p>
        </div>
      </div>
    </MobileEntityCard>
  );
}

function renderEstadisticasTable(rows: Array<ReturnType<typeof normalizeEstadoEstadisticaRow>>, legacyCanceladas: any, legacyMapeadas: any) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#111827]">Detalle estadístico por estado</h3>
      </div>
      <div className="p-4">
        <ResponsiveDataList
          items={rows}
          loading={false}
          getItemKey={(item) => item.key}
          renderDesktop={() => (
            <div className="overflow-auto">
              <table className="w-full bg-white text-sm">
                <thead className="border-b border-slate-200 bg-[#F9FAFB]">
                  <tr>
                    {ESTADISTICAS_TABLE_COLUMNS.map((column) => (
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
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100 last:border-0">
                      {ESTADISTICAS_TABLE_COLUMNS.map((column) => (
                        <td key={column.key} className={`px-4 py-3 text-[#111827] ${getAlignedCellClass(column.align)} ${column.key === "estado" ? "font-medium" : ""}`}>
                          {column.key === "estado" ? `${row.icon} ${row.estado}` : row[column.key]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          renderMobileItem={(item) => renderEstadisticaMobileCard(item)}
          mobileBreakpoint="lg"
          emptyMessage="Sin detalle estadístico para mostrar."
        />
      </div>
      {renderLegacyEstadisticasFooter(legacyCanceladas, legacyMapeadas)}
    </div>
  );
}

function normalizeCotizacionRow(row: any, index: number) {
  const status = normalizeQuotationStatus(String(row?.estado || row?.estatus || "Cotizado"));
  const statusConfig = getQuotationStatusConfig(status);

  return {
    rowIndex: index,
    key: String(row?._id ?? row?.id ?? row?.folio ?? `cotizacion-${index}`),
    folio: String(row?.folio ?? "-"),
    cliente: String(row?.cliente ?? row?.clienteNombre ?? "-"),
    fecha: String(row?.fechaEvento ?? row?.fecha ?? "-"),
    montoCotizado: formatCurrency(row?.monto ?? row?.montoCotizado ?? row?.totalCotizado),
    status,
    statusIcon: statusConfig.icon,
    statusClass: getStatusClass(status),
    montoContratado: formatCurrency(status === "Contratado" ? (row?.monto ?? row?.montoContratado) : row?.montoContratado),
  };
}

function renderCotizacionMobileMeta(row: ReturnType<typeof normalizeCotizacionRow>) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${row.statusClass}`}>
      {row.statusIcon} {row.status}
    </span>
  );
}

function renderCotizacionMobileCard(row: ReturnType<typeof normalizeCotizacionRow>) {
  return (
    <MobileEntityCard
      title={row.folio}
      subtitle={row.cliente}
      meta={renderCotizacionMobileMeta(row)}
      className="border-slate-200 shadow-sm"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Monto cotizado</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{row.montoCotizado}</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Monto contratado</p>
          <p className="mt-1 text-sm font-semibold text-[#111827]">{row.montoContratado}</p>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
        <div>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">Fecha</dt>
          <dd className="mt-1 text-sm text-[#111827]">{row.fecha}</dd>
        </div>
      </dl>
    </MobileEntityCard>
  );
}

function renderCotizacionesTable(rows: Array<ReturnType<typeof normalizeCotizacionRow>>) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-4">
        <ResponsiveDataList
          items={rows}
          loading={false}
          getItemKey={(item) => item.key}
          renderDesktop={() => (
            <div className="overflow-auto">
              <table className="w-full bg-white text-sm">
                <thead className="sticky top-0 border-b border-slate-200 bg-[#F9FAFB]">
                  <tr>
                    {COTIZACIONES_TABLE_COLUMNS.map((column) => (
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
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50">
                      {COTIZACIONES_TABLE_COLUMNS.map((column) => (
                        <td key={column.key} className={`px-4 py-3 text-[#111827] ${getAlignedCellClass(column.align)}`}>
                          {column.key === "status" ? (
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${row.statusClass}`}>
                              {row.statusIcon} {row.status}
                            </span>
                          ) : (
                            row[column.key]
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          renderMobileItem={(item) => renderCotizacionMobileCard(item)}
          mobileBreakpoint="lg"
          emptyMessage="Sin cotizaciones para el periodo seleccionado."
        />
      </div>
    </div>
  );
}

export default function ReportesCotizacionesContratosPage() {
  const { negocios } = useNegocios();
  const [filters, setFilters] = useState<ReportQueryParams>(defaultFilters);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<CotizacionesContratosResponse | null>(null);
  const [estadisticas, setEstadisticas] = useState<CotizacionesEstadisticasResponse | null>(null);

  const loadReport = async (targetFilters: ReportQueryParams) => {
    try {
      setLoading(true);
      setError("");
      const [data, stats] = await Promise.all([
        getCotizacionesContratos(targetFilters),
        getCotizacionesEstadisticas(targetFilters),
      ]);
      setReport(data);
      setEstadisticas(stats);
    } catch (err: any) {
      logger.error("Error cargando reporte cotizaciones-contratos:", err);
      setError(err?.response?.data?.message || "No se pudo cargar el reporte.");
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

  const rows = Array.isArray(report?.tabla)
    ? report.tabla
    : Array.isArray(report?.cotizaciones)
      ? report.cotizaciones
      : Array.isArray((report as any)?.items)
        ? (report as any).items
        : [];

  const estadisticasRows = ESTADOS_DROPDOWN.map((estado) => {
    const data = estadisticas?.estadisticas?.[estado] || {};
    return {
      estado,
      cantidad: toNumber((data as any)?.cantidad),
      montoTotal: toNumber((data as any)?.montoTotal),
      porcentaje: String((data as any)?.porcentaje ?? "0"),
    };
  });

  const totalCotizacionesStats = estadisticas?.resumen?.totalCotizaciones ?? report?.kpis?.numCotizaciones ?? (report as any)?.cotizacionesPeriodo ?? 0;
  const montoTotalCotizadoStats = estadisticas?.resumen?.montoTotalCotizado ?? report?.kpis?.totalMontosCotizados ?? (report as any)?.totalMontosCotizados ?? 0;

  const legacyCanceladas = estadisticas?.legacy?.canceladas;
  const legacyMapeadas = estadisticas?.legacy?.mapeadasDesdeCancelado;
  const normalizedDistribucionRows = estadisticasRows.map((row, index) => normalizeEstadoDistribucionRow(row, index));
  const normalizedEstadisticasRows = estadisticasRows.map((row, index) => normalizeEstadoEstadisticaRow(row, index));
  const normalizedCotizacionesRows = rows.map((row, index) => normalizeCotizacionRow(row, index));
  const negocioOptions = negocios.map((negocio) => ({ id: negocio._id, nombre: negocio.nombre }));

  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      exportReportToExcel({
        fileName: `cotizaciones-contratos-${today}.xlsx`,
        reportTitle: 'Cotizaciones y Contratos',
        sheets: [
          {
            name: 'Estadísticas',
            title: 'Distribución por Estado',
            columns: [
              { header: 'Estado', key: 'estado', width: 20 },
              { header: 'Cantidad', key: 'cantidad', width: 12, type: 'number' },
              { header: 'Monto Total', key: 'montoTotal', width: 18, type: 'currency' },
              { header: 'Porcentaje', key: 'porcentaje', width: 12 },
            ],
            rows: estadisticasRows.map((row) => ({
              estado: row.estado,
              cantidad: row.cantidad,
              montoTotal: row.montoTotal,
              porcentaje: `${row.porcentaje}%`,
            })),
          },
          {
            name: 'Cotizaciones',
            title: 'Listado de Cotizaciones',
            columns: [
              { header: 'Folio', key: 'folio', width: 18 },
              { header: 'Cliente', key: 'cliente', width: 28 },
              { header: 'Fecha Evento', key: 'fechaEvento', width: 16 },
              { header: 'Monto Cotizado', key: 'montoCotizado', width: 18, type: 'currency' },
              { header: 'Monto Contratado', key: 'montoContratado', width: 18, type: 'currency' },
              { header: 'Estado', key: 'estado', width: 16 },
            ],
            rows: rows.map((row: any) => ({
              folio: String(row?.folio ?? '-'),
              cliente: String(row?.cliente ?? row?.clienteNombre ?? '-'),
              fechaEvento: String(row?.fechaEvento ?? row?.fecha ?? '-'),
              montoCotizado: row?.monto ?? row?.montoCotizado ?? row?.totalCotizado ?? 0,
              montoContratado: row?.montoContratado ?? 0,
              estado: normalizeQuotationStatus(String(row?.estado || row?.estatus || 'Cotizado')),
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
            <h1 className="text-2xl font-semibold tracking-tight text-[#111827]">Cotizaciones y contratos</h1>
            <p className="text-sm text-[#64748B]">Consulta el comportamiento comercial del periodo, revisa la distribución por estatus y analiza el detalle de cotizaciones con su conversión a contratos.</p>
          </div>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting || loading || (rows.length === 0 && estadisticasRows.length === 0)}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {exporting ? 'Generando Excel...' : 'Exportar Excel'}
          </button>
        </div>

        <ReportFiltersBar
          filters={filters}
          loading={loading}
          negocios={negocioOptions}
          title="Filtros del reporte"
          description="Ajusta el periodo y el negocio antes de recargar el reporte de cotizaciones y contratos."
          onChange={handleFiltersChange}
          onApply={() => loadReport(filters)}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <ReportKpiCard title="# Cotizaciones del periodo" value={totalCotizacionesStats} />
          <ReportKpiCard title="# Contratadas del periodo" value={report?.kpis?.numContratadas ?? (report as any)?.contratadasPeriodo} />
          <ReportKpiCard title="Tasa de conversión" value={report?.kpis?.conversionRate ?? (report as any)?.tasaConversion} />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ReportKpiCard title="Total montos cotizados" value={formatCurrency(montoTotalCotizadoStats)} />
          <ReportKpiCard title="Total montos contratados" value={formatCurrency(report?.kpis?.totalMontosContratados ?? (report as any)?.totalMontosContratados)} />
        </div>

        <ReportState loading={loading} error={error} empty={!loading && !error && rows.length === 0} emptyMessage="Sin cotizaciones para el periodo seleccionado." />

        {!loading && !error && (
          <div className="space-y-4 pb-1">
            {renderDistribucionEstados(normalizedDistribucionRows)}

            {renderEstadisticasTable(normalizedEstadisticasRows, legacyCanceladas, legacyMapeadas)}

            {rows.length > 0 && (
              renderCotizacionesTable(normalizedCotizacionesRows)
            )}
          </div>
        )}
      </div>
    </div>
  );
}
